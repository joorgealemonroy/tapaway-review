// Public Twilio inbound-message webhook.
// Listens for STOP/UNSUBSCRIBE/CANCEL/QUIT/END replies and flips
// sms_opt_in = false in BOTH personal_email_captures and
// restaurant_sms_subscribers so our sender lists stay in sync with
// Twilio's carrier-level block.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return twiml(200);

  try {
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    const from = (params.get("From") ?? "").trim();
    const body = (params.get("Body") ?? "").trim();
    const keyword = body.toUpperCase();

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
