// fulfillment-email — sends pipeline stage emails (card_printed, card_delivered).
//
// Called ONLY by the DB trigger on personal_profiles (see migration
// 20260909251000_email_triggers.sql): when printed_at flips NULL -> set, the
// trigger pg_net-POSTs { profile_id, stage: "printed" }; when delivered_at
// flips, { profile_id, stage: "delivered" }.
//
// HONESTY RULE: the send is gated on the actual stamp column being set —
// if printed_at/delivered_at isn't set, we refuse to claim it happened.
// Dedup: email_sends (profile_id + template_key) guarantees exactly-once per
// profile even if the trigger fires twice.
//
// Auth: internal only — Authorization: Bearer <service-role key>, same as
// trial-followup (the pg_net trigger pulls the key from Vault).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sendTemplatedEmail,
  alreadySentTemplate,
} from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SITE_URL = "https://tapaway.co";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[fulfillment-email] misconfigured: missing Supabase env");
      return json(500, { error: "Server configuration error" });
    }

    // ---- Internal auth only (pg_net trigger with the service-role key).
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token || token !== SUPABASE_SERVICE_ROLE_KEY) {
      return json(401, { error: "Unauthorized" });
    }

    const { profile_id, stage } = await req.json().catch(() => ({}));
    if (typeof profile_id !== "string" || !profile_id) {
      return json(400, { error: "profile_id is required" });
    }
    if (stage !== "printed" && stage !== "delivered") {
      return json(400, { error: "stage must be 'printed' or 'delivered'" });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: profile, error: pErr } = await admin
      .from("personal_profiles")
      .select("id, full_name, username, email, stripe_billing_email, printed_at, delivered_at")
      .eq("id", profile_id)
      .maybeSingle();
    if (pErr || !profile) {
      console.error("[fulfillment-email] profile not found", { profile_id });
      return json(404, { error: "Profile not found" });
    }

    // ---- Honesty gate: never claim a stage that isn't stamped.
    if (stage === "printed" && !profile.printed_at) {
      console.log("[fulfillment-email] skip: printed_at not set", { profile_id });
      return json(200, { ok: true, skipped: "printed_at not set" });
    }
    if (stage === "delivered" && !profile.delivered_at) {
      console.log("[fulfillment-email] skip: delivered_at not set", { profile_id });
      return json(200, { ok: true, skipped: "delivered_at not set" });
    }

    const templateKey = stage === "printed" ? "card_printed" : "card_delivered";

    // ---- Dedup: exactly once per profile per stage.
    if (await alreadySentTemplate(profile_id, templateKey)) {
      console.log("[fulfillment-email] skip: already sent", { profile_id, templateKey });
      return json(200, { ok: true, skipped: "already sent" });
    }

    const toEmail = String(profile.stripe_billing_email || profile.email || "").trim();
    if (!toEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(toEmail)) {
      console.error("[fulfillment-email] no usable email on profile", { profile_id });
      return json(200, { ok: true, skipped: "no email on profile" });
    }

    const fullName = String(profile.full_name || "").trim();
    const firstName = fullName ? fullName.split(" ")[0] : "there";
    const username = String(profile.username || "").trim();

    const result = await sendTemplatedEmail({
      to: toEmail,
      templateKey,
      profileId: profile_id,
      vars: {
        name: firstName,
        businessName: fullName || "your business",
        hubUrl: username ? `${SITE_URL}/${username}` : SITE_URL,
        dashboardUrl: `${SITE_URL}/dashboard`,
        // Delivered from the admin board can mean handed over in person OR
        // shipped — keep the copy honest for the in-person case.
        deliveryNote:
          stage === "delivered"
            ? `Your TapAway cards for ${fullName || "your business"} are delivered — in your hands and ready to work.`
            : undefined,
      },
    });

    if (!result.ok) {
      console.error("[fulfillment-email] send failed", { profile_id, templateKey, error: result.error });
      return json(502, { ok: false, error: result.error });
    }
    return json(200, { ok: true, template: templateKey, resend_id: result.resendId });
  } catch (err) {
    console.error("[fulfillment-email] unexpected error", err);
    return json(500, { error: err instanceof Error ? err.message : "Unknown error" });
  }
});
