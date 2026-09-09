import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!checkRateLimit(getRateLimitKey(req, "verify-personal-checkout"), 30, 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const { sessionId } = await req.json();
    // SECURITY: Ignore any client-supplied signupEmail. The target account is
    // always derived from the Stripe session's verified customer email below,
    // otherwise anyone with any paid session could re-link a victim's account.

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-personal-checkout] Verifying session:', sessionId);

    // Retrieve the session from Stripe with line_items for plan detection
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer', 'line_items'],
    });

    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      return new Response(
        JSON.stringify({ error: 'Payment not completed', status: session.payment_status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metadata = session.metadata || {};
    const customerEmail = session.customer_email || (session.customer as Stripe.Customer)?.email;

    // Van sale targeting (admin-created checkout sessions): when the session
    // carries a personal_profile_id, provision THAT profile directly instead
    // of the user_id lookup below. Metadata is set server-side by
    // create-checkout-session (admin-gated for van sales) and is verified
    // here from the Stripe session, so it cannot be forged by the caller.
    // This matters because a van demo row is owned by the admin's user_id,
    // which may already have its own profile row.
    const metadataProfileId =
      typeof metadata.personal_profile_id === 'string' && metadata.personal_profile_id.length > 0
        ? metadata.personal_profile_id
        : null;
    if (metadataProfileId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(metadataProfileId)) {
      throw new Error('Invalid personal_profile_id in session metadata');
    }
    
    if (!customerEmail) {
      throw new Error('No customer email found');
    }

    // For Payment Links, username comes from client_reference_id
    const usernameFromRef = session.client_reference_id;
    
    // Determine plan type from various sources
    let detectedPlanType = metadata.plan_type || null;
    
    // If not in metadata, try to detect from payment link or line items
    if (!detectedPlanType) {
      // Check payment link ID (if configured in Stripe)
      const paymentLinkId = session.payment_link;
      
      // Check if subscription exists (indicates recurring = monthly or yearly)
      if (session.subscription) {
        // Try to get interval from subscription
        const subscription = session.subscription as Stripe.Subscription;
        if (subscription.items?.data?.[0]?.price?.recurring?.interval === 'year') {
          detectedPlanType = 'yearly';
        } else if (subscription.items?.data?.[0]?.price?.recurring?.interval === 'month') {
          detectedPlanType = 'monthly';
        }
      }
      
      // Check amount to differentiate plans (yearly = $75, monthly = $10)
      if (!detectedPlanType && session.amount_total) {
        // Amount is in cents
        if (session.amount_total >= 7000) { // $70+ = yearly
          detectedPlanType = 'yearly';
        } else {
          detectedPlanType = 'monthly';
        }
      }
      
      // Default to yearly if still not detected
      if (!detectedPlanType) {
        detectedPlanType = 'yearly';
      }
    }
    
    console.log('[verify-personal-checkout] Session verified:', {
      type: metadata.type,
      username: metadata.username || usernameFromRef,
      fullName: metadata.full_name,
      client_reference_id: usernameFromRef,
      detectedPlanType,
      amountTotal: session.amount_total,
    });

    // Always trust Stripe's verified payer email; never a client-supplied value.
    const accountEmail = customerEmail;
    console.log('[verify-personal-checkout] Account email (from Stripe):', accountEmail);

    // Only match by accountEmail (the user's chosen signup email).
    // Never match by billing email -- Apple Pay, Google Pay, etc. use
    // a different email that belongs to someone else's account.
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(
      u => u.email === accountEmail
    );

    let userId: string;
    let tempPassword: string | null = null;

    if (existingUser) {
      userId = existingUser.id;
      console.log('[verify-personal-checkout] Found existing user:', userId, 'email:', existingUser.email);
      
      // Ensure must_set_password flag is set for auto-login flow
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          must_set_password: true,
        },
      });
    } else {
      // Create a new user with the SIGNUP email, not the billing email
      tempPassword = crypto.randomUUID().slice(0, 16);
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: accountEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: metadata.full_name,
          account_type: 'personal',
          must_set_password: true,
        },
      });

      if (createError || !newUser.user) {
        throw new Error(`Failed to create user: ${createError?.message}`);
      }

      userId = newUser.user.id;
      console.log('[verify-personal-checkout] Created new user:', userId, 'with email:', accountEmail);
    }

    // Create the personal profile
    // For Payment Links: username comes from client_reference_id
    // For Checkout API: username comes from metadata
    const username = metadata.username || usernameFromRef || customerEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    
    const { data: existingProfile } = metadataProfileId
      ? await supabase.from('personal_profiles').select('id').eq('id', metadataProfileId).single()
      : await supabase.from('personal_profiles').select('id').eq('user_id', userId).single();

    let profileId: string;
    let isNewProfile = false;

    // Detect trial status from Stripe subscription
    let subscriptionStatus = 'active';
    let trialEndsAt: string | null = null;
    
    if (session.subscription) {
      const subscription = session.subscription as Stripe.Subscription;
      if (subscription?.status === 'trialing' && subscription?.trial_end) {
        subscriptionStatus = 'trialing';
        trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
      }
    }

    console.log('[verify-personal-checkout] Subscription status:', { subscriptionStatus, trialEndsAt });

    // Capture IP for affiliate abuse tracking (also used as the per-user
    // rate-limit key for the card check below).
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || null;

    // ── $1 trial card verification (CARD-CHECK) ──
    // Fail-closed: a declined/dead card must never produce a live trial row.
    // Van sales (metadata.van_sale === "true") charge immediately, so the
    // charge itself is the verification — they skip this check.
    if (subscriptionStatus === 'trialing' && metadata.van_sale !== "true") {
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

      let cardCheck: { ok: boolean; code?: string; message?: string } | null = null;
      try {
        const checkRes = await fetch(`${supabaseUrl}/functions/v1/verify-trial-card`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            customerId: stripeCustomerId,
            ...(clientIp ? { clientIp } : {}),
            // Stable idempotency key: retries / page refreshes never stack extra $1 auths.
            ...(stripeSubscriptionId ? { idempotencyKey: stripeSubscriptionId } : {}),
          }),
        });
        cardCheck = await checkRes.json();
      } catch (checkErr) {
        console.error('[verify-personal-checkout] card check call failed (fail-closed):', checkErr);
      }

      if (!cardCheck?.ok) {
        // Dead card: cancel the trial subscription in Stripe immediately so a
        // dead-card trial never exists or bills, then surface the
        // plain-language message to PersonalSignupComplete.
        if (stripeSubscriptionId) {
          try {
            await stripe.subscriptions.cancel(stripeSubscriptionId);
            console.log('[verify-personal-checkout] canceled dead-card trial subscription:', stripeSubscriptionId);
          } catch (cancelErr) {
            console.error('[verify-personal-checkout] failed to cancel dead-card subscription (non-fatal):', cancelErr);
          }
        }
        const plainMessage = cardCheck?.message
          || "Your card couldn't be verified. Please try a different card or contact your bank.";
        console.log('[verify-personal-checkout] card check failed:', { code: cardCheck?.code });
        return new Response(
          JSON.stringify({ success: false, cardCheckFailed: true, error: plainMessage }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[verify-personal-checkout] card check passed');
    }

    if (existingProfile) {
      // Update existing profile
      const updateData: Record<string, unknown> = {
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
        subscription_status: subscriptionStatus,
        plan_type: detectedPlanType,
        stripe_billing_email: customerEmail,
      };
      if (trialEndsAt) updateData.trial_ends_at = trialEndsAt;
      
      await supabase
        .from('personal_profiles')
        .update(updateData)
        .eq('id', existingProfile.id);
        
      profileId = existingProfile.id;
      console.log('[verify-personal-checkout] Updated existing profile');
    } else {
      // Create new profile
      const { data: profile, error: profileError } = await supabase
        .from('personal_profiles')
        .insert({
          user_id: userId,
          username,
          full_name: metadata.full_name || customerEmail.split('@')[0], // Use email prefix instead of generic name
          email: accountEmail,
          headline: null,
          header_type: 'banner',
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
          subscription_status: subscriptionStatus,
          plan_type: detectedPlanType,
          stripe_billing_email: customerEmail,
          ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
        })
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      profileId = profile.id;
      isNewProfile = true;
      console.log('[verify-personal-checkout] Created profile:', profile.id);

      // Create links if provided
      if (metadata.links_json) {
        try {
          const links = JSON.parse(metadata.links_json);
          if (Array.isArray(links) && links.length > 0) {
            const linksToInsert = links.map((link: any, index: number) => ({
              profile_id: profile.id,
              link_type: link.type,
              label: link.label,
              url: link.url,
              sort_order: index,
            }));

            await supabase
              .from('personal_links')
              .insert(linksToInsert);
              
            console.log('[verify-personal-checkout] Created links:', linksToInsert.length);
          }
        } catch (e) {
          console.error('[verify-personal-checkout] Failed to parse links:', e);
        }
      }
    }

    // Van-sale password handoff (no trial, owner pays on the spot): send the
    // owner a single-use, expiring password-setup link via SMS (owner mobile
    // on the profile) or email fallback. Triggered only for admin-created
    // van checkout sessions (metadata.van_sale === 'true', set server-side
    // by the admin-gated create-checkout-session call). The handoff function
    // itself claims exactly-once delivery (atomic claim on
    // personal_profiles.van_handoff_sent_at), so the 4-second poll from
    // /admin/van can never double-text the owner. Never fails the flow.
    let handoff: Record<string, unknown> = { sent: false, skipped: true };
    if (metadata.van_sale === "true" && metadataProfileId) {
      try {
        const hRes = await fetch(`${supabaseUrl}/functions/v1/send-van-handoff`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ profile_id: profileId }),
        });
        handoff = await hRes.json();
        console.log("[verify-personal-checkout] van handoff result:", {
          profile_id: profileId,
          ok: (handoff as Record<string, unknown>).success === true,
          channel: (handoff as Record<string, unknown>).channel,
        });
      } catch (hErr) {
        console.error("[verify-personal-checkout] van handoff failed (non-fatal):", hErr);
        handoff = { sent: false, error: hErr instanceof Error ? hErr.message : "unknown" };
      }
    }

    // Send welcome emails for NEW profiles only
    if (isNewProfile) {
      try {
        // Fetch the full profile to get any additional data
        const { data: fullProfile } = await supabase
          .from('personal_profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        const emailPayload = {
          fullName: metadata.full_name || fullProfile?.full_name || 'TapAway User',
          username,
          email: customerEmail,
          profilePhotoUrl: fullProfile?.profile_photo_url || undefined,
          headerImageUrl: fullProfile?.header_image_url || undefined,
          accentColor: fullProfile?.header_color || undefined,
          profileId,
          cardHeadline: metadata.card_headline || fullProfile?.headline || undefined,
        };

        console.log('[verify-personal-checkout] Sending welcome emails...');

        // Call the welcome emails function
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-personal-welcome-emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(emailPayload),
        });

        const emailResult = await emailResponse.json();
        console.log('[verify-personal-checkout] Email result:', emailResult);
      } catch (emailError) {
        // Don't fail the whole flow if emails fail
        console.error('[verify-personal-checkout] Failed to send welcome emails:', emailError);
      }
    }

    // clientIp was captured above (used for affiliate abuse tracking + card check).

    // Return success with session info for auto-login
    return new Response(
      JSON.stringify({
        success: true,
        email: accountEmail,
        username,
        userId, // Return userId for password setup
        planType: detectedPlanType,
        needsPasswordSetup: tempPassword !== null,
        clientIp,
        handoff, // van sale: { success, channel, sent_to } — no raw link, ever
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[verify-personal-checkout] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
