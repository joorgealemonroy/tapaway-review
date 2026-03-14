import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hardcoded Stripe Price IDs
const PERSONAL_PRICES = {
  monthly: 'price_1SnMxKDg8DaTuVNZsc6KH8pw',  // $9/month
  yearly: 'price_1SnMz2Dg8DaTuVNZM7QjRAET',   // $99/year
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

    const body = await req.json();
    const { email, fullName, username, planType, links, cardHeadline } = body;

    if (!email || !fullName || !username || !planType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-personal-checkout] Creating checkout for:', {
      email: email.substring(0, 3) + '***',
      username,
      planType,
    });

    const selectedPriceId = planType === 'yearly' 
      ? PERSONAL_PRICES.yearly 
      : PERSONAL_PRICES.monthly;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: selectedPriceId,
        quantity: 1,
      },
    ];

    const origin = req.headers.get('origin') || 'https://tapaway.co';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: lineItems,
      customer_email: email,
      success_url: `${origin}/personal/signup/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/personal/signup`,
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'MX'],
      },
      metadata: {
        type: 'personal',
        full_name: fullName,
        username: username.toLowerCase(),
        plan_type: planType,
        links_json: JSON.stringify(links || []),
        card_headline: cardHeadline || '',
      },
      subscription_data: {
        metadata: {
          type: 'personal',
          username: username.toLowerCase(),
        },
      },
    });

    console.log('[create-personal-checkout] Session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[create-personal-checkout] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
