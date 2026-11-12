import { readLimitedText } from "../_shared/requestBody.ts";
// Public Twilio inbound-message webhook.
// Listens for STOP/UNSUBSCRIBE/CANCEL/QUIT/END replies and flips
// sms_opt_in = false in BOTH personal_email_captures and
// restaurant_sms_subscribers so our sender lists stay in sync with
// Twilio's carrier-level block.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, getRateLimitKey } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMPTY_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
const OPT_OUT_KEYWORDS = new Set([
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "QUIT",
  "END",
  "REVOKE",
  "OPTOUT",
]);

function twiml(status = 200) {
  return new Response(EMPTY_TWIML, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/xml; charset=utf-8" },
  });
}

async function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: URLSearchParams,
): Promise<boolean> {
  // Twilio signs: URL + sorted(key + value) concatenated, HMAC-SHA1, base64.
  const keys = Array.from(new Set(Array.from(params.keys()))).sort();
  let data = url;
  for (const k of keys) {
    for (const v of params.getAll(k)) data += k + v;
  }
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(authToken),
    { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  if (b64.length !== signature.length) return false;
  let diff = 0; for (let i = 0; i < b64.length; i++) diff |= b64.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return twiml(200);

  // Per-IP throttle to blunt forged-signature flooding (300/min).
  if (!checkRateLimit(getRateLimitKey(req, "twilio-webhook"), 300, 60 * 1000)) {
    return twiml(429);
  }


  try {
    const raw = await readLimitedText(req, 16000);
    const params = new URLSearchParams(raw);
    const from = (params.get("From") ?? "").trim();
    const to = (params.get("To") ?? "").trim();
    const body = (params.get("Body") ?? "").trim();
    const keyword = body.toUpperCase();

    // Verify request is genuinely from Twilio before mutating opt-in state.
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const signature = req.headers.get("x-twilio-signature") || "";
    if (authToken && signature) {
      const url = Deno.env.get("TWILIO_WEBHOOK_URL") || `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-webhook`;
      const ok = await verifyTwilioSignature(authToken, signature, url, params);
      if (!ok) {
        console.warn("twilio-webhook signature verification failed");
        return twiml(200); // Silent 200. Do NOT leak validity signal.
      }
    } else {
      console.warn("twilio-webhook missing TWILIO_AUTH_TOKEN or signature. Rejecting");
      return twiml(200);
    }


    if (!from || (!OPT_OUT_KEYWORDS.has(keyword) && params.get("OptOutType")?.toUpperCase() !== "STOP")) {
      return twiml(200);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("twilio-webhook missing Supabase env");
      return twiml(200);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Dedicated merchant senders revoke only that merchant's topic/location
    // permissions. The signed To number selects the merchant, never a caller ID
    // or an untrusted profile field. Legacy shared-sender handling stays below.
    if (to) {
      const { data: managed, error: managedError } = await admin.rpc("revoke_profile_location_sms", {
        p_sender_number: to, p_phone: from,
      });
      if (managedError) return twiml(503);
      const sharedSender = Deno.env.get("TWILIO_FROM_NUMBER") || "";
      const alsoSharedSender = sharedSender && to.replace(/\D/g, "") === sharedSender.replace(/\D/g, "");
      // An accidental sender collision must not suppress STOP for legacy
      // recipients. Sending from such a configuration is blocked separately.
      if (managed === true && !alsoSharedSender) return twiml(200);
    }

    // Atomically exclude every managed merchant from the old shared-number
    // opt-out. A reply to TapAway's number must not disable a different brand.
    const { error: legacyError } = await admin.rpc("revoke_legacy_shared_sms", { p_phone: from });
    if (legacyError) console.error("twilio-webhook legacy opt-out could not be recorded");
    return twiml(legacyError ? 503 : 200);
  } catch (err) {
    console.error("twilio-webhook unexpected error", err);
    return twiml(200);
  }
});
