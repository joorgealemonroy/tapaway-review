import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hardcoded fallback - NEVER use supabaseUrl for portal return
const DEFAULT_PORTAL_RETURN_URL = 'https://tapaway.co/dashboard';

/**
 * Fallback endpoint to verify and process a Stripe checkout session.
 * Called when a user lands on /onboarding with a session_id but has no restaurant record.
 * This handles the case where the webhook failed to process the checkout.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!checkRateLimit(getRateLimitKey(req, "verify-checkout"), 30, 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      console.error('[verify-checkout] No session ID provided');
      return new Response(JSON.stringify({ error: 'Session ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Require an authenticated caller — the resolved userId comes from the JWT / Stripe session, never the client body.
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.7');
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerUserId = authData.user.id;

    console.log('[verify-checkout] Verifying checkout session:', sessionId, 'for caller:', callerUserId);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (!session) {
      console.error('[verify-checkout] Session not found in Stripe');
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify payment was successful (trials with $0 due return 'no_payment_required')
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      console.error('[verify-checkout] Payment not completed:', session.payment_status);
      return new Response(JSON.stringify({ error: 'Payment not completed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[verify-checkout] Session verified:', {
      id: session.id,
      customer: session.customer,
      subscription: session.subscription,
      payment_status: session.payment_status,
    });

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    // Derive user id from the Stripe session's metadata (bound at session creation time), not the client body.
    const metadataUserId = (session.metadata?.user_id || session.metadata?.userId || session.client_reference_id) as string | undefined;
    const userId = metadataUserId || callerUserId;
    if (metadataUserId && metadataUserId !== callerUserId) {
      console.warn('[verify-checkout] Session metadata user does not match caller — refusing');
      return new Response(JSON.stringify({ error: 'Session does not belong to caller' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const customerEmail = session.customer_email;

    // Determine plan type
    let planType = session.metadata?.plan_type || 'monthly';

    // Persist the REAL Stripe subscription status ('trialing' during the free
    // trial, 'active' once paid) so the trial funnel is visible in the DB.
    // $0 trial checkouts used to be hard-coded to 'active' below.
    let subscriptionStatus = 'active';
    let trialEndsAt: string | null = null;
    if (subscriptionId) {
      const subscription =
        typeof session.subscription === 'object' && session.subscription
          ? session.subscription
          : await stripe.subscriptions.retrieve(subscriptionId);
      if (subscription.status === 'trialing') {
        subscriptionStatus = 'trialing';
        if (subscription.trial_end) {
          trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
        }
      }
      if (!session.metadata?.plan_type) {
        const priceId = subscription.items.data[0]?.price.id;
        if (priceId?.includes('year')) {
          planType = 'yearly';
        }
      }
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ── $1 trial card verification (CARD-CHECK), shared by both branches ──
    // Server-to-server call to verify-trial-card (service-role bearer; never
    // exposed to the client). Fail-closed: any failure blocks the trial.
    const runTrialCardCheck = async (): Promise<{ ok: boolean; message: string }> => {
      const fallbackMessage = "Your card couldn't be verified. Please try a different card or contact your bank.";
      const checkClientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || undefined;
      try {
        const checkRes = await fetch(`${supabaseUrl}/functions/v1/verify-trial-card`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            customerId,
            ...(checkClientIp ? { clientIp: checkClientIp } : {}),
            // Stable idempotency key: retries never stack extra $1 auths.
            ...(subscriptionId ? { idempotencyKey: subscriptionId } : {}),
          }),
        });
        const result = await checkRes.json();
        if (result?.ok) return { ok: true, message: '' };
        return { ok: false, message: result?.message || fallbackMessage };
      } catch (checkErr) {
        console.error('[verify-checkout] card check call failed (fail-closed):', checkErr);
        return { ok: false, message: fallbackMessage };
      }
    };
    const isVanSession = session.metadata?.van_sale === 'true';
    const needsCardCheck = (row: { card_check_status?: string | null; stripe_subscription_id?: string | null } | null) =>
      subscriptionStatus === 'trialing' &&
      !isVanSession &&
      !!subscriptionId &&
      !(row?.card_check_status === 'passed' && row?.stripe_subscription_id === subscriptionId);
    
    const supabaseAdmin = await import('https://esm.sh/@supabase/supabase-js@2.39.7').then(
      mod => mod.createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    );

    // Check if restaurant already exists for this user
    const { data: existingRestaurant } = await supabaseAdmin
      .from('restaurants')
      .select('id, subscription_status, card_check_status, card_check_message, stripe_subscription_id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (existingRestaurant) {
      console.log('[verify-checkout] Restaurant already exists:', existingRestaurant.id);

      // CARD-CHECK: surface a failed card verification instead of
      // overwriting it. The trial was canceled in Stripe; the customer must
      // retry with a working card.
      if (
        existingRestaurant.card_check_status === 'failed' &&
        existingRestaurant.stripe_subscription_id === subscriptionId
      ) {
        return new Response(JSON.stringify({
          success: false,
          cardCheckFailed: true,
          message: existingRestaurant.card_check_message
            || "We couldn't verify your card — double-check the details or try a different card.",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // CARD-CHECK: fail-closed for trials the webhook never verified
      // (e.g. webhook delivery failed). Skipped when already verified.
      let cardCheckFailedMessage: string | null = null;
      let cardCheckPassed = false;
      if (needsCardCheck(existingRestaurant)) {
        const check = await runTrialCardCheck();
        if (!check.ok) {
          cardCheckFailedMessage = check.message;
          try {
            await stripe.subscriptions.cancel(subscriptionId!);
            console.log('[verify-checkout] canceled dead-card trial subscription:', subscriptionId);
          } catch (cancelErr) {
            console.error('[verify-checkout] failed to cancel dead-card subscription (non-fatal):', cancelErr);
          }
          const { error: failUpdateErr } = await supabaseAdmin
            .from('restaurants')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: 'incomplete',
              trial_ends_at: null,
              card_check_status: 'failed',
              card_check_message: cardCheckFailedMessage,
            })
            .eq('id', existingRestaurant.id);
          if (failUpdateErr) console.error('[verify-checkout] failed to mark restaurant card-check-failed:', failUpdateErr);
        } else {
          cardCheckPassed = true;
          console.log('[verify-checkout] card check passed for subscription:', subscriptionId);
        }
      }
      if (cardCheckFailedMessage) {
        return new Response(JSON.stringify({
          success: false,
          cardCheckFailed: true,
          message: cardCheckFailedMessage,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Update existing restaurant with Stripe info if needed
      if (existingRestaurant.subscription_status !== 'active') {
        // Try to create portal (non-blocking)
        let portalUrl: string | null = null;
        try {
          const portalReturnUrl = Deno.env.get('STRIPE_PORTAL_RETURN_URL') || DEFAULT_PORTAL_RETURN_URL;
          const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId!,
            return_url: portalReturnUrl,
          });
          portalUrl = portalSession.url;
        } catch (portalError) {
          console.error('[verify-checkout] Failed to create billing portal (non-fatal):', portalError);
        }

        await supabaseAdmin
          .from('restaurants')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_portal_url: portalUrl,
            plan_type: planType,
            subscription_status: subscriptionStatus,
            trial_ends_at: trialEndsAt,
            ...(cardCheckPassed ? { card_check_status: 'passed', card_check_message: null } : {}),
          })
          .eq('id', existingRestaurant.id);
        
        console.log('[verify-checkout] Updated existing restaurant to', subscriptionStatus);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        restaurantId: existingRestaurant.id,
        message: 'Restaurant already exists' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user metadata for greeting name
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const greetingName = userData?.user?.user_metadata?.greeting_name || null;

    // CARD-CHECK: the webhook never provisioned this trial, so verify the
    // card here before creating the row (fail-closed). No prior row exists,
    // so there is nothing to skip on.
    let createCardCheckPassed = false;
    if (needsCardCheck(null)) {
      const check = await runTrialCardCheck();
      if (!check.ok) {
        try {
          await stripe.subscriptions.cancel(subscriptionId!);
          console.log('[verify-checkout] canceled dead-card trial subscription:', subscriptionId);
        } catch (cancelErr) {
          console.error('[verify-checkout] failed to cancel dead-card subscription (non-fatal):', cancelErr);
        }
        const { data: failedRow, error: failInsertError } = await supabaseAdmin
          .from('restaurants')
          .insert({
            owner_id: userId,
            restaurant_name: 'My Restaurant',
            greeting_name: greetingName,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan_type: planType,
            subscription_status: 'incomplete',
            trial_ends_at: null,
            card_check_status: 'failed',
            card_check_message: check.message,
            header_title: "How was your visit?",
            header_subtitle: "We'd love to hear about your experience!",
            menu_title: "Our Menu",
            onboarding_step: 1,
            onboarding_completed: false,
          })
          .select('id')
          .single();
        if (failInsertError) {
          console.error('[verify-checkout] Failed to insert card-check-failed restaurant:', failInsertError);
        }
        return new Response(JSON.stringify({
          success: false,
          cardCheckFailed: true,
          message: check.message,
          restaurantId: failedRow?.id || null,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      createCardCheckPassed = true;
      console.log('[verify-checkout] card check passed for subscription:', subscriptionId);
    }

    // Create new restaurant record FIRST (without portal URL)
    const { data: newRestaurant, error: insertError } = await supabaseAdmin
      .from('restaurants')
      .insert({
        owner_id: userId,
        restaurant_name: 'My Restaurant',
        greeting_name: greetingName,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan_type: planType,
        subscription_status: subscriptionStatus,
        trial_ends_at: trialEndsAt,
        ...(createCardCheckPassed ? { card_check_status: 'passed', card_check_message: null } : {}),
        header_title: "How was your visit?",
        header_subtitle: "We'd love to hear about your experience!",
        menu_title: "Our Menu",
        onboarding_step: 1,
        onboarding_completed: false,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[verify-checkout] Failed to create restaurant:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create restaurant' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[verify-checkout] Created restaurant:', newRestaurant.id);

    // NOW try to create billing portal session (non-blocking)
    try {
      const portalReturnUrl = Deno.env.get('STRIPE_PORTAL_RETURN_URL') || DEFAULT_PORTAL_RETURN_URL;
      console.log('[verify-checkout] Creating billing portal with return URL:', portalReturnUrl);
      
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId!,
        return_url: portalReturnUrl,
      });
      
      // Update restaurant with portal URL
      await supabaseAdmin
        .from('restaurants')
        .update({ stripe_portal_url: portalSession.url })
        .eq('id', newRestaurant.id);
      
      console.log('[verify-checkout] Updated restaurant with portal URL');
    } catch (portalError) {
      console.error('[verify-checkout] Failed to create billing portal (non-fatal):', portalError);
      // This is non-fatal - restaurant was already created
    }

    // Create fulfillment order
    const shippingDetails = (session as any).shipping_details || (session as any).shipping || null;
    const customerDetails = session.customer_details || null;
    
    const shippingName = shippingDetails?.name || customerDetails?.name || null;
    const shippingAddress = shippingDetails?.address || null;

    const { error: fulfillmentError } = await supabaseAdmin
      .from('fulfillment_orders')
      .insert({
        user_id: userId,
        restaurant_id: newRestaurant.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan: planType,
        quantity: 15,
        status: 'awaiting_onboarding',
        shipping_name: shippingName,
        shipping_address_line1: shippingAddress?.line1 || null,
        shipping_address_line2: shippingAddress?.line2 || null,
        shipping_city: shippingAddress?.city || null,
        shipping_state: shippingAddress?.state || null,
        shipping_postal_code: shippingAddress?.postal_code || null,
        shipping_country: shippingAddress?.country || null,
      });

    if (fulfillmentError) {
      console.error('[verify-checkout] Failed to create fulfillment order:', fulfillmentError);
      // Non-fatal - restaurant was created
    }

    return new Response(JSON.stringify({ 
      success: true, 
      restaurantId: newRestaurant.id,
      message: 'Restaurant created successfully' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[verify-checkout] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});