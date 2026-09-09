// Custom Plan Builder (admin-only).
//
// Lets Jorge create a custom-priced RECURRING plan on the spot
// (e.g. 400 cards at a custom monthly price) and hand the customer a
// reusable Stripe Payment Link right from his phone.
//
// Actions (body: { action }):
//   - create:   { name, amount_cents, description?, trial_days? }
//               find-or-create Stripe product (metadata tapaway_custom_plan)
//               -> find-or-create recurring monthly USD price on it
//               -> insert into public.custom_plans -> returns { plan, reused }
//   - list:     returns { plans } newest first (active first, then deactivated)
//   - make_link:{ plan_id } -> stripe.paymentLinks.create -> returns { url }
//               (refuses deactivated plans)
//   - update:   { plan_id, name?, description?, amount_cents?, trial_days? }
//               edits the DB row; a price change mints a NEW Stripe recurring
//               price (Stripe prices are immutable) and re-points the row;
//               name/description also update the Stripe product for consistency
//   - deactivate: { plan_id } -> sets is_active=false AND archives the Stripe
//               product, so old payment links stop working. Existing
//               subscriptions keep billing (archiving never cancels them).
//
// Hard rules honored: subscription-recurring only (no one-time sales, no
// activation fees), everything behind the is_admin() gate, rate limited.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanity caps: catch typos (e.g. an extra zero) before they reach Stripe.
const MAX_AMOUNT_CENTS = 1_000_000; // $10,000/mo
const MAX_TRIAL_DAYS = 90;
const MAX_NAME_LEN = 120;
const MAX_DESC_LEN = 500;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Escape LIKE wildcards so ilike() is an exact (case-insensitive) match. */
function escapeIlike(s: string): string {
  return s.replace(/([%_\\])/g, '\\$1');
}

/** Find or create a Stripe product for a custom plan (reused pattern from
 *  create-checkout-session, keyed on the tapaway_custom_plan metadata key). */
async function findOrCreateCustomProduct(stripe: Stripe, name: string, description: string): Promise<string> {
  const found = await stripe.products.search({
    query: `metadata["tapaway_custom_plan"]:"true"`,
    limit: 100,
  });
  const match = found.data.find((p) => p.name === name);
  if (match) return match.id;

  const product = await stripe.products.create({
    name,
    description: description || undefined,
    metadata: { tapaway_custom_plan: 'true', created_by: 'admin' },
  });
  return product.id;
}

/** Find or create a recurring monthly USD per-unit price on a product. */
async function findOrCreateCustomPrice(stripe: Stripe, productId: string, unitAmount: number): Promise<string> {
  const prices = await stripe.prices.list({
    product: productId,
    type: 'recurring',
    active: true,
    limit: 100,
  });
  const match = prices.data.find(
    (p: any) => p.unit_amount === unitAmount && p.currency === 'usd' && p.recurring?.interval === 'month',
  );
  if (match) return match.id;

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: 'usd',
    billing_scheme: 'per_unit',
    recurring: { interval: 'month' },
  });
  return price.id;
}

type ValidatedCreate = {
  name: string;
  amount_cents: number;
  description: string;
  trial_days: number;
};

function validateCreate(body: any): { ok: true; value: ValidatedCreate } | { ok: false; error: string } {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return { ok: false, error: 'Plan name is required.' };
  if (name.length > MAX_NAME_LEN) return { ok: false, error: `Plan name must be ${MAX_NAME_LEN} characters or fewer.` };

  const raw = body.amount_cents;
  const amount_cents =
    typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? parseInt(raw.trim(), 10) : raw;
  if (typeof amount_cents !== 'number' || !Number.isInteger(amount_cents)) {
    return { ok: false, error: 'Monthly price must be a whole number of cents.' };
  }
  if (amount_cents <= 0) return { ok: false, error: 'Monthly price must be greater than $0.' };
  if (amount_cents > MAX_AMOUNT_CENTS) {
    return { ok: false, error: 'Monthly price looks too high (max $10,000/mo) — check for a typo.' };
  }

  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (description.length > MAX_DESC_LEN) {
    return { ok: false, error: `Description must be ${MAX_DESC_LEN} characters or fewer.` };
  }

  let trial_days = 0; // default OFF — in-person closes charge immediately
  if (body.trial_days !== undefined && body.trial_days !== null && body.trial_days !== '') {
    trial_days = Number(body.trial_days);
    if (!Number.isInteger(trial_days) || trial_days < 0 || trial_days > MAX_TRIAL_DAYS) {
      return { ok: false, error: `Trial must be between 0 and ${MAX_TRIAL_DAYS} days.` };
    }
  }

  return { ok: true, value: { name, amount_cents, description, trial_days } };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const rlKey = getRateLimitKey(req, 'create-custom-plan');
  if (!checkRateLimit(rlKey, 30, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ---- Admin gate (required for every action) ----
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Admin authentication required.' }, 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return json({ error: 'Admin authentication required.' }, 401);
    const { data: isAdminRes } = await userClient.rpc('is_admin');
    if (!isAdminRes) return json({ error: 'Admin access required.' }, 403);

    // Service-role client for Stripe lookups and DB writes.
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) throw new Error('STRIPE_SECRET_KEY not configured');
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ---------------- list ----------------
    if (action === 'list') {
      const { data, error } = await admin
        .from('custom_plans')
        .select('*')
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      if (error) throw error;
      return json({ plans: data ?? [] });
    }

    // ---------------- make_link ----------------
    if (action === 'make_link') {
      const planId = body.plan_id;
      if (!planId || typeof planId !== 'string' || !UUID_RE.test(planId)) {
        return json({ error: 'Valid plan_id required.' }, 400);
      }
      const { data: plan, error } = await admin
        .from('custom_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();
      if (error) throw error;
      if (!plan) return json({ error: 'Plan not found.' }, 404);
      if (plan.is_active === false) {
        return json({ error: 'This plan is deactivated — reactivate or create a new plan.' }, 410);
      }

      // Payment Links accept recurring prices and are reusable — perfect
      // for handing a pay link to a customer on the spot.
      const link = await stripe.paymentLinks.create({
        line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
        ...(plan.trial_days > 0
          ? { subscription_data: { trial_period_days: plan.trial_days } }
          : {}),
        metadata: { tapaway_custom_plan: 'true', custom_plan_id: plan.id },
      });
      console.log('[create-custom-plan] Payment link created:', { plan: plan.name, linkId: link.id });
      return json({ url: link.url });
    }

    // ---------------- create ----------------
    if (action === 'create') {
      const validation = validateCreate(body);
      if (!validation.ok) return json({ error: validation.error }, 400);
      const { name, amount_cents, description, trial_days } = validation.value;

      // Idempotent on name (case-insensitive): a double-tap or accidental
      // re-submit returns the existing plan without touching Stripe.
      const { data: existing, error: existingErr } = await admin
        .from('custom_plans')
        .select('*')
        .ilike('name', escapeIlike(name))
        .limit(1)
        .maybeSingle();
      if (existingErr) throw existingErr;
      if (existing) return json({ plan: existing, reused: true });

      const productId = await findOrCreateCustomProduct(stripe, name, description);
      const priceId = await findOrCreateCustomPrice(stripe, productId, amount_cents);

      const { data: inserted, error: insertErr } = await admin
        .from('custom_plans')
        .insert({
          name,
          description: description || null,
          amount_cents,
          stripe_product_id: productId,
          stripe_price_id: priceId,
          trial_days,
        })
        .select()
        .single();

      if (insertErr) {
        // Lost a race with a concurrent create of the same name (unique
        // index on lower(name)): return the winner instead of failing.
        if ((insertErr as any).code === '23505') {
          const { data: winner } = await admin
            .from('custom_plans')
            .select('*')
            .ilike('name', escapeIlike(name))
            .limit(1)
            .maybeSingle();
          if (winner) return json({ plan: winner, reused: true });
        }
        throw insertErr;
      }

      console.log('[create-custom-plan] Created:', { name, amount_cents, trial_days });
      return json({ plan: inserted, reused: false });
    }

    // ---------------- deactivate ----------------
    // Deactivate: sets is_active=false AND archives the Stripe product, so
    // previously generated reusable payment links stop working — deactivating
    // Jorge's side must actually stop sales, not just hide the row.
    // Existing subscriptions keep billing: archiving a product/price does not
    // cancel subscriptions that already reference them.
    if (action === 'deactivate') {
      const planId = body.plan_id;
      if (!planId || typeof planId !== 'string' || !UUID_RE.test(planId)) {
        return json({ error: 'Valid plan_id required.' }, 400);
      }
      const { data: plan, error } = await admin
        .from('custom_plans')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', planId)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!plan) return json({ error: 'Plan not found.' }, 404);
      if (plan.stripe_product_id) {
        try {
          await stripe.products.update(plan.stripe_product_id, { active: false });
        } catch (stripeErr) {
          console.error('[create-custom-plan] Stripe product archive failed (non-fatal):', stripeErr);
        }
      }
      console.log('[create-custom-plan] Deactivated:', { name: plan.name, id: plan.id });
      return json({ plan });
    }

    // ---------------- update ----------------
    // Edit name / description / price / trial. Stripe prices are immutable,
    // so a price change mints a NEW recurring price and re-points the row;
    // name/description also update the Stripe product for consistency.
    if (action === 'update') {
      const planId = body.plan_id;
      if (!planId || typeof planId !== 'string' || !UUID_RE.test(planId)) {
        return json({ error: 'Valid plan_id required.' }, 400);
      }
      const { data: plan, error: planErr } = await admin
        .from('custom_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();
      if (planErr) throw planErr;
      if (!plan) return json({ error: 'Plan not found.' }, 404);

      const patch: Record<string, unknown> = {};

      // Name (unique, case-insensitive, excluding self)
      if (body.name !== undefined) {
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name) return json({ error: 'Plan name is required.' }, 400);
        if (name.length > MAX_NAME_LEN) {
          return json({ error: `Plan name must be ${MAX_NAME_LEN} characters or fewer.` }, 400);
        }
        if (name.toLowerCase() !== String(plan.name).toLowerCase()) {
          const { data: clash } = await admin
            .from('custom_plans')
            .select('id')
            .ilike('name', escapeIlike(name))
            .neq('id', planId)
            .limit(1)
            .maybeSingle();
          if (clash) return json({ error: 'Another plan already uses that name.' }, 409);
          patch.name = name;
        }
      }

      // Description
      if (body.description !== undefined) {
        const description = typeof body.description === 'string' ? body.description.trim() : '';
        if (description.length > MAX_DESC_LEN) {
          return json({ error: `Description must be ${MAX_DESC_LEN} characters or fewer.` }, 400);
        }
        patch.description = description || null;
      }

      // Trial days
      if (body.trial_days !== undefined && body.trial_days !== null && body.trial_days !== '') {
        const trial_days = Number(body.trial_days);
        if (!Number.isInteger(trial_days) || trial_days < 0 || trial_days > MAX_TRIAL_DAYS) {
          return json({ error: `Trial must be between 0 and ${MAX_TRIAL_DAYS} days.` }, 400);
        }
        patch.trial_days = trial_days;
      }

      // Price: mint a NEW recurring Stripe price (immutable), re-point the row.
      if (body.amount_cents !== undefined && body.amount_cents !== null && body.amount_cents !== '') {
        const raw = body.amount_cents;
        const amount_cents =
          typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? parseInt(raw.trim(), 10) : raw;
        if (typeof amount_cents !== 'number' || !Number.isInteger(amount_cents)) {
          return json({ error: 'Monthly price must be a whole number of cents.' }, 400);
        }
        if (amount_cents <= 0) return json({ error: 'Monthly price must be greater than $0.' }, 400);
        if (amount_cents > MAX_AMOUNT_CENTS) {
          return json({ error: 'Monthly price looks too high (max $10,000/mo) — check for a typo.' }, 400);
        }
        if (amount_cents !== plan.amount_cents) {
          const priceId = await findOrCreateCustomPrice(stripe, plan.stripe_product_id, amount_cents);
          patch.amount_cents = amount_cents;
          patch.stripe_price_id = priceId;
          // Deactivate the OLD price so old payment links can't keep selling
          // at the former rate. Existing subscriptions are unaffected —
          // deactivating a price never cancels subscriptions referencing it.
          if (plan.stripe_price_id && plan.stripe_price_id !== priceId) {
            try {
              await stripe.prices.update(plan.stripe_price_id, { active: false });
            } catch (stripeErr) {
              console.error('[create-custom-plan] Old Stripe price deactivation failed (non-fatal):', stripeErr);
            }
          }
        }
      }

      if (Object.keys(patch).length === 0) {
        return json({ plan, unchanged: true });
      }

      // Keep the Stripe product's display consistent with the DB row.
      try {
        await stripe.products.update(plan.stripe_product_id, {
          name: (patch.name as string) ?? plan.name,
          description: ((patch.description as string | null) ?? plan.description) || undefined,
        });
      } catch (stripeErr) {
        console.error('[create-custom-plan] Stripe product update failed (non-fatal):', stripeErr);
      }

      patch.updated_at = new Date().toISOString();
      const { data: updated, error: updErr } = await admin
        .from('custom_plans')
        .update(patch)
        .eq('id', planId)
        .select()
        .single();
      if (updErr) {
        // Name race: someone else took the name concurrently.
        if ((updErr as any).code === '23505') {
          return json({ error: 'Another plan already uses that name.' }, 409);
        }
        throw updErr;
      }
      console.log('[create-custom-plan] Updated:', { id: planId, patch: Object.keys(patch) });
      return json({ plan: updated });
    }

    return json({ error: 'Unknown action. Use create, list, make_link, update, or deactivate.' }, 400);
  } catch (error) {
    console.error('[create-custom-plan] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return json({ error: errorMessage }, 500);
  }
});
