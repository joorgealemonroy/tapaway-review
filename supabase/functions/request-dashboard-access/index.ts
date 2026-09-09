// request-dashboard-access — self-serve "I can't get into my dashboard".
//
// A customer enters the email they signed up with. If an auth user exists we
// generate a single-use recovery link and email it with the password_setup
// styling. If no user exists we do nothing — but the response is identical
// either way, so the endpoint can never be used to enumerate accounts.
//
// Rate limited to 3 requests per hour per IP.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";
import { sendEmailAndLog, renderTemplate } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://tapaway.co";
const REDIRECT_TO = `${SITE_URL}/auth/set-password`;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same message no matter what happened.
const OK_BODY = {
  success: true,
  message: "Check your inbox — we sent you a secure link.",
};

function ok(): Response {
  return new Response(JSON.stringify(OK_BODY), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!checkRateLimit(getRateLimitKey(req, "request-dashboard-access"), 3, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const { email } = await req.json().catch(() => ({ email: "" }));
    const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";

    // Invalid input still gets the neutral success response.
    if (!normalized || !EMAIL_RE.test(normalized) || normalized.length > 254) {
      return ok();
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Does an auth user exist for this email? (never revealed to the caller)
    const { data: lookup, error: lookupErr } = await admin
      .rpc("get_auth_user_by_email", { lookup_email: normalized });

    if (lookupErr) {
      console.error("[request-dashboard-access] lookup failed:", lookupErr.message);
      return ok();
    }

    const userRow = Array.isArray(lookup) ? lookup[0] : lookup;
    if (!userRow?.id) {
      console.log("[request-dashboard-access] no account for requested email — no send");
      return ok();
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: normalized,
      options: { redirectTo: REDIRECT_TO },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error("[request-dashboard-access] generateLink failed:", linkErr?.message);
      return ok();
    }

    // Look up a friendly first name if we have a profile on file.
    let firstName = "there";
    let business = "your business";
    try {
      const { data: profile } = await admin
        .from("personal_profiles")
        .select("full_name, username")
        .eq("user_id", userRow.id)
        .maybeSingle();
      if (profile?.full_name) firstName = String(profile.full_name).split(" ")[0];
      if (profile?.username) business = String(profile.username);
      if (firstName === "there") {
        const { data: restaurant } = await admin
          .from("restaurants")
          .select("owner_name, restaurant_name")
          .eq("owner_id", userRow.id)
          .maybeSingle();
        if (restaurant?.owner_name) firstName = String(restaurant.owner_name).split(" ")[0];
        if (restaurant?.restaurant_name) business = String(restaurant.restaurant_name);
      }
    } catch (_e) {
      // Names are cosmetic — never block the send.
    }

    // Reuse the password_setup look, with a dashboard-access subject line.
    const rendered = renderTemplate("password_setup", {
      firstName,
      business,
      setupLink: linkData.properties.action_link,
    });

    const sent = await sendEmailAndLog({
      to: normalized,
      subject: "Access your TapAway dashboard — set your password",
      html: rendered.html,
      // renderTemplate HTML-escapes vars; undo it for the plain-text link.
      text: rendered.text.replace(/&amp;/g, "&"),
      templateKey: "dashboard_access",
    });

    if (!sent.ok) {
      console.error("[request-dashboard-access] send failed:", sent.error);
    }

    return ok();
  } catch (error) {
    console.error("[request-dashboard-access] Error:", error);
    // Still neutral — never leak internal state to the caller.
    return ok();
  }
});
