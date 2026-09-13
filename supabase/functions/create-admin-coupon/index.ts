// create-admin-coupon — Jorge's QUICK DISCOUNT TOOL edge function.
//
// Admin-only. Three actions (body.action):
//   create   {name, percent_off XOR amount_off_cents, duration: 'once'|'repeating'|'forever',
//             duration_in_months (required when duration='repeating'), note?}
//            -> creates a Stripe coupon (metadata: created_by='admin', note),
//               stores a row in public.admin_coupons, returns the row.
//   list     -> returns rows from public.admin_coupons, newest first.
//   make_link {coupon_id (uuid of our admin_coupons row), plan_key ('solo'|'venue') or
//             price_id, customer_email?}
//            -> creates a Stripe Checkout Session (mode='subscription') with the
//               coupon applied as a discount, returns {url}.
//            (Checkout Sessions support coupons; Payment Links do not.)
//   archive  {coupon_id (uuid of our admin_coupons row)}
//            -> deletes the Stripe coupon (best-effort) + removes the
//               admin_coupons row so it can't be handed out again.
//
// Hard rule: everything stays subscription-recurring — no one-time sales,
// no activation fees (sales-tax constraint).
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Same pricing matrix as create-checkout-session.
const PLAN_CONFIG: Record<string, { name: string; amount: number; productName: string }> = {
  solo: { name: 'TapAway Solo', amount: 2000, productName: 'TapAway Solo' },
  venue: { name: 'TapAway Pro', amount: 3900, productName: 'TapAway Pro' },
};

const VALID_DURATIONS = ['once', 'repeating', 'forever'] as const;
type Duration = typeof VALID_DURATIONS[number];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Find or create a Stripe product by metadata key (copied from create-checkout-session). */
async function findOrCreateProduct(
  stripe: Stripe,
  metaKey: string,
  metaValue: string,
  productName: string,
): Promise<string> {
  const existing = await stripe.products.search({
    query: `metadata["${metaKey}"]:"${metaValue}" active:"true"`,
    limit: 1,
  });
  if (existing.data.length > 0) return existing.data[0].id;
  const product = await stripe.products.create({
    name: productName,
    metadata: { [metaKey]: metaValue },
  });
  return product.id;
}

/** Find or create a recurring monthly USD price on a product. */
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
    (p: any) => p.unit_amount === unitAmount && p.currency === 'usd' && p.recurring?.interval === 'month',
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

function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 255) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface CreatePayload {
  name?: unknown;
  percent_off?: unknown;
  amount_off_cents?: unknown;
  duration?: unknown;
  duration_in_months?: unknown;
  note?: unknown;
}

function validateCreate(body: CreatePayload): { ok: true; values: {
  name: string; percentOff: number | null; amountOffCents: number | null;
  duration: Duration; durationInMonths: number | null; note: string | null;
} } | { ok: false; error: string } {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return { ok: false, error: 'name is required' };
  if (name.length > 100) return { ok: false, error: 'name must be 100 characters or fewer' };

  const hasPercent = body.percent_off !== undefined && body.percent_off !== null;
  const hasAmount = body.amount_off_cents !== undefined && body.amount_off_cents !== null;
  if (hasPercent === hasAmount) {
    return { ok: false, error: 'Provide exactly one of percent_off or amount_off_cents' };
  }

  let percentOff: number | null = null;
  let amountOffCents: number | null = null;
  if (hasPercent) {
    const p = Number(body.percent_off);
    if (!Number.isInteger(p) || p < 1 || p > 100) {
      return { ok: false, error: 'percent_off must be an integer from 1 to 100' };
    }
    percentOff = p;
  } else {
    const a = Number(body.amount_off_cents);
    if (!Number.isInteger(a) || a <= 0) {
      return { ok: false, error: 'amount_off_cents must be a positive integer' };
    }
    amountOffCents = a;
  }

  const duration = body.duration as Duration;
  if (!VALID_DURATIONS.includes(duration)) {
    return { ok: false, error: "duration must be 'once', 'repeating', or 'forever'" };
  }

  let durationInMonths: number | null = null;
  if (duration === 'repeating') {
    const m = Number(body.duration_in_months);
    if (!Number.isInteger(m) || m < 1 || m > 60) {
      return { ok: false, error: 'duration_in_months is required for repeating coupons (1-60)' };
    }
    durationInMonths = m;
  }

  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : null;

  return { ok: true, values: { name, percentOff, amountOffCents, duration, durationInMonths, note } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const rlKey = getRateLimitKey(req, 'create-admin-coupon');
  if (!checkRateLimit(rlKey, 60, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ error: 'Supabase env not configured' }, 500);
  }

  // --- Admin gate: caller JWT -> userClient.rpc('is_admin') ---
  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) return json({ error: 'unauthorized' }, 401);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  if (!userRes?.user) return json({ error: 'unauthorized' }, 401);
  const { data: isAdminRes } = await userClient.rpc('is_admin');
  if (!isAdminRes) return json({ error: 'forbidden' }, 403);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) return json({ error: 'STRIPE_SECRET_KEY not configured' }, 500);
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

  try {
    const body = await req.json();
    const action = body.action as string;

    if (action === 'create') {
      const v = validateCreate(body);
      if (!v.ok) return json({ error: v.error }, 400);
      const { name, percentOff, amountOffCents, duration, durationInMonths, note } = v.values;

      const couponParams: Stripe.CouponCreateParams = {
        duration,
        name,
        metadata: { created_by: 'admin', note: note ?? '' },
      };
      if (percentOff !== null) couponParams.percent_off = percentOff;
      else couponParams.amount_off = amountOffCents!;
      if (duration === 'repeating') couponParams.duration_in_months = durationInMonths!;

      const coupon = await stripe.coupons.create(couponParams);

      const { data: row, error: insertErr } = await admin
        .from('admin_coupons')
        .insert({
          stripe_coupon_id: coupon.id,
          name,
          percent_off: percentOff,
          amount_off_cents: amountOffCents,
          duration,
          duration_in_months: durationInMonths,
          note,
        })
        .select('*')
        .single();
      if (insertErr) {
        console.error('[create-admin-coupon] admin_coupons insert failed:', insertErr);
        return json({ error: 'Coupon created in Stripe but failed to save: ' + insertErr.message }, 500);
      }

      console.log('[create-admin-coupon] created coupon:', {
        id: coupon.id, name, percentOff, amountOffCents, duration, durationInMonths,
      });
      return json({ ok: true, coupon: row });
    }

    if (action === 'list') {
      const { data, error } = await admin
        .from('admin_coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, coupons: data ?? [] });
    }

    if (action === 'make_link') {
      const couponId = body.coupon_id;
      if (!couponId || typeof couponId !== 'string') {
        return json({ error: 'coupon_id (admin_coupons id) is required' }, 400);
      }
      const { data: couponRow, error: rowErr } = await admin
        .from('admin_coupons')
        .select('id, stripe_coupon_id, name')
        .eq('id', couponId)
        .maybeSingle();
      if (rowErr || !couponRow) return json({ error: 'Discount not found' }, 404);

      // Resolve the price: explicit price_id wins, otherwise plan_key.
      let priceId: string | null = typeof body.price_id === 'string' && body.price_id ? body.price_id : null;
      let planKey: string | null = null;
      if (!priceId) {
        planKey = typeof body.plan_key === 'string' ? body.plan_key : 'venue';
        const cfg = PLAN_CONFIG[planKey];
        if (!cfg) return json({ error: "plan_key must be 'solo' or 'venue'" }, 400);
        const productId = await findOrCreateProduct(stripe, 'tapaway_plan', planKey, cfg.productName);
        priceId = await findOrCreatePrice(stripe, productId, cfg.amount);
      }

      const email = body.customer_email;
      if (email !== undefined && email !== null && email !== '' && !validateEmail(email)) {
        return json({ error: 'Invalid customer_email format' }, 400);
      }

      const origin = req.headers.get('origin') || 'https://tapaway.co';
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        discounts: [{ coupon: couponRow.stripe_coupon_id }],
        success_url: `${origin}/onboarding?session_id={CHECKOUT_SESSION_ID}&source=stripe&admin_discount=${couponRow.id}`,
        cancel_url: `${origin}/`,
        metadata: {
          admin_coupon_id: couponRow.id,
          created_by: 'admin',
        },
      };
      if (email) sessionParams.customer_email = email;

      const session = await stripe.checkout.sessions.create(sessionParams);
      console.log('[create-admin-coupon] discount link created:', {
        sessionId: session.id, coupon: couponRow.stripe_coupon_id, plan: planKey ?? priceId,
      });
      return json({ ok: true, url: session.url, sessionId: session.id });
    }

    if (action === 'archive') {
      const couponId = body.coupon_id;
      if (!couponId || typeof couponId !== 'string') {
        return json({ error: 'coupon_id (admin_coupons id) is required' }, 400);
      }
      const { data: couponRow, error: rowErr } = await admin
        .from('admin_coupons')
        .select('id, stripe_coupon_id, name')
        .eq('id', couponId)
        .maybeSingle();
      if (rowErr || !couponRow) return json({ error: 'Discount not found' }, 404);

      // Best-effort Stripe delete: the coupon may already be gone in the
      // Stripe dashboard — still remove our row so it can't be handed out
      // for new pay links. Subscriptions created from earlier links keep
      // working regardless.
      try {
        await stripe.coupons.del(couponRow.stripe_coupon_id);
      } catch (stripeErr) {
        console.warn(
          '[create-admin-coupon] Stripe coupon delete failed (continuing anyway):',
          (stripeErr as Error).message,
        );
      }

      const { error: delErr } = await admin.from('admin_coupons').delete().eq('id', couponId);
      if (delErr) return json({ error: 'Could not archive discount: ' + delErr.message }, 500);
      console.log('[create-admin-coupon] archived coupon:', { id: couponId, name: couponRow.name });
      return json({ ok: true, archived: couponId });
    }

    return json({ error: "action must be 'create', 'list', 'archive', or 'make_link'" }, 400);
  } catch (e) {
    console.error('[create-admin-coupon] Error:', e);
    return json({ error: (e as Error).message }, 500);
  }
});
