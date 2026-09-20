// reconcile-expired-trials: pg_cron-driven (daily) reconciliation of trials
// whose trial_ends_at passed but whose local subscription_status never moved
// off 'trialing' (missed Stripe webhooks, subscriptions deleted in the Stripe
// dashboard, or trials with no billing relationship at all).
//
// Auth: service-role bearer only (pg_cron supplies it from Vault).
// For rows WITH a stripe_subscription_id, Stripe is the source of truth.
// For rows WITHOUT one, the trial expired unconverted -> past_due.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { hasServiceRoleBearer } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function mapStripeStatus(s: string): string {
  switch (s) {
    case 'active': return 'active';
    case 'trialing': return 'trialing';
    case 'past_due': return 'past_due';
    case 'unpaid': return 'unpaid';
    default: return 'canceled'; // canceled, incomplete, incomplete_expired, paused
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!hasServiceRoleBearer(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
  });

  const admin = await import('https://esm.sh/@supabase/supabase-js@2.39.7').then(
    mod => mod.createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
  );

  // 1-day grace: don't churn accounts the day their trial lapses while Stripe
  // events may still be in flight.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const results: { checked: number; updated: number; errors: string[] } = {
    checked: 0,
    updated: 0,
    errors: [],
  };

  for (const table of ['restaurants', 'personal_profiles'] as const) {
    const { data: rows, error } = await admin
      .from(table)
      .select('id, stripe_subscription_id')
      .eq('subscription_status', 'trialing')
      .lt('trial_ends_at', cutoff);

    if (error) {
      results.errors.push(`${table}: ${error.message}`);
      continue;
    }

    for (const row of rows ?? []) {
      results.checked++;
      let next: string | null = null;

      if (row.stripe_subscription_id) {
        try {
          const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
          next = mapStripeStatus(sub.status);
        } catch {
          // Subscription gone in Stripe (deleted without webhook delivery).
          next = 'canceled';
        }
      } else {
        // Trial expired with no billing relationship: never converted.
        next = 'past_due';
      }

      if (next && next !== 'trialing') {
        const { error: updErr } = await admin
          .from(table)
          .update({ subscription_status: next })
          .eq('id', row.id)
          .eq('subscription_status', 'trialing'); // re-check: webhook may have beaten us
        if (updErr) {
          results.errors.push(`${table}:${row.id}: ${updErr.message}`);
        } else {
          results.updated++;
          console.log(`[reconcile-expired-trials] ${table} ${row.id} -> ${next}`);
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, ...results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
