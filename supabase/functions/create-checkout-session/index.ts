import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const { plan, email, userId, restaurantId } = await req.json();
    
    console.log('Creating checkout session:', { plan, email, userId, restaurantId });

    // Price IDs from Stripe Dashboard
    const PRICE_IDS = {
      monthly: 'price_1SJP7CDg8DaTuVNZlcOE5Rn8',   // TapAway Monthly
      yearly: 'price_1SJPryDg8DaTuVNZBB4at0Gc'     // TapAway Yearly ($300 renewal)
    };

    console.log('Using price IDs:', PRICE_IDS);

    // Check if December promo is active
    const PROMO_DEADLINE = new Date('2025-12-31T23:59:59-08:00').getTime();
    const promoActive = Date.now() < PROMO_DEADLINE;
    const isYearly = plan === 'yearly';

    // Get promo code ID from environment
    const promoCodeId = Deno.env.get('STRIPE_PROMO_CHRISTMAS150');
    
    // Apply discount only for yearly plan during promo period
    const discounts = isYearly && promoActive && promoCodeId
      ? [{ promotion_code: promoCodeId }]
      : [];

    if (isYearly && promoActive && !promoCodeId) {
      console.warn('STRIPE_PROMO_CHRISTMAS150 not configured - proceeding without discount');
    }

    const priceId = isYearly ? PRICE_IDS.yearly : PRICE_IDS.monthly;

    // Create checkout session with shipping address collection
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      discounts,
      customer_email: email,
      success_url: `${req.headers.get('origin') || 'https://app.tapaway.co'}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin') || 'https://app.tapaway.co'}/paywall`,
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'MX'], // Adjust as needed
      },
      metadata: {
        plan_type: plan,
        user_id: userId || '',
        restaurant_id: restaurantId || '',
        promo_applied: (isYearly && promoActive && promoCodeId) ? 'true' : 'false',
      },
    });

    console.log('Checkout session created:', {
      sessionId: session.id,
      url: session.url,
      discountsApplied: discounts.length > 0,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
