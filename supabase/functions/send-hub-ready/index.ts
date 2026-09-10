// send-hub-ready — one-tap "your hub is ready" notification for Jorge.
//
// Fulfills the signup promise: "We'll send you a text and an email the
// moment your hub is ready." Jorge taps one button in the admin when he
// finishes building a hub; the client gets both versions automatically.
//
// Request (admin JWT required): { account_id, kind: 'restaurant' | 'personal' }
//
// What it does:
//   1. Loads the account (email, name, phone, username/slug).
//   2. Sends the `hub_ready` email template with the hub link CTA —
//      logged to email_sends like other sends.
//   3. If a phone is on file, sends the short SMS version via the Twilio
//      connector gateway (same path as trial-followup / send-mass-sms /
//      send-payment-recovery).
//   4. Stamps the profile so the admin shows it was sent (and repeat taps
//      warn instead of spamming).
//
// Response: { email: { ok, skipped? }, sms: { ok, skipped? }, hub_url }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser, adminClient, isAdmin, jsonResponse } from "../_shared/security.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";
import { sendTemplatedEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";
const SITE_URL = "https://tapaway.co";

type ResolvedAccount = {
  email: string | null;
  name: string;
  phone: string | null;
  username: string | null;
  profileId: string | null;
  alreadyNotifiedAt: string | null;
};

async function resolveAccount(
  admin: ReturnType<typeof adminClient>,
  accountId: string,
  kind: string,
): Promise<{ account?: ResolvedAccount; error?: string }> {
  if (kind === "restaurant") {
    const { data, error } = await admin
      .from("restaurants")
      .select("id, email, owner_name, restaurant_name, phone, owner_phone, custom_slug, hub_ready_notified_at")
      .eq("id", accountId)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "Account not found." };
    const row = data as Record<string, unknown>;
    const slug = (row.custom_slug as string | null) || null;
    return {
      account: {
        email: (row.email as string | null) || null,
        name: (row.owner_name as string) || (row.restaurant_name as string) || "friend",
        phone: (row.phone as string | null) || (row.owner_phone as string | null) || null,
        username: slug,
        profileId: null,
        alreadyNotifiedAt: (row.hub_ready_notified_at as string | null) || null,
      },
    };
  }
  if (kind === "personal") {
    const { data, error } = await admin
      .from("personal_profiles")
      .select("id, email, stripe_billing_email, full_name, username, billing_phone, contact_phone, hub_ready_notified_at")
      .eq("id", accountId)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "Account not found." };
    const row = data as Record<string, unknown>;
    return {
      account: {
        email: (row.stripe_billing_email as string | null) || (row.email as string | null) || null,
        name: (row.full_name as string) || (row.username as string) || "friend",
        phone: (row.billing_phone as string | null) || (row.contact_phone as string | null) || null,
        username: (row.username as string | null) || null,
        profileId: row.id as string,
        alreadyNotifiedAt: (row.hub_ready_notified_at as string | null) || null,
      },
    };
  }
  return { error: "kind must be 'restaurant' or 'personal'." };
}

async function stampNotified(
  admin: ReturnType<typeof adminClient>,
  account: ResolvedAccount,
  kind: string,
  accountId: string,
): Promise<void> {
  const now = new Date().toISOString();
  try {
    if (kind === "personal" && account.profileId) {
      await admin.from("personal_profiles").update({ hub_ready_notified_at: now }).eq("id", account.profileId);
    } else if (kind === "restaurant") {
      await admin.from("restaurants").update({ hub_ready_notified_at: now }).eq("id", accountId);
    }
  } catch (e) {
    // Best-effort: the notifications already went out. Log and move on.
    console.error("[send-hub-ready] failed to stamp hub_ready_notified_at:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);

  const rlKey = getRateLimitKey(req, "send-hub-ready");
  if (!checkRateLimit(rlKey, 30, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const auth = await requireUser(req);
    if (!auth) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    if (!(await isAdmin(auth.user.id))) return jsonResponse({ error: "Admin only" }, 403, corsHeaders);

    const { account_id, kind, force } = await req.json().catch(() => ({}));
    if (!account_id || typeof account_id !== "string" || !UUID_RE.test(account_id)) {
      return jsonResponse({ error: "Valid account_id required." }, 400, corsHeaders);
    }
    if (kind !== "restaurant" && kind !== "personal") {
      return jsonResponse({ error: "kind must be 'restaurant' or 'personal'." }, 400, corsHeaders);
    }

    const admin = adminClient();
    const { account, error: resolveErr } = await resolveAccount(admin, account_id, kind);
    if (!account) return jsonResponse({ error: resolveErr || "Account not found." }, 400, corsHeaders);
    if (account.alreadyNotifiedAt && !force) {
      return jsonResponse(
        {
          error: `Already sent on ${new Date(account.alreadyNotifiedAt).toLocaleDateString()}. Pass force:true to resend.`,
          already_sent_at: account.alreadyNotifiedAt,
        },
        409,
        corsHeaders,
      );
    }

    const hubUrl = account.username ? `${SITE_URL}/${account.username}` : SITE_URL;

    // 1. Email — the full "your hub is ready" version.
    let emailResult: { ok: boolean; skipped?: string; error?: string } = { ok: false, skipped: "no email on file" };
    if (account.email) {
      const sent = await sendTemplatedEmail({
        to: account.email,
        templateKey: "hub_ready",
        vars: {
          name: account.name,
          username: account.username || "",
          hubUrl,
        },
        profileId: account.profileId,
      });
      emailResult = sent.ok ? { ok: true } : { ok: false, error: sent.error || "send failed" };
    }

    // 2. SMS — the short version. Only when a phone is on file.
    // Keep it to one segment (~160 chars): name, news, link, sign-off.
    let smsResult: { ok: boolean; skipped?: string; error?: string } = { ok: false, skipped: "no phone on file" };
    if (account.phone) {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      const twilioKey = Deno.env.get("TWILIO_API_KEY");
      const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");
      if (!lovableKey || !twilioKey || !twilioFrom) {
        smsResult = { ok: false, skipped: "Twilio not connected" };
      } else {
        const body = `TapAway: Hey ${account.name}, your hub is ready! 🎉 See it here: ${hubUrl} — your cards are on the way.`;
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

    // 3. Stamp so repeat taps warn instead of double-sending.
    if (emailResult.ok || smsResult.ok) {
      await stampNotified(admin, account, kind, account_id);
    }

    console.log("[send-hub-ready] result:", {
      account_id,
      kind,
      hub_url: hubUrl,
      email: emailResult,
      sms: smsResult,
    });

    return jsonResponse(
      { email: emailResult, sms: smsResult, hub_url: hubUrl },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error("[send-hub-ready] Error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
      corsHeaders,
    );
  }
});
