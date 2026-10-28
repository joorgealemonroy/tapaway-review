import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@22.6.0";
import { subscriptionRunRate } from "../_shared/adminBilling.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(
      (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""),
    );
    if (error || !user) return json({ error: "Unauthorized" }, 401);
    const { data: allowed } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!allowed) return json({ error: "Forbidden" }, 403);
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey)
      return json({ error: "Billing connection unavailable" }, 503);
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2026-08-26.dahlia",
      timeout: 15000,
      maxNetworkRetries: 1,
    });
    let mrr = 0,
      pastDueMrr = 0,
      active = 0,
      trialing = 0,
      pastDue = 0,
      excluded = 0;
    const trials: Array<{ name: string; ends_at: string }> = [];
    const seen = new Set<string>();
    for await (const sub of stripe.subscriptions.list({
      status: "all",
      limit: 100,
    })) {
      if (!sub.livemode || seen.has(sub.id)) continue;
      seen.add(sub.id);
      if (sub.status === "trialing") {
        trialing++;
        if (
          sub.trial_end &&
          sub.trial_end * 1000 > Date.now() &&
          sub.trial_end * 1000 < Date.now() + 3 * 86400000
        )
          trials.push({
            name: "Stripe trial",
            ends_at: new Date(sub.trial_end * 1000).toISOString(),
          });
        continue;
      }
      const value = subscriptionRunRate(sub);
      if (value.excluded) {
        excluded++;
        continue;
      }
      if (sub.status === "active" && value.cents > 0) {
        active++;
        mrr += value.cents;
      }
      if (sub.status === "past_due") {
        pastDue++;
        pastDueMrr += value.cents;
      }
    }
    return json({
      mrr_cents: Math.round(mrr),
      active_count: active,
      trialing_count: trialing,
      past_due_count: pastDue,
      past_due_mrr_cents: Math.round(pastDueMrr),
      excluded_count: excluded,
      trials_ending: trials,
      updated_at: new Date().toISOString(),
      methodology:
        "Active fixed-price USD subscriptions at their actual Stripe prices, normalized monthly. Trials, paused collection, overdue subscriptions and one-time card purchases are excluded. Discounted, metered, tiered and non-USD subscriptions are excluded and flagged for review. This conservative run rate is not cash collected or Stripe’s configured MRR report.",
    });
  } catch (e) {
    console.error(
      "admin-billing-summary",
      e instanceof Error ? e.message : "failed",
    );
    return json({ error: "Billing couldn’t refresh. Please retry." }, 503);
  }
});
