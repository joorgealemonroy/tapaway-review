// Mass SMS sender — strictly scoped to the authenticated owner's profile or restaurant.
// Sends via Twilio through the Lovable connector gateway.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";
const MAX_LEN = 160;
const STOP_SUFFIX = "\nReply STOP to opt out.";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, { error: "Server configuration error (Supabase)" });
    }
    if (!LOVABLE_API_KEY) return json(500, { error: "LOVABLE_API_KEY not configured" });
    if (!TWILIO_API_KEY) return json(500, { error: "Twilio is not connected" });
    if (!TWILIO_FROM_NUMBER) return json(500, { error: "TWILIO_FROM_NUMBER is not configured" });

    // ---- Authn ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) return json(401, { error: "Unauthorized" });
    const userId = userData.user.id;

    // ---- Body validation ----
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }
    const profileId = typeof body?.profile_id === "string" ? body.profile_id.trim() : "";
    const restaurantId = typeof body?.restaurant_id === "string" ? body.restaurant_id.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!profileId && !restaurantId) {
      return json(400, { error: "Must provide profile_id or restaurant_id" });
    }
    if (profileId && restaurantId) {
      return json(400, { error: "Provide only one of profile_id or restaurant_id" });
    }
    const targetId = profileId || restaurantId;
    if (!UUID_RE.test(targetId)) return json(400, { error: "Invalid id" });
    if (message.length === 0 || message.length > MAX_LEN) {
      return json(400, { error: `Message must be 1-${MAX_LEN} characters` });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    let senderName = "TapAway";
    let phones: string[] = [];
    let campaignTable = "";
    let campaignRow: Record<string, any> = {};

    if (profileId) {
      // ---- Personal flow ----
      const { data: profile, error: profileErr } = await admin
        .from("personal_profiles")
        .select("id, user_id, full_name, contact_name, username")
        .eq("id", profileId)
        .maybeSingle();
      if (profileErr) return json(500, { error: "Profile lookup failed" });
      if (!profile) return json(404, { error: "Profile not found" });
      if (profile.user_id !== userId && !isAdmin) return json(403, { error: "Forbidden" });

      const { data: recipients, error: recErr } = await admin
        .from("personal_email_captures")
        .select("phone")
        .eq("profile_id", profileId)
        .eq("sms_opt_in", true)
        .not("phone", "is", null);
      if (recErr) return json(500, { error: "Failed to load recipients" });

      phones = Array.from(
        new Set(
          (recipients ?? [])
            .map((r: any) => (typeof r.phone === "string" ? r.phone.trim() : ""))
            .filter((p: string) => p.length > 0),
        ),
      );

      senderName =
        (profile.full_name && String(profile.full_name).trim()) ||
        (profile.contact_name && String(profile.contact_name).trim()) ||
        (profile.username ? `@${profile.username}` : "TapAway");

      campaignTable = "sms_campaigns";
      campaignRow = {
        profile_id: profileId,
        user_id: userId,
        message,
        recipient_count: phones.length,
      };
    } else {
      // ---- Restaurant flow ----
      const { data: restaurant, error: rErr } = await admin
        .from("restaurants")
        .select("id, owner_id, restaurant_name")
        .eq("id", restaurantId)
        .maybeSingle();
      if (rErr) return json(500, { error: "Restaurant lookup failed" });
      if (!restaurant) return json(404, { error: "Restaurant not found" });
      if (restaurant.owner_id !== userId && !isAdmin) return json(403, { error: "Forbidden" });

      const { data: recipients, error: recErr } = await admin
        .from("restaurant_sms_subscribers")
        .select("phone")
        .eq("restaurant_id", restaurantId)
        .eq("sms_opt_in", true)
        .not("phone", "is", null);
      if (recErr) return json(500, { error: "Failed to load recipients" });

      phones = Array.from(
        new Set(
          (recipients ?? [])
            .map((r: any) => (typeof r.phone === "string" ? r.phone.trim() : ""))
            .filter((p: string) => p.length > 0),
        ),
      );

      senderName =
        (restaurant.restaurant_name && String(restaurant.restaurant_name).trim()) || "TapAway";

      campaignTable = "restaurant_sms_campaigns";
      campaignRow = {
        restaurant_id: restaurantId,
        user_id: userId,
        message,
        recipient_count: phones.length,
      };
    }

    if (phones.length === 0) {
      return json(200, { recipient_count: 0, success_count: 0, failure_count: 0 });
    }

    const fullMessage = `${senderName}: ${message}${STOP_SUFFIX}`;

    const { data: campaign, error: campErr } = await admin
      .from(campaignTable)
      .insert(campaignRow)
      .select("id")
      .single();
    if (campErr || !campaign) {
      console.error("campaign insert failed", campErr);
      return json(500, { error: "Failed to log campaign" });
    }

    // ---- Send via Twilio gateway, batched ----
    const BATCH = 10;
    let success = 0;
    let failure = 0;

    for (let i = 0; i < phones.length; i += BATCH) {
      const batch = phones.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (to) => {
          try {
            const res = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": TWILIO_API_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: to,
                From: TWILIO_FROM_NUMBER,
                Body: fullMessage,
              }),
            });
            if (!res.ok) {
              const txt = await res.text();
              console.error(`Twilio send to ${to} failed [${res.status}]: ${txt}`);
              return false;
            }
            return true;
          } catch (e) {
            console.error(`Twilio send to ${to} error`, e);
            return false;
          }
        }),
      );
      for (const ok of results) ok ? success++ : failure++;
    }

    await admin
      .from(campaignTable)
      .update({ success_count: success, failure_count: failure })
      .eq("id", campaign.id);

    return json(200, {
      recipient_count: phones.length,
      success_count: success,
      failure_count: failure,
    });
  } catch (err) {
    console.error("send-mass-sms unexpected error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json(500, { error: msg });
  }
});
