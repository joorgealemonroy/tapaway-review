import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pricing matrix.
// Yearly prices are FIRST-CLASS Stripe prices on the same product family —
// never one-time charges (subscription-only invariant).
// Solo yearly reuses the canonical 'TapAway Annual Value Pass' product
// (metadata tapaway_plan=annual_value_pass) so the /claim annual option and
// the signup yearly option resolve to ONE Stripe SKU, not two.
// Venue yearly is a second price ($390/yr) on the Venue Pack product.
const PLAN_CONFIG: Record<string, {
  name: string;
  amount: number;            // monthly, cents
  yearlyAmount: number;      // yearly, cents
  trialDays: number;
  productName: string;
  yearlyProductKey: string;  // metadata value of the product carrying the yearly price
  yearlyProductName: string;
}> = {
  solo: { name: 'Solo Pro', amount: 2000, yearlyAmount: 19900, trialDays: 14, productName: 'TapAway Solo Pro', yearlyProductKey: 'annual_value_pass', yearlyProductName: 'TapAway Annual Value Pass' },
  venue: { name: 'Venue Pack', amount: 3900, yearlyAmount: 39000, trialDays: 14, productName: 'TapAway Venue Pack', yearlyProductKey: 'venue', yearlyProductName: 'TapAway Venue Pack' },
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

/** Find or create a recurring USD price on a product, for the given interval */
async function findOrCreatePrice(
  stripe: Stripe,
  productId: string,
  unitAmount: number,
  interval: 'month' | 'year',
): Promise<string> {
  const prices = await stripe.prices.list({
    product: productId,
    type: 'recurring',
    active: true,
    limit: 20,
  });
  const match = prices.data.find(
    (p: any) => p.unit_amount === unitAmount && p.currency === 'usd' && p.recurring?.interval === interval,
  );
  if (match) return match.id;

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: 'usd',
    recurring: { interval },
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
    const { email, userId, restaurantId, planType, billingInterval, hasProtection: hasProtectionFlag, promoToken, dashboardType, claimRestaurantId, noTrial, personalProfileId, successPath, trybeVisitorId } = body;

    // Trybe creator-attribution visitor id (optional; only present once the
    // consent-gated pixel has loaded). Stored on the subscription so every
    // future renewal invoice can be attributed to the original creator.
    const trybeVid =
      typeof trybeVisitorId === 'string' && trybeVisitorId.length > 0 && trybeVisitorId.length <= 128
        ? trybeVisitorId
        : '';

    // Validate the plan FIRST: validPlanType and config are referenced by the
    // subscription data and success URL built below. (Declaring them after
    // use would throw at runtime — const bindings in the temporal dead zone.)
    const rawPlanType = typeof planType === 'string' ? planType : 'venue';
    const validPlanType = rawPlanType === 'solo' || rawPlanType === 'venue' ? rawPlanType : 'venue';
    const config = PLAN_CONFIG[validPlanType];
    if (!config) {
      return new Response(JSON.stringify({ error: `Unknown plan type: ${rawPlanType}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // Validate the billing interval BEFORE first use (same TDZ-safe pattern).
    // Only the exact string 'year' selects yearly billing; anything else —
    // missing, wrong type, unknown value — falls back to monthly. The client
    // can never pick a price the server doesn't know.
    // Yearly behavior: the 14-day free trial still applies (standard SaaS);
    // the trial's first charge is the FULL yearly amount ($199 / $390). The
    // $1 card verification still runs on trial signups regardless of period.
    const rawBillingInterval = typeof billingInterval === 'string' ? billingInterval : 'month';
    const isYearly = rawBillingInterval === 'year';

    // Van mode: noTrial skips the free trial and charges immediately.
    // SECURITY: only authenticated admins may use noTrial / custom
    // successPath / personalProfileId. Public callers can never skip trials.
    if (noTrial || personalProfileId || successPath) {
      const authHeader = req.headers.get('Authorization') || '';
      const jwt = authHeader.replace('Bearer ', '');
      if (!jwt) {
        return new Response(JSON.stringify({ error: 'Admin authentication required for no-trial checkout.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
        });
      }
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.7');
      const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userRes } = await userClient.auth.getUser();
      if (!userRes?.user) {
        return new Response(JSON.stringify({ error: 'Admin authentication required for no-trial checkout.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
        });
      }
      const { data: isAdminRes } = await userClient.rpc('is_admin');
      if (!isAdminRes) {
        return new Response(JSON.stringify({ error: 'Admin access required for no-trial checkout.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
        });
      }
    }

    // Sanitize the optional admin-provided success path: must be a
    // same-origin path (no protocol/host) so it can't be used as an
    // open redirect.
    let vanSuccessPath: string | null = null;
    if (typeof successPath === 'string' && successPath.startsWith('/') && !successPath.startsWith('//')) {
      vanSuccessPath = successPath;
    }

    // When noTrial is set, omit trial_period_days entirely: Stripe charges
    // the card immediately and the subscription starts 'active' (not
    // 'trialing'). Card-on-file collection is unchanged (subscription mode
    // always collects a card).
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {};
    if (!noTrial) {
      subscriptionData.trial_period_days = config.trialDays;
    }

    const origin = req.headers.get('origin') || 'https://tapaway.co';
    const successUrl = vanSuccessPath
      ? `${origin}${vanSuccessPath}`
      : `${origin}/onboarding?session_id={CHECKOUT_SESSION_ID}&source=stripe&plan_type=${validPlanType}&billing_interval=${isYearly ? 'year' : 'month'}&restaurant_id=${restaurantId || ''}`;

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
      billingInterval: isYearly ? 'year' : 'month',
      protection: !!hasProtectionFlag,
      email: email.substring(0, 3) + '***',
      noTrial: !!noTrial,
    });

    // --- Build line items dynamically ---
    // Yearly selects the plan's yearly price (same product family; Solo
    // yearly = the Annual Value Pass SKU shared with the /claim flow).
    const baseProdId = await findOrCreateProduct(
      stripe,
      'tapaway_plan',
      isYearly ? config.yearlyProductKey : validPlanType,
      isYearly ? config.yearlyProductName : config.productName,
    );
    const basePriceId = await findOrCreatePrice(
      stripe,
      baseProdId,
      isYearly ? config.yearlyAmount : config.amount,
      isYearly ? 'year' : 'month',
    );

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: basePriceId, quantity: 1 },
    ];

    let protectionPriceId: string | null = null;
    if (hasProtectionFlag) {
      const protProdId = await findOrCreateProduct(stripe, 'tapaway_addon', 'loss_protection', 'TapAway Loss Protection');
      // Protection stays monthly even on yearly plans — a $5/mo add-on on a
      // yearly subscription is valid in Stripe and keeps the add-on simple.
      protectionPriceId = await findOrCreatePrice(stripe, protProdId, PROTECTION_AMOUNT, 'month');
      lineItems.push({ price: protectionPriceId, quantity: 1 });
    }

    // --- Handle promo token for 50% off ---
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (promoToken) {
      // Validate promoToken via DB (service role)
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.7');
      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: tokenRow } = await adminClient
        .from('promo_tokens')
        .select('id, discount_type, expires_at, is_used')
        .eq('token', promoToken)
        .maybeSingle();

      if (tokenRow && !tokenRow.is_used && new Date(tokenRow.expires_at) > new Date() && tokenRow.discount_type === '50_off') {
        // Find or create a 50% off coupon
        const existingCoupons = await stripe.coupons.list({ limit: 100 });
        let couponId = existingCoupons.data.find(
          (c: any) => c.percent_off === 50 && c.duration === 'once' && c.valid
        )?.id;

        if (!couponId) {
          const coupon = await stripe.coupons.create({
            percent_off: 50,
            duration: 'once',
            name: 'TapAway 50% Off Promo',
          });
          couponId = coupon.id;
        }

        discounts = [{ coupon: couponId }];
        console.log('[create-checkout-session] Applied 50% off promo coupon');
      }
    }

    // --- Create checkout session ---
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: lineItems,
      customer_email: email,
      success_url: successUrl,
      cancel_url: `${req.headers.get('origin') || 'https://tapaway.co'}/onboarding`,
      billing_address_collection: 'required',
      // Collect phone so we can text the client when their hub is ready.
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'MX'] },
      subscription_data: subscriptionData,
      metadata: {
        // plan_type is what verify-checkout / the webhook persist to the DB:
        // 'solo_yearly' / 'venue_yearly' so admin MRR can amortize yearly
        // plans as yearly_price/12 instead of mistaking them for monthly.
        plan_type: isYearly ? `${validPlanType}_yearly` : validPlanType,
        billing_interval: isYearly ? 'year' : 'month',
        has_protection: String(!!hasProtectionFlag),
        user_id: userId || '',
        restaurant_id: restaurantId || '',
        van_sale: noTrial ? 'true' : 'false',
        personal_profile_id: personalProfileId || '',
        promo_token: promoToken || '',
        dashboard_type: dashboardType || 'restaurant',
        claim_restaurant_id: claimRestaurantId || '',
      },
    };

    if (discounts) {
      sessionParams.discounts = discounts;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('[create-checkout-session] Session created:', { sessionId: session.id, plan: validPlanType, billingInterval: isYearly ? 'year' : 'month' });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
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
