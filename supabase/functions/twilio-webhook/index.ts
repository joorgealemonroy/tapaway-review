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
  return b64 === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return twiml(200);

  // Per-IP throttle to blunt forged-signature flooding (300/min).
  if (!checkRateLimit(getRateLimitKey(req, "twilio-webhook"), 300, 60 * 1000)) {
    return twiml(429);
  }


  try {
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    const from = (params.get("From") ?? "").trim();
    const body = (params.get("Body") ?? "").trim();
    const keyword = body.toUpperCase();

    // Verify request is genuinely from Twilio before mutating opt-in state.
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const signature = req.headers.get("x-twilio-signature") || "";
    if (authToken && signature) {
      const url = req.headers.get("x-forwarded-url") || req.url;
      const ok = await verifyTwilioSignature(authToken, signature, url, params);
      if (!ok) {
        console.warn("twilio-webhook signature verification failed", { from });
        return twiml(200); // Silent 200 — do NOT leak validity signal.
      }
    } else {
      console.warn("twilio-webhook missing TWILIO_AUTH_TOKEN or signature — rejecting");
      return twiml(200);
    }

    console.log("twilio-webhook inbound", { from, body });

    if (!from || !OPT_OUT_KEYWORDS.has(keyword)) {
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

    // Opt out across BOTH subscriber tables in parallel
    const [personalRes, restaurantRes] = await Promise.all([
      admin
        .from("personal_email_captures")
        .update({ sms_opt_in: false })
        .eq("phone", from)
        .select("id"),
      admin
        .from("restaurant_sms_subscribers")
        .update({ sms_opt_in: false })
        .eq("phone", from)
        .select("id"),
    ]);

    if (personalRes.error) {
      console.error("twilio-webhook personal update failed", personalRes.error);
    } else {
      console.log(
        `twilio-webhook opted out ${personalRes.data?.length ?? 0} personal row(s) for ${from}`,
      );
    }

    if (restaurantRes.error) {
      console.error("twilio-webhook restaurant update failed", restaurantRes.error);
    } else {
      console.log(
        `twilio-webhook opted out ${restaurantRes.data?.length ?? 0} restaurant row(s) for ${from}`,
      );
    }

    return twiml(200);
  } catch (err) {
    console.error("twilio-webhook unexpected error", err);
    return twiml(200);
  }
});
