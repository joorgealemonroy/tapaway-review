// send-payment-recovery — one-tap payment-recovery nudge for Jorge.
//
// Locked decision 2026-09-09: on a past-due client's admin view, one tap sends
// the canonical `payment_failed` email template with a Stripe billing-portal
// link (so the client can fix their card in 30 seconds), plus the SMS
// equivalent when the client has a phone on file. Recovering a failed payment
// should be as frictionless as possible — Jorge once messaged a past-due
// client manually and they paid immediately.
//
// Request (admin JWT required): { account_id, kind: 'restaurant' | 'personal' }
//
// What it does:
//   1. Loads the account (email, name, phone, stripe_customer_id, status).
//   2. Refuses gifted accounts (payment_state='complimentary') — those never
//      get chased. Requires a stripe_customer_id (portal session needs it).
//   3. Creates a Stripe billing-portal session for the customer.
//   4. Sends the canonical `payment_failed` template with the portal URL as
//      the CTA ("Update my card") — logged to email_sends like other sends.
//   5. If a phone is on file, sends a short SMS with the same link via the
//      Twilio connector gateway (same path as trial-followup / send-mass-sms).
//
// Response: { email: { ok, skipped? }, sms: { ok, skipped? } }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { requireUser, adminClient, isAdmin, jsonResponse } from "../_shared/security.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";
import { sendTemplatedEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

type ResolvedAccount = {
  email: string | null;
  name: string;
  phone: string | null;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  profileId: string | null;
};

async function resolveAccount(
  admin: ReturnType<typeof adminClient>,
  accountId: string,
  kind: string,
): Promise<{ account?: ResolvedAccount; error?: string }> {
  if (kind === "restaurant") {
    const { data, error } = await admin
      .from("restaurants")
      .select("id, email, owner_name, restaurant_name, phone, owner_phone, stripe_customer_id, subscription_status, payment_state")
      .eq("id", accountId)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "Account not found." };
    if ((data as { payment_state?: string }).payment_state === "complimentary") {
      return { error: "This is a complimentary (gifted) account — never chased." };
    }
    return {
      account: {
        email: data.email,
        name: data.owner_name || data.restaurant_name || "friend",
        phone: data.phone || data.owner_phone || null,
        stripeCustomerId: data.stripe_customer_id,
        subscriptionStatus: data.subscription_status,
        profileId: null,
      },
    };
  }
  if (kind === "personal") {
    const { data, error } = await admin
      .from("personal_profiles")
      .select("id, email, stripe_billing_email, full_name, username, contact_phone, stripe_customer_id, subscription_status, payment_state")
      .eq("id", accountId)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "Account not found." };
    // payment_state on personal_profiles exists after migration
    // 20260909320000_personal_payment_state.sql (applied before this function
    // is deployed) — complimentary (gifted) Solo accounts are never chased.
    const row = data as Record<string, unknown>;
    if (row.payment_state === "complimentary") {
      return { error: "This is a complimentary (gifted) account — never chased." };
    }
    return {
      account: {
        email: (row.stripe_billing_email as string | null) || (row.email as string | null),
        name: (row.full_name as string) || (row.username as string) || "friend",
        phone: (row.contact_phone as string | null) || null,
        stripeCustomerId: row.stripe_customer_id as string | null,
        subscriptionStatus: row.subscription_status as string | null,
        profileId: row.id as string,
      },
    };
  }
  return { error: "kind must be 'restaurant' or 'personal'." };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);

  const rlKey = getRateLimitKey(req, "send-payment-recovery");
  if (!checkRateLimit(rlKey, 30, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const auth = await requireUser(req);
    if (!auth) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    if (!(await isAdmin(auth.user.id))) return jsonResponse({ error: "Admin only" }, 403, corsHeaders);

    const { account_id, kind } = await req.json().catch(() => ({}));
    if (!account_id || typeof account_id !== "string" || !UUID_RE.test(account_id)) {
      return jsonResponse({ error: "Valid account_id required." }, 400, corsHeaders);
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const admin = adminClient();
    const { account, error: resolveErr } = await resolveAccount(admin, account_id, kind);
    if (!account) return jsonResponse({ error: resolveErr || "Account not found." }, 400, corsHeaders);
    if (!account.stripeCustomerId) {
      return jsonResponse({ error: "No Stripe customer on this account — can't make a billing link." }, 400, corsHeaders);
    }

    // Billing-portal session: the 30-second fix link.
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    const returnUrl = Deno.env.get("STRIPE_PORTAL_RETURN_URL") || "https://tapaway.co/dashboard";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: returnUrl,
    });
    const portalUrl = portalSession.url;

    // 1. Email — canonical payment_failed template; the portal URL is the
    //    "Update my card" CTA. Logged to email_sends by sendTemplatedEmail.
    let emailResult: { ok: boolean; skipped?: string; error?: string } = { ok: false, skipped: "no email on file" };
    if (account.email) {
      const sent = await sendTemplatedEmail({
        to: account.email,
        templateKey: "payment_failed",
        vars: {
          name: account.name,
          dashboardUrl: portalUrl, // CTA points at the billing portal
        },
        profileId: account.profileId || null,
      });
      emailResult = sent.ok ? { ok: true } : { ok: false, error: sent.error || "send failed" };
    }

    // 2. SMS — only when a phone is on file. Same Twilio connector gateway
    //    used by trial-followup / send-mass-sms.
    let smsResult: { ok: boolean; skipped?: string; error?: string } = { ok: false, skipped: "no phone on file" };
    if (account.phone) {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      const twilioKey = Deno.env.get("TWILIO_API_KEY");
      const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");
      if (!lovableKey || !twilioKey || !twilioFrom) {
        smsResult = { ok: false, skipped: "Twilio not connected" };
      } else {
        const body = `TapAway: your card didn't go through — update it here in 30 seconds: ${portalUrl}`;
        try {
          const res = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": twilioKey,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ To: account.phone, From: twilioFrom, Body: body }),
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Twilio HTTP ${res.status}: ${txt.slice(0, 200)}`);
          }
          smsResult = { ok: true };
        } catch (e) {
          smsResult = { ok: false, error: e instanceof Error ? e.message : "SMS send failed" };
        }
      }
    }

    console.log("[send-payment-recovery] nudge result:", {
      account_id,
      kind,
      status: account.subscriptionStatus,
      email: emailResult,
      sms: smsResult,
    });

    return jsonResponse({ email: emailResult, sms: smsResult, portal_url: portalUrl }, 200, corsHeaders);
  } catch (error) {
    console.error("[send-payment-recovery] Error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
      corsHeaders,
    );
  }
});
