// send-feature-update — admin broadcast composer backend.
//
// Called by /admin/emails → Compose tab (FeatureUpdateComposer.tsx).
// Contract (from EMAIL-ADMIN.md):
//   Request:  { headline, body, cta_text?, cta_url? }
//   Response: { sent: <n>, failed: <m> }
//
// Rules:
//   - Admin-gated: caller presents Jorge's JWT; is_admin() must be true.
//   - Rate limit: 1 broadcast/hour (BROADCASTS_PER_HOUR) — protects against
//     double-tap accidents. Recipient cap 500 (MAX_RECIPIENTS).
//   - Validation: headline 1–120 chars, body 1–2000 chars, CTA needs both
//     text and an https:// link (or neither).
//   - Recipients computed server-side, deduped by lowercased email:
//       restaurants:      subscription_status IN ('active','past_due')
//                         AND payment_state != 'complimentary' AND email present
//       personal_profiles: subscription_status IN ('active','past_due')
//                         AND payment_state != 'complimentary'
//                         AND (stripe_billing_email or email) present
//     Excluded: trialing, canceled, complimentary.
//     past_due IS included (locked 2026-09-09 correction): a manual nudge
//     once got a past-due client paying immediately — staying in touch
//     recovers revenue. Their hubs are still live; they're in dunning,
//     not churned.
//     NOTE: personal_profiles.payment_state exists after migration
//     20260909320000_personal_payment_state.sql — apply it before deploying
//     this function, or the personal query will fail.
//   - Sends via Resend batch endpoint (100/chunk) using the canonical
//     feature_update template; subject "TapAway update: {headline}".
//   - Every attempt logged to email_sends (template_key='feature_update').
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, isAdmin } from "../_shared/security.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";
import { renderTemplate, logEmailSend } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Tunables: 1 broadcast/hour guards double-taps; 500 cap guards accidents.
const BROADCASTS_PER_HOUR = 1;
const MAX_RECIPIENTS = 500;
const RESEND_BATCH_SIZE = 100;
const RESEND_BATCH_URL = "https://api.resend.com/emails/batch";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "TapAway <hello@tapaway.co>";
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[send-feature-update] misconfigured: missing Supabase env");
      return json(500, { error: "Server configuration error" });
    }
    if (!RESEND_API_KEY) {
      console.error("[send-feature-update] misconfigured: RESEND_API_KEY missing");
      return json(500, { error: "Email is not configured" });
    }

    // ---- Admin gate: Jorge's JWT, is_admin() true. Fail closed.
    const caller = await requireUser(req);
    if (!caller) return json(401, { error: "Unauthorized" });
    if (!(await isAdmin(caller.user.id))) return json(403, { error: "Admin only" });

    // ---- Rate limit: one broadcast per hour per caller.
    if (!checkRateLimit(getRateLimitKey(req, "send-feature-update"), BROADCASTS_PER_HOUR, 60 * 60 * 1000)) {
      return rateLimitResponse(corsHeaders);
    }

    // ---- Validate inputs.
    const { headline, body, cta_text, cta_url } = await req.json().catch(() => ({}));
    const h = typeof headline === "string" ? headline.trim() : "";
    const b = typeof body === "string" ? body.trim() : "";
    const ct = typeof cta_text === "string" ? cta_text.trim() : "";
    const cu = typeof cta_url === "string" ? cta_url.trim() : "";
    if (h.length < 1 || h.length > 120) {
      return json(400, { error: "Headline must be 1–120 characters." });
    }
    if (b.length < 1 || b.length > 2000) {
      return json(400, { error: "Body must be 1–2000 characters." });
    }
    if ((ct && !cu) || (!ct && cu)) {
      return json(400, { error: "CTA needs both text and a link, or neither." });
    }
    if (cu && !isValidHttpUrl(cu)) {
      return json(400, { error: "CTA link must be a valid https:// URL." });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // ---- Recipients, server-side (source of truth; UI only shows an estimate).
    const recipients = new Map<string, { email: string; name: string }>();
    const addRecipient = (email: unknown, name: unknown) => {
      const e = String(email || "").trim().toLowerCase();
      if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return;
      if (!recipients.has(e)) {
        recipients.set(e, { email: e, name: String(name || "").trim().split(" ")[0] || "friend" });
      }
    };

    const { data: restaurants, error: rErr } = await admin
      .from("restaurants")
      .select("email, owner_name, restaurant_name")
      .in("subscription_status", ["active", "past_due"])
      .neq("payment_state", "complimentary")
      .not("email", "is", null);
    if (rErr) {
      console.error("[send-feature-update] restaurants query failed:", rErr.message);
      return json(500, { error: "Failed to build the recipient list." });
    }
    for (const r of restaurants || []) {
      addRecipient(r.email, r.owner_name || r.restaurant_name);
    }

    const { data: profiles, error: pErr } = await admin
      .from("personal_profiles")
      .select("email, stripe_billing_email, full_name")
      .in("subscription_status", ["active", "past_due"])
      .neq("payment_state", "complimentary");
    if (pErr) {
      console.error("[send-feature-update] personal_profiles query failed:", pErr.message);
      return json(500, { error: "Failed to build the recipient list." });
    }
    for (const p of profiles || []) {
      addRecipient(p.stripe_billing_email || p.email, p.full_name);
    }

    const list = [...recipients.values()];
    console.log("[send-feature-update] recipients:", {
      count: list.length,
      restaurants: restaurants?.length || 0,
      profiles: profiles?.length || 0,
    });

    if (list.length === 0) {
      return json(200, { sent: 0, failed: 0, note: "No active subscribers to email." });
    }
    if (list.length > MAX_RECIPIENTS) {
      return json(400, {
        error: `Recipient list (${list.length}) exceeds the ${MAX_RECIPIENTS} safety cap. Narrow it down or raise MAX_RECIPIENTS and try again.`,
      });
    }

    // ---- Render once via the canonical registry; personalize the greeting.
    const subject = `TapAway update: ${h}`;
    const preheader = b.slice(0, 120);

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < list.length; i += RESEND_BATCH_SIZE) {
      const chunk = list.slice(i, i + RESEND_BATCH_SIZE);
      const payloads = chunk.map((r) => {
        const rendered = renderTemplate("feature_update", {
          subject,
          preheader,
          headline: h,
          body: b,
          ctaLabel: ct || undefined,
          ctaUrl: cu || undefined,
          name: r.name,
        });
        return { to: [r.email], rendered, recipient: r };
      });

      let batchIds: Array<string | null> = [];
      let batchError: string | null = null;
      try {
        const res = await fetch(RESEND_BATCH_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            payloads.map((p) => ({
              from: EMAIL_FROM,
              to: p.to,
              subject: p.rendered.subject,
              html: p.rendered.html,
              text: p.rendered.text,
            })),
          ),
        });
        if (!res.ok) {
          const errText = await res.text();
          batchError = `Resend batch HTTP ${res.status}: ${errText.slice(0, 300)}`;
        } else {
          const data = await res.json();
          const items = Array.isArray(data?.data) ? data.data : [];
          batchIds = payloads.map((_, idx) => items[idx]?.id || null);
        }
      } catch (e) {
        batchError = e instanceof Error ? e.message : "Unknown error";
      }

      // ---- Log EVERY attempt, success or failure. Bodies never logged.
      for (let j = 0; j < payloads.length; j++) {
        const p = payloads[j];
        const resendId = batchIds[j] || null;
        if (batchError || !resendId) {
          failed++;
          await logEmailSend({
            to_email: p.recipient.email,
            template_key: "feature_update",
            subject,
            status: "failed",
            resend_id: null,
            error: batchError || "Resend returned no id for this recipient",
          });
        } else {
          sent++;
          await logEmailSend({
            to_email: p.recipient.email,
            template_key: "feature_update",
            subject,
            status: "sent",
            resend_id: resendId,
          });
        }
      }
    }

    console.log("[send-feature-update] broadcast complete", { headline: h, sent, failed });
    return json(200, { sent, failed });
  } catch (err) {
    console.error("[send-feature-update] unexpected error", err);
    return json(500, { error: err instanceof Error ? err.message : "Unknown error" });
  }
});
