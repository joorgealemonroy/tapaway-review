import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pricing matrix
const PLAN_CONFIG: Record<string, { name: string; amount: number; trialDays: number; productName: string }> = {
  solo: { name: 'Solo Pro', amount: 1500, trialDays: 14, productName: 'TapAway Solo Pro' },
  venue: { name: 'Venue Pack', amount: 3900, trialDays: 21, productName: 'TapAway Venue Pack' },
};

const PROTECTION_AMOUNT = 500; // $5/mo

function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 255) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUuid(value: string | undefined): boolean {
  if (!value) return true;
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Find or create a Stripe product by metadata key */
async function findOrCreateProduct(
  stripe: Stripe,
  metaKey: string,
  metaValue: string,
  productName: string,
): Promise<string> {
  // Search for existing product
  const existing = await stripe.products.search({
    query: `metadata["${metaKey}"]:"${metaValue}" active:"true"`,
    limit: 1,
  });
  if (existing.data.length > 0) return existing.data[0].id;

  // Create new product
  const product = await stripe.products.create({
    name: productName,
    metadata: { [metaKey]: metaValue },
  });
  return product.id;
}

/** Find or create a recurring monthly USD price on a product */
async function findOrCreatePrice(
  stripe: Stripe,
  productId: string,
  unitAmount: number,
): Promise<string> {
  const prices = await stripe.prices.list({
    product: productId,
    type: 'recurring',
    active: true,
    limit: 20,
  });
  const match = prices.data.find(
    (p) => p.unit_amount === unitAmount && p.currency === 'usd' && p.recurring?.interval === 'month',
  );
  if (match) return match.id;

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  return price.id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rlKey = getRateLimitKey(req, "create-checkout-session");
  if (!checkRateLimit(rlKey, 10, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) throw new Error('STRIPE_SECRET_KEY not configured');

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    const body = await req.json();
    const { email, userId, restaurantId, planType, hasProtection: hasProtectionFlag, promoToken } = body;

    // Validate plan type
    const validPlanType = planType === 'solo' || planType === 'venue' ? planType : 'venue';
    const config = PLAN_CONFIG[validPlanType];

    if (!validateEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }
    if (!validateUuid(userId) || !validateUuid(restaurantId)) {
      return new Response(JSON.stringify({ error: 'Invalid ID format.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    console.log('[create-checkout-session] Building dynamic checkout:', {
      plan: validPlanType,
      protection: !!hasProtectionFlag,
      email: email.substring(0, 3) + '***',
    });

    // --- Build line items dynamically ---
    const baseProdId = await findOrCreateProduct(stripe, 'tapaway_plan', validPlanType, config.productName);
    const basePriceId = await findOrCreatePrice(stripe, baseProdId, config.amount);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: basePriceId, quantity: 1 },
    ];

    let protectionPriceId: string | null = null;
    if (hasProtectionFlag) {
      const protProdId = await findOrCreateProduct(stripe, 'tapaway_addon', 'loss_protection', 'TapAway Loss Protection');
      protectionPriceId = await findOrCreatePrice(stripe, protProdId, PROTECTION_AMOUNT);
      lineItems.push({ price: protectionPriceId, quantity: 1 });
    }

    // --- Create checkout session ---
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: lineItems,
      customer_email: email,
      success_url: `${req.headers.get('origin') || 'https://tapaway.co'}/onboarding?session_id={CHECKOUT_SESSION_ID}&source=stripe&plan_type=${validPlanType}&restaurant_id=${restaurantId || ''}`,
      cancel_url: `${req.headers.get('origin') || 'https://tapaway.co'}/onboarding`,
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'MX'] },
      subscription_data: {
        trial_period_days: config.trialDays,
      },
      metadata: {
        plan_type: validPlanType,
        has_protection: String(!!hasProtectionFlag),
        user_id: userId || '',
        restaurant_id: restaurantId || '',
      },
    });

    console.log('[create-checkout-session] Session created:', { sessionId: session.id, plan: validPlanType });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    console.error('[create-checkout-session] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
