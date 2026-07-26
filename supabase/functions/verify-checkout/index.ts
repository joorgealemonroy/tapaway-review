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
    if (subscriptionId && !session.metadata?.plan_type) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price.id;
      if (priceId?.includes('year')) {
        planType = 'yearly';
      }
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
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
      .select('id, subscription_status')
      .eq('owner_id', userId)
      .maybeSingle();

    if (existingRestaurant) {
      console.log('[verify-checkout] Restaurant already exists:', existingRestaurant.id);
      
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
            subscription_status: 'active',
          })
          .eq('id', existingRestaurant.id);
        
        console.log('[verify-checkout] Updated existing restaurant to active');
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
        subscription_status: 'active',
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