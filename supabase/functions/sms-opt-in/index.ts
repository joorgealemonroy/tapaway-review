import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

// M-9: sole writer for restaurant SMS opt-ins. Direct browser INSERTs into
// restaurant_sms_subscribers / sms_signup_submissions were publicly writable
// (phone-number harvesting / spam farm). The public INSERT policies are
// dropped; this service-role function validates and writes instead.
// M-10: IP rate limit + honeypot on this spam-prone endpoint.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_RE = /^[\d\s+().-]+$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // SMS signup is spam-prone: 10 submissions per hour per IP.
  if (!checkRateLimit(getRateLimitKey(req, "sms-opt-in"), 10, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return json({ ok: false, error: "Invalid JSON body." }, 400);

    // Honeypot: bots fill the hidden "website" field. Silently pretend success
    // so the bot learns nothing.
    if (typeof body.website === "string" && body.website.trim().length > 0) {
      return json({ ok: true });
    }

    const restaurantId = typeof body.restaurantId === "string" ? body.restaurantId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const marketingConsent = body.marketingConsent === true;
    const transactionalConsent = body.transactionalConsent === true;
    const consentText = typeof body.consentText === "string" ? body.consentText.slice(0, 2000) : "";
    const marketingConsentText =
      typeof body.marketingConsentText === "string" ? body.marketingConsentText.slice(0, 2000) : null;
    const transactionalConsentText =
      typeof body.transactionalConsentText === "string" ? body.transactionalConsentText.slice(0, 2000) : null;

    if (!UUID_RE.test(restaurantId)) return json({ ok: false, error: "Invalid restaurant." }, 400);
    if (name.length < 1 || name.length > 100) return json({ ok: false, error: "Please enter your name." }, 400);
    if (phone.length < 7 || phone.length > 20 || !PHONE_RE.test(phone)) {
      return json({ ok: false, error: "Please enter a valid phone number." }, 400);
    }
    if (!marketingConsent && !transactionalConsent) {
      return json({ ok: false, error: "Please check at least one consent box." }, 400);
    }

    // Restaurant must exist.
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("id", restaurantId)
      .maybeSingle();
    if (!restaurant) return json({ ok: false, error: "Invalid restaurant." }, 400);

    // Atomic write: the subscriber row and its A2P 10DLC consent audit row
    // (the exact consent copy shown at opt-in) commit in one transaction via
    // record_sms_optin, so a subscriber can never exist without its consent
    // proof. A failure here is a retryable 500.
    const { error: optInError } = await supabase.rpc("record_sms_optin", {
      p_restaurant_id: restaurantId,
      p_name: name,
      p_phone: phone,
      p_marketing_consent: marketingConsent,
      p_transactional_consent: transactionalConsent,
      p_consent_text: consentText || (marketingConsent ? marketingConsentText : transactionalConsentText),
      p_marketing_consent_text: marketingConsent ? marketingConsentText : null,
      p_transactional_consent_text: transactionalConsent ? transactionalConsentText : null,
      p_user_agent: typeof body.userAgent === "string" ? body.userAgent.slice(0, 500) : null,
      p_source: `restaurant-hub:${restaurantId}`,
    });
    if (optInError) {
      console.error("[sms-opt-in] opt-in failed:", optInError.message);
      return json({ ok: false, error: "Something went wrong, please try again." }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[sms-opt-in] unexpected error:", err);
    return json({ ok: false, error: "Something went wrong, please try again." }, 500);
  }
});
