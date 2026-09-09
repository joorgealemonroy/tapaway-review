// send-van-handoff — van sale password-setup handoff.
//
// After a van sale provisions (subscription starts 'active', no trial), the
// owner needs their own login for the hub. This function generates a
// single-use, expiring password-setup link via the Supabase Auth admin API
// (service role) and sends it:
//   - SMS (Twilio connector gateway) if the profile has a usable owner mobile
//   - email (Resend) as fallback, to the Stripe-verified billing email
//
// Called ONLY by:
//   a. verify-personal-checkout (internal, service-role bearer), right after
//      it provisions a van-sale profile (metadata.van_sale === 'true'); or
//   b. Jorge from /admin/van ("Resend setup link") with his admin JWT and
//      { profile_id, resend: true }.
//
// Exactly-once guarantee: path (a) atomically claims the send with
// UPDATE ... WHERE van_handoff_sent_at IS NULL before sending, so the
// 4-second poll from /admin/van can never double-text the owner. The raw
// link is NEVER logged server-side and NEVER returned to the caller —
// responses only report which channel the link went out on.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";
import { requireUser, isAdmin } from "../_shared/security.ts";
import { sendTemplatedEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Twilio connector gateway — same infra as trial-followup / send-mass-sms.
const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";
const STOP_SUFFIX = "\nReply STOP to opt out.";
const MAX_SMS_LEN = 600;
const RESET_PATH = "/auth/reset-password"; // lands on ResetPassword.tsx

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}

function maskPhone(e164: string): string {
  return e164.length > 4 ? `***-***-${e164.slice(-4)}` : "***";
}

// Normalize a casually-entered US phone ("(555) 123-4567", "555.123.4567",
// "+15551234567") to E.164. Returns null when nothing usable comes out.
function normalizeUSPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (/^\+\d{10,15}$/.test(trimmed)) return trimmed; // already E.164
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function buildSms(business: string, link: string): string {
  // Defensive cap so templates stay readable even with long names.
  const biz = business.length > 50 ? `${business.slice(0, 47)}...` : business;
  const full =
    `TapAway: Your hub for ${biz} is live! ` +
    `Create your password to manage it: ${link}${STOP_SUFFIX}`;
  if (full.length <= MAX_SMS_LEN) return full;
  // Link must stay intact; shorten the prefix instead.
  return `TapAway: Set your password: ${link}${STOP_SUFFIX}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // 10/hour per caller — this is not a hot path (once per sale + manual resends).
  if (!checkRateLimit(getRateLimitKey(req, "send-van-handoff"), 10, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "TapAway <no-reply@tapaway.co>";
    const SITE_URL = Deno.env.get("SITE_URL") || "https://tapaway.co";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("send-van-handoff misconfigured: missing Supabase env");
      return json(500, { error: "Server configuration error (Supabase)" });
    }

    // ---- Auth: internal callers present the service-role bearer; Jorge
    // presents his admin JWT (resend path). Fail closed otherwise.
    const authHeader = req.headers.get("Authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const isInternal = bearer === SUPABASE_SERVICE_ROLE_KEY;
    if (!isInternal) {
      const caller = await requireUser(req);
      if (!caller) return json(401, { error: "Unauthorized" });
      if (!(await isAdmin(caller.user.id))) return json(403, { error: "Admin only" });
    }

    const { profile_id, resend } = await req.json().catch(() => ({}));
    if (typeof profile_id !== "string" || profile_id.length === 0) {
      return json(400, { error: "profile_id is required" });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // ---- Load profile.
    const { data: profile, error: pErr } = await admin
      .from("personal_profiles")
      .select("id, full_name, username, business_phone, stripe_billing_email, email, van_handoff_sent_at, van_handoff_channel")
      .eq("id", profile_id)
      .maybeSingle();
    if (pErr || !profile) {
      return json(404, { error: "Profile not found" });
    }

    // ---- Exactly-once claim (skipped for an explicit admin resend).
    // Only one caller wins the claim; losers get { already_sent: true }.
    if (!resend) {
      const { data: claimed, error: claimErr } = await admin
        .from("personal_profiles")
        .update({
          van_handoff_sent_at: new Date().toISOString(),
          van_handoff_channel: "pending",
        })
        .eq("id", profile_id)
        .is("van_handoff_sent_at", null)
        .select("id");
      if (claimErr) {
        console.error("send-van-handoff: claim failed", claimErr);
        return json(500, { error: "Failed to claim handoff" });
      }
      if (!claimed || claimed.length === 0) {
        return json(200, {
          success: true,
          already_sent: true,
          channel: profile.van_handoff_channel ?? null,
        });
      }
    }

    const resetClaim = async () => {
      if (resend) return; // no claim was taken
      await admin
        .from("personal_profiles")
        .update({ van_handoff_sent_at: null, van_handoff_channel: null })
        .eq("id", profile_id);
    };

    const business = String(profile.full_name || "your business");
    const accountEmail = String(profile.stripe_billing_email || profile.email || "").trim();
    const phone = normalizeUSPhone(profile.business_phone);
    const smsConfigured = !!(LOVABLE_API_KEY && TWILIO_API_KEY && TWILIO_FROM_NUMBER);

    // ---- Make sure the owner auth user exists (verify-personal-checkout
    // normally creates it); generateLink below needs one.
    if (!accountEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(accountEmail)) {
      await resetClaim();
      console.error("send-van-handoff: no account email on profile", { profile_id });
      return json(400, { error: "Profile has no email address" });
    }
    try {
      const { data: users } = await admin.auth.admin.listUsers();
      const exists = users?.users.some(
        (u) => u.email?.toLowerCase() === accountEmail.toLowerCase(),
      );
      if (!exists) {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: accountEmail,
          password: crypto.randomUUID().slice(0, 24),
          email_confirm: true,
          user_metadata: { account_type: "personal", must_set_password: true },
        });
        if (createErr || !created.user) throw new Error(createErr?.message || "createUser failed");
      }
    } catch (e) {
      await resetClaim();
      console.error("send-van-handoff: owner user lookup failed", e);
      return json(500, { error: "Failed to locate the owner account" });
    }

    // ---- Generate the single-use, expiring recovery link. The raw link is
    // kept only in this local scope: it is NEVER logged and NEVER included
    // in the response.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: accountEmail,
      options: { redirectTo: `${SITE_URL}${RESET_PATH}` },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      await resetClaim();
      console.error("send-van-handoff: generateLink failed", linkErr?.message ?? "no action_link");
      return json(500, { error: "Failed to generate the setup link" });
    }
    const setupLink: string = linkData.properties.action_link;

    // ---- Send: SMS if we have a usable mobile, otherwise email.
    const sendViaSms = !!(phone && smsConfigured);
    let channel: "sms" | "email";
    let sentToMasked: string;
    try {
      if (sendViaSms) {
        const message = buildSms(business, setupLink);
        const res = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: phone,
            From: TWILIO_FROM_NUMBER,
            Body: message,
          }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Twilio HTTP ${res.status}: ${txt.slice(0, 200)}`);
        }
        channel = "sms";
        sentToMasked = maskPhone(phone);
      } else {
        if (!RESEND_API_KEY) {
          throw new Error(
            phone
              ? "SMS is not configured and no email fallback is available"
              : "No owner mobile on file and email is not configured",
          );
        }
        // Email fallback: canonical password_setup template via the shared
        // library (same copy as before, branded wrapper, email_sends logging).
        // The setup link is passed as a template var — bodies are never logged.
        const firstName = business.split(" ")[0] || "there";
        const mailResult = await sendTemplatedEmail({
          to: accountEmail,
          from: EMAIL_FROM,
          templateKey: "password_setup",
          profileId: profile_id,
          vars: { firstName, business, setupLink },
        });
        if (!mailResult.ok) throw new Error(`Resend: ${mailResult.error}`);
        channel = "email";
        sentToMasked = maskEmail(accountEmail);
      }
    } catch (e) {
      await resetClaim();
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("send-van-handoff: send failed", msg);
      return json(502, { error: `Failed to send the setup link (${sendViaSms ? "SMS" : "email"}): ${msg}` });
    }

    // ---- Record the send.
    await admin
      .from("personal_profiles")
      .update({
        van_handoff_sent_at: new Date().toISOString(),
        van_handoff_channel: channel,
      })
      .eq("id", profile_id);

    console.log("send-van-handoff: setup link sent", {
      profile_id,
      channel,
      sent_to: sentToMasked,
    });
    return json(200, { success: true, channel, sent_to: sentToMasked });
  } catch (err) {
    console.error("send-van-handoff unexpected error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json(500, { error: msg });
  }
});
