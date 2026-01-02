import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Lookup and verify a Stripe Payment Link checkout session.
 * Called from /onboarding when user arrives with session_id from Stripe.
 * 
 * This endpoint:
 * 1. Verifies the session is valid and paid
 * 2. Extracts customer info (email, name)
 * 3. Creates or updates user account
 * 4. Creates restaurant record with Stripe IDs
 * 5. Returns user/restaurant info for onboarding
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      console.error('[lookup-stripe-session] No session ID provided');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Session ID required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[lookup-stripe-session] Looking up session:', sessionId);

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('[lookup-stripe-session] STRIPE_SECRET_KEY not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payment system not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Retrieve the checkout session from Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer', 'line_items'],
      });
    } catch (stripeError: any) {
      console.error('[lookup-stripe-session] Stripe lookup failed:', stripeError.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid or expired session',
        needsRetry: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!session) {
      console.error('[lookup-stripe-session] Session not found');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Session not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check payment status - Payment Links use 'paid' for successful payments
    // or 'no_payment_required' for trials
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      console.log('[lookup-stripe-session] Payment not completed:', session.payment_status);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payment not completed',
        paymentStatus: session.payment_status,
        needsRetry: true
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract customer info
    const customerId = typeof session.customer === 'string' 
      ? session.customer 
      : session.customer?.id;
    
    const subscriptionId = typeof session.subscription === 'string' 
      ? session.subscription 
      : session.subscription?.id;
    
    const customerEmail = session.customer_email || session.customer_details?.email;
    const customerName = session.customer_details?.name || null;

    if (!customerEmail) {
      console.error('[lookup-stripe-session] No customer email found');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Customer email not found' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[lookup-stripe-session] Session verified:', {
      id: session.id,
      customer: customerId,
      subscription: subscriptionId,
      email: customerEmail,
      name: customerName,
      payment_status: session.payment_status,
    });

    // Determine plan type from subscription
    let planType = 'monthly';
    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id || '';
        if (priceId.toLowerCase().includes('year')) {
          planType = 'yearly';
        }
        // Check if it's a trial
        if (subscription.trial_end) {
          planType = 'trial';
        }
      } catch (e) {
        console.log('[lookup-stripe-session] Could not determine plan type, defaulting to monthly');
      }
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.7');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === customerEmail.toLowerCase()
    );

    let userId: string;
    let isNewUser = false;
    let mustSetPassword = false;

    if (existingUser) {
      userId = existingUser.id;
      console.log('[lookup-stripe-session] Found existing user:', userId);
      
      // Check if they need to set password
      if (existingUser.user_metadata?.must_set_password === true) {
        mustSetPassword = true;
      } else if (!existingUser.last_sign_in_at) {
        mustSetPassword = true;
      }
    } else {
      // Create new user with temporary password
      const tempPassword = `TapAway${Date.now()}!${Math.random().toString(36).slice(2)}`;
      
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: customerEmail,
        password: tempPassword,
        email_confirm: true, // Auto-confirm since they paid
        user_metadata: {
          greeting_name: customerName?.split(' ')[0] || null,
          full_name: customerName,
          must_set_password: true,
        }
      });

      if (createUserError) {
        console.error('[lookup-stripe-session] Failed to create user:', createUserError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Failed to create account' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      userId = newUser.user.id;
      isNewUser = true;
      mustSetPassword = true;
      console.log('[lookup-stripe-session] Created new user:', userId);
    }

    // Check if restaurant already exists for this user
    const { data: existingRestaurant } = await supabaseAdmin
      .from('restaurants')
      .select('id, subscription_status, onboarding_completed, onboarding_step')
      .eq('owner_id', userId)
      .maybeSingle();

    let restaurantId: string;

    if (existingRestaurant) {
      restaurantId = existingRestaurant.id;
      console.log('[lookup-stripe-session] Found existing restaurant:', restaurantId);
      
      // Update with Stripe info if needed
      const { error: updateError } = await supabaseAdmin
        .from('restaurants')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan_type: planType,
          subscription_status: 'active',
        })
        .eq('id', restaurantId);

      if (updateError) {
        console.error('[lookup-stripe-session] Failed to update restaurant:', updateError);
      }
    } else {
      // Create new restaurant
      const { data: newRestaurant, error: insertError } = await supabaseAdmin
        .from('restaurants')
        .insert({
          owner_id: userId,
          restaurant_name: 'New Restaurant',
          greeting_name: customerName?.split(' ')[0] || null,
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
        console.error('[lookup-stripe-session] Failed to create restaurant:', insertError);
        
        // Log to support_requests for debugging
        await supabaseAdmin
          .from('support_requests')
          .insert({
            business_name: 'Onboarding Error',
            email: customerEmail,
            name: customerName || 'Unknown',
            request_type: 'onboarding_error',
            description: `Failed to create restaurant: ${insertError.message}`,
            request_details: {
              session_id: sessionId,
              user_id: userId,
              error: insertError.message,
            }
          });
        
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Failed to create account. Our team has been notified.' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      restaurantId = newRestaurant.id;
      console.log('[lookup-stripe-session] Created new restaurant:', restaurantId);

      // Create fulfillment order
      const shippingDetails = (session as any).shipping_details || (session as any).shipping || null;
      const customerDetails = session.customer_details || null;
      
      const shippingName = shippingDetails?.name || customerDetails?.name || customerName || null;
      const shippingAddress = shippingDetails?.address || null;

      const { error: fulfillmentError } = await supabaseAdmin
        .from('fulfillment_orders')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
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
        console.error('[lookup-stripe-session] Failed to create fulfillment order:', fulfillmentError);
        // Non-fatal
      }
    }

    // Create billing portal URL
    let portalUrl: string | null = null;
    if (customerId) {
      try {
        const portalReturnUrl = Deno.env.get('STRIPE_PORTAL_RETURN_URL') || 'https://tapaway.co/dashboard';
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: portalReturnUrl,
        });
        portalUrl = portalSession.url;
        
        await supabaseAdmin
          .from('restaurants')
          .update({ stripe_portal_url: portalUrl })
          .eq('id', restaurantId);
      } catch (portalError) {
        console.error('[lookup-stripe-session] Failed to create billing portal (non-fatal):', portalError);
      }
    }

    // Get current onboarding state
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('onboarding_step, onboarding_completed')
      .eq('id', restaurantId)
      .single();

    return new Response(JSON.stringify({ 
      success: true, 
      userId,
      restaurantId,
      email: customerEmail,
      name: customerName,
      isNewUser,
      mustSetPassword,
      onboardingStep: restaurant?.onboarding_step || 1,
      onboardingCompleted: restaurant?.onboarding_completed || false,
      planType,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[lookup-stripe-session] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
