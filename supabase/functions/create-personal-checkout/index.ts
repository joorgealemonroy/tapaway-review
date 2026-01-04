import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Personal plan price IDs - these need to be created in Stripe
// For now, we'll create them dynamically if they don't exist
const PERSONAL_MONTHLY_PRICE = "price_personal_monthly_9";
const PERSONAL_YEARLY_PRICE = "price_personal_yearly_99";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const body = await req.json();
    const { email, fullName, username, planType, addExtraCard, links } = body;

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
      addExtraCard,
    });

    // Look up or create Stripe products and prices
    let product: Stripe.Product | undefined;
    const existingProducts = await stripe.products.list({ 
      active: true,
      limit: 100,
    });
    
    product = existingProducts.data.find((p: Stripe.Product) => p.metadata?.type === 'personal_tapaway');
    
    if (!product) {
      product = await stripe.products.create({
        name: 'TapAway Personal',
        description: 'Personal TapAway NFC card with unlimited links and analytics',
        metadata: { type: 'personal_tapaway' },
      });
      console.log('[create-personal-checkout] Created product:', product.id);
    }

    // Get or create prices
    let monthlyPrice: Stripe.Price | undefined;
    let yearlyPrice: Stripe.Price | undefined;
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    });

    monthlyPrice = existingPrices.data.find(
      (p: Stripe.Price) => p.recurring?.interval === 'month' && p.unit_amount === 900
    );
    yearlyPrice = existingPrices.data.find(
      (p: Stripe.Price) => p.recurring?.interval === 'year' && p.unit_amount === 9900
    );

    if (!monthlyPrice) {
      monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 900, // $9.00
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { plan: 'personal_monthly' },
      });
      console.log('[create-personal-checkout] Created monthly price:', monthlyPrice.id);
    }

    if (!yearlyPrice) {
      yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 9900, // $99.00
        currency: 'usd',
        recurring: { interval: 'year' },
        metadata: { plan: 'personal_yearly' },
      });
      console.log('[create-personal-checkout] Created yearly price:', yearlyPrice.id);
    }

    const selectedPrice = planType === 'yearly' ? yearlyPrice : monthlyPrice;

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: selectedPrice.id,
        quantity: 1,
      },
    ];

    // Add extra card if selected
    if (addExtraCard) {
      // Look for or create extra card price (one-time)
      let extraCardPrice: Stripe.Price | undefined;
      const extraCardPrices = await stripe.prices.list({
        product: product.id,
        type: 'one_time',
        active: true,
      });
      
      extraCardPrice = extraCardPrices.data.find((p: Stripe.Price) => p.unit_amount === 1000);
      
      if (!extraCardPrice) {
        extraCardPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: 1000, // $10.00
          currency: 'usd',
          metadata: { item: 'extra_card' },
        });
      }

      lineItems.push({
        price: extraCardPrice.id,
        quantity: 1,
      });
    }

    const origin = req.headers.get('origin') || 'https://tapaway.co';

    // Create checkout session
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
        add_extra_card: addExtraCard ? 'true' : 'false',
        links_json: JSON.stringify(links || []),
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
