import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan tier definitions
const PLAN_TIERS: Record<string, {
  label: string;
  planTier: 'restaurant' | 'business_lite';
  billingCycle: 'monthly' | 'annual';
  priceAmount: number; // in cents
  interval: 'month' | 'year';
  productName: string;
  trialDays: number;
}> = {
  solo_monthly: {
    label: 'Solo Pro Monthly',
    planTier: 'business_lite',
    billingCycle: 'monthly',
    priceAmount: 1500, // $15/mo
    interval: 'month',
    productName: 'TapAway Solo Pro (Monthly)',
    trialDays: 14,
  },
  solo_annual: {
    label: 'Solo Pro Annual',
    planTier: 'business_lite',
    billingCycle: 'annual',
    priceAmount: 15000, // $150/yr
    interval: 'year',
    productName: 'TapAway Solo Pro (Annual)',
    trialDays: 14,
  },
  venue_monthly: {
    label: 'Venue Pack Monthly',
    planTier: 'restaurant',
    billingCycle: 'monthly',
    priceAmount: 3900, // $39/mo
    interval: 'month',
    productName: 'TapAway Venue Pack (Monthly)',
    trialDays: 21,
  },
  venue_annual: {
    label: 'Venue Pack Annual',
    planTier: 'restaurant',
    billingCycle: 'annual',
    priceAmount: 39000, // $390/yr
    interval: 'year',
    productName: 'TapAway Venue Pack (Annual)',
    trialDays: 21,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rlKey = getRateLimitKey(req, "create-rep-checkout");
  if (!checkRateLimit(rlKey, 10, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const { plan, salesRepId, repRestaurantId, restaurantName, contactEmail } = await req.json();

    if (!plan || !salesRepId) {
      throw new Error("Plan and salesRepId are required");
    }

    const tierConfig = PLAN_TIERS[plan];
    if (!tierConfig) {
      throw new Error(`Invalid plan type: ${plan}. Valid: ${Object.keys(PLAN_TIERS).join(', ')}`);
    }

    // Dynamic product/price creation (same pattern as create-checkout-session)
    const products = await stripe.products.list({
      limit: 100,
      active: true,
    });

    let product = products.data.find(
      (p) => p.metadata?.plan_key === plan && p.metadata?.source === 'rep_portal'
    );

    if (!product) {
      product = await stripe.products.create({
        name: tierConfig.productName,
        metadata: { plan_key: plan, source: 'rep_portal' },
      });
      console.log(`Created Stripe product: ${product.id} for ${plan}`);
    }

    // Find or create price
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 10,
    });

    let price = prices.data.find(
      (p) =>
        p.unit_amount === tierConfig.priceAmount &&
        p.recurring?.interval === tierConfig.interval
    );

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: tierConfig.priceAmount,
        currency: 'usd',
        recurring: { interval: tierConfig.interval },
      });
      console.log(`Created Stripe price: ${price.id} for ${plan}`);
    }

    const baseUrl = "https://tapaway.co";

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${baseUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/paywall`,
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: ["US"] },
      subscription_data: {
        trial_period_days: tierConfig.trialDays,
      },
      metadata: {
        sales_rep_id: salesRepId,
        rep_restaurant_id: repRestaurantId || "",
        restaurant_name: restaurantName || "",
        plan_type: tierConfig.billingCycle === 'annual' ? 'yearly' : 'monthly',
        plan_tier: tierConfig.planTier,
        billing_cycle: tierConfig.billingCycle,
        source: "rep_portal",
      },
    };

    if (contactEmail) {
      sessionConfig.customer_email = contactEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log(`Created rep checkout session: ${session.id} for rep ${salesRepId}, plan: ${plan} (${tierConfig.planTier} ${tierConfig.billingCycle})`);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in create-rep-checkout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
