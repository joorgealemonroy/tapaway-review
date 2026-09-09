// trial-ending-email — sends the day-11 trial-ending email (3 days left).
//
// Fired by pg_cron daily (see migration 20260909251000_email_triggers.sql).
// Staggered deliberately against the trial-followup SMS sequence (days 3, 10,
// 13): the SMS angles are usage/urgency; THIS email is billing-focused —
// "here's exactly what happens on day 14" (charge date + amount, how to
// cancel). Email goes out on day 11 so SMS day 10 and day 13 don't collide
// with it.
//
// Targets BOTH account types:
//   personal_profiles: subscription_status='trialing', trial_ends_at::date = today+3
//   restaurants:       subscription_status='trialing', trial_ends_at::date = today+3,
//                      payment_state != 'complimentary'
// Dedup: skips any address that already got a 'sent' trial_ending in the last
// 7 days (email_sends). Amount comes from the live Stripe subscription items
// (honest number); falls back to the plan's advertised rate when Stripe can't
// be reached.
//
// Auth: internal only — Authorization: Bearer <service-role key> from the
// pg_cron job (Vault), same pattern as trial-followup.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { sendTemplatedEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = "https://tapaway.co";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatChargeDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

function formatAmount(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[trial-ending-email] misconfigured: missing Supabase env");
      return json(500, { error: "Server configuration error" });
    }

    // ---- Internal auth only (pg_cron job with the service-role key).
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token || token !== SUPABASE_SERVICE_ROLE_KEY) {
      return json(401, { error: "Unauthorized" });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const stripe = STRIPE_SECRET_KEY
      ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" })
      : null;

    // Day 11 of a 14-day trial: trial_ends_at is 3 days out.
    const now = new Date();
    const target = new Date(now.getTime() + 3 * 86400000);
    const targetDay = target.toISOString().slice(0, 10); // YYYY-MM-DD

    interface Candidate {
      profileId: string | null;
      email: string;
      name: string;
      businessName: string;
      trialEndsAt: string;
      stripeSubscriptionId: string | null;
      fallbackAmount: string | null;
    }
    const candidates: Candidate[] = [];

    // ---- Personal (Solo) trials.
    const { data: personal, error: pErr } = await admin
      .from("personal_profiles")
      .select("id, full_name, username, email, stripe_billing_email, trial_ends_at, stripe_subscription_id, plan_type")
      .eq("subscription_status", "trialing")
      .not("trial_ends_at", "is", null);
    if (pErr) {
      console.error("[trial-ending-email] personal query failed:", pErr.message);
      return json(500, { error: "Candidate query failed" });
    }
    for (const p of personal || []) {
      if (String(p.trial_ends_at).slice(0, 10) !== targetDay) continue;
      const email = String(p.stripe_billing_email || p.email || "").trim().toLowerCase();
      if (!email) continue;
      const fullName = String(p.full_name || "").trim();
      candidates.push({
        profileId: p.id,
        email,
        name: fullName.split(" ")[0] || "there",
        businessName: fullName || "your business",
        trialEndsAt: p.trial_ends_at,
        stripeSubscriptionId: p.stripe_subscription_id || null,
        fallbackAmount: p.plan_type === "yearly" ? "$199.00" : "$20.00",
      });
    }

    // ---- Legacy business trials (skip comped family accounts).
    const { data: restaurants, error: rErr } = await admin
      .from("restaurants")
      .select("id, restaurant_name, owner_name, email, trial_ends_at, stripe_subscription_id, plan_type, payment_state")
      .eq("subscription_status", "trialing")
      .neq("payment_state", "complimentary")
      .not("trial_ends_at", "is", null);
    if (rErr) {
      console.error("[trial-ending-email] restaurants query failed:", rErr.message);
      return json(500, { error: "Candidate query failed" });
    }
    for (const r of restaurants || []) {
      if (String(r.trial_ends_at).slice(0, 10) !== targetDay) continue;
      const email = String(r.email || "").trim().toLowerCase();
      if (!email) continue;
      candidates.push({
        profileId: null,
        email,
        name: String(r.owner_name || "").trim().split(" ")[0] || "there",
        businessName: String(r.restaurant_name || "your business"),
        trialEndsAt: r.trial_ends_at,
        stripeSubscriptionId: r.stripe_subscription_id || null,
        fallbackAmount: null,
      });
    }

    console.log("[trial-ending-email] day-11 candidates:", {
      targetDay,
      count: candidates.length,
    });

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const c of candidates) {
      // ---- Dedup: one trial_ending per address per 7 days.
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      const { data: prior } = await admin
        .from("email_sends")
        .select("id")
        .eq("to_email", c.email)
        .eq("template_key", "trial_ending")
        .eq("status", "sent")
        .gte("sent_at", weekAgo)
        .limit(1);
      if (prior && prior.length > 0) {
        skipped++;
        continue;
      }

      // ---- Amount: live from Stripe when possible, else the advertised rate.
      let amount: string | null = c.fallbackAmount;
      if (stripe && c.stripeSubscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(c.stripeSubscriptionId);
          const item = sub.items.data[0];
          if (item?.price?.unit_amount) {
            amount = formatAmount(item.price.unit_amount, item.price.currency || "usd");
            if (item.price.recurring?.interval === "year") amount += "/yr";
          }
        } catch (e) {
          console.error("[trial-ending-email] stripe lookup failed, using fallback:", {
            sub: c.stripeSubscriptionId,
            err: e instanceof Error ? e.message : e,
          });
        }
      }

      const result = await sendTemplatedEmail({
        to: c.email,
        templateKey: "trial_ending",
        profileId: c.profileId,
        vars: {
          name: c.name,
          businessName: c.businessName,
          chargeDate: formatChargeDate(new Date(c.trialEndsAt)),
          amount: amount || "your plan's monthly rate",
          dashboardUrl: `${SITE_URL}/dashboard`,
        },
      });
      if (result.ok) sent++;
      else {
        failed++;
        console.error("[trial-ending-email] send failed:", { email: c.email, error: result.error });
      }
    }

    return json(200, { ok: true, targetDay, sent, skipped, failed });
  } catch (err) {
    console.error("[trial-ending-email] unexpected error", err);
    return json(500, { error: err instanceof Error ? err.message : "Unknown error" });
  }
});
