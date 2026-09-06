// Creates a Stripe Checkout session for the public /claim page.
// Plans: base ($20/mo), bundle ($20 + $5 Card Club = $25/mo), annual ($199/yr).
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findOrCreateProduct(stripe: Stripe, key: string, value: string, name: string) {
  const existing = await stripe.products.search({
    query: `metadata["${key}"]:"${value}" active:"true"`,
    limit: 1,
  });
  if (existing.data.length > 0) return existing.data[0].id;
  const product = await stripe.products.create({ name, metadata: { [key]: value } });
  return product.id;
}

async function findOrCreatePrice(
  stripe: Stripe,
  productId: string,
  unitAmount: number,
  interval: 'month' | 'year',
) {
  const prices = await stripe.prices.list({ product: productId, type: 'recurring', active: true, limit: 50 });
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const rlKey = getRateLimitKey(req, 'create-claim-checkout');
  if (!checkRateLimit(rlKey, 20, 60 * 60 * 1000)) return rateLimitResponse(corsHeaders);

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) throw new Error('STRIPE_SECRET_KEY not configured');
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    const body = await req.json();
    const { action, plan, token } = body ?? {};

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ---- Admin-only: mint a 24h presentation token for one hub -------------
    if (action === 'mint') {
      const authHeader = req.headers.get('Authorization') || '';
      if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

      const caller = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
      );
      const { data: userData } = await caller.auth.getUser();
      if (!userData?.user) return json({ error: 'Unauthorized' }, 401);
      const { data: isAdmin } = await caller.rpc('is_admin');
      if (isAdmin !== true) return json({ error: 'Forbidden' }, 403);

      const hubId = body.profileId;
      if (!hubId || typeof hubId !== 'string' || !UUID_RE.test(hubId)) {
        return json({ error: 'Invalid profile id' }, 400);
      }
      const { data: hub } = await admin
        .from('personal_profiles')
        .select('id')
        .eq('id', hubId)
        .maybeSingle();
      if (!hub) return json({ error: 'Hub not found' }, 404);

      const minted = await signHubSalesToken(hubId);
      return json({ token: minted, expiresInSeconds: HUB_SALES_TOKEN_TTL_SECONDS });
    }

    // ---- Customer checkout: the hub comes from the signed token only -------
    const profileId = await verifyHubSalesToken(token);
    if (!profileId) return json({ error: 'This link has expired. Ask your TapAway rep for a new one.' }, 401);

    const selectedPlan = plan === 'base' || plan === 'annual' ? plan : 'bundle';

    const { data: profile } = await admin
      .from('personal_profiles')
      .select('id, email, username, full_name, stripe_customer_id, stripe_subscription_id, subscription_status')
      .eq('id', profileId)

      .maybeSingle();
    if (!profile) return json({ error: 'Hub not found' }, 404);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (selectedPlan === 'annual') {
      const prod = await findOrCreateProduct(stripe, 'tapaway_plan', 'annual_value_pass', 'TapAway Annual Value Pass');
      const price = await findOrCreatePrice(stripe, prod, 19900, 'year');
      lineItems.push({ price, quantity: 1 });
    } else {
      const baseProd = await findOrCreateProduct(stripe, 'tapaway_plan', 'base_software', 'TapAway Base Software');
      const basePrice = await findOrCreatePrice(stripe, baseProd, 2000, 'month');
      lineItems.push({ price: basePrice, quantity: 1 });

      if (selectedPlan === 'bundle') {
        const clubProd = await findOrCreateProduct(stripe, 'tapaway_addon', 'card_club', 'TapAway Card Club');
        const clubPrice = await findOrCreatePrice(stripe, clubProd, 500, 'month');
        lineItems.push({ price: clubPrice, quantity: 1 });
      }
    }

    const origin = req.headers.get('origin') || Deno.env.get('FRONTEND_URL') || 'https://tapaway.co';
    const hasCardClub = selectedPlan !== 'base';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: lineItems,
      ...(profile.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: profile.email || undefined }),
      // Apple Pay / Google Pay / Link wallets are surfaced automatically by
      // Stripe Checkout based on the dashboard payment-method settings.
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      success_url: `${origin}/claim?id=${profileId}&success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/claim?id=${profileId}`,
      metadata: {
        type: 'claim',
        profile_id: profileId,
        plan: selectedPlan,
        card_club: String(hasCardClub),
      },
      subscription_data: {
        metadata: {
          type: 'claim',
          profile_id: profileId,
          plan: selectedPlan,
          card_club: String(hasCardClub),
        },
      },
    } as Stripe.Checkout.SessionCreateParams);

    return json({ url: session.url });
  } catch (error) {
    console.error('[create-claim-checkout] Error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
