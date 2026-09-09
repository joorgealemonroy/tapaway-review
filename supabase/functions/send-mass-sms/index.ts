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

/**
 * Review-request dedup (Jorge's hard rule: one review-request SMS per phone
 * number per business, ever). A message counts as a review request when the
 * UI flags it (owner used the review-request template) OR its text mentions
 * reviews — /\breviews?\b/i — so hand-written "please leave us a review"
 * messages are covered too.
 *
 * Phone normalization (exact scheme — must match the SQL comment in
 * 20260909180000_review_request_sends.sql):
 *   1. Strip every non-digit character.
 *   2. 10 digits -> prepend "1" (assume North American).
 *   3. 11 digits starting with "1" -> keep.
 *   4. Anything else -> keep digits as-is (international / unusual, no guessing).
 *   5. Prefix "+".
 * phone_hash = lowercase hex SHA-256 of the normalized string. No salt/pepper:
 * salts would break cross-check consistency, and a rotating pepper would
 * silently break dedup (re-texting people — the exact thing this prevents).
 */
const REVIEW_REQUEST_RE = /\breviews?\b/i;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

async function hashPhone(normalized: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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
      console.error("send-mass-sms misconfigured: missing Supabase env", {
        has_url: !!SUPABASE_URL,
        has_anon_key: !!SUPABASE_ANON_KEY,
        has_service_role_key: !!SUPABASE_SERVICE_ROLE_KEY,
      });
      return json(500, { error: "Server configuration error (Supabase)" });
    }
    if (!LOVABLE_API_KEY) {
      console.error("send-mass-sms misconfigured: LOVABLE_API_KEY is not set");
      return json(500, { error: "LOVABLE_API_KEY not configured" });
    }
    if (!TWILIO_API_KEY) {
      console.error("send-mass-sms misconfigured: TWILIO_API_KEY is not set (Twilio not connected)");
      return json(500, { error: "Twilio is not connected" });
    }
    if (!TWILIO_FROM_NUMBER) {
      console.error("send-mass-sms misconfigured: TWILIO_FROM_NUMBER is not set");
      return json(500, { error: "TWILIO_FROM_NUMBER is not configured" });
    }


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
    // True when the owner sent from the review-request template in the UI.
    const reviewTemplateFlag = body?.review_request === true;

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

    const isReviewRequest = reviewTemplateFlag || REVIEW_REQUEST_RE.test(message);

    // ---- Review-request dedup: one SMS per phone number per business, ever.
    // Check the send log BEFORE sending; numbers already texted a review
    // request are silently skipped and never re-texted.
    let eligiblePhones = phones;
    let skippedDuplicates = 0;
    // phone -> hash, kept so we can record exactly the numbers we sent.
    let phoneHashes: Array<{ phone: string; hash: string }> = [];
    const ownerCol = profileId ? "profile_id" : "restaurant_id";
    const ownerId = profileId || restaurantId;

    if (isReviewRequest && phones.length > 0) {
      phoneHashes = await Promise.all(
        phones.map(async (p) => ({ phone: p, hash: await hashPhone(normalizePhone(p)) })),
      );
      const { data: prior, error: priorErr } = await admin
        .from("review_request_sends")
        .select("phone_hash")
        .eq(ownerCol, ownerId)
        .in(
          "phone_hash",
          phoneHashes.map((h) => h.hash),
        );
      if (priorErr) {
        console.error("review-request dedup lookup failed", priorErr);
        // Fail closed: never risk re-texting someone because a lookup errored.
        return json(500, { error: "Failed to check review-request history" });
      }
      const seen = new Set((prior ?? []).map((r: any) => String(r.phone_hash)));
      const eligible = phoneHashes.filter((h) => !seen.has(h.hash));
      skippedDuplicates = phoneHashes.length - eligible.length;
      eligiblePhones = eligible.map((h) => h.phone);
      phoneHashes = eligible;
    }

    if (phones.length === 0) {
      return json(200, { recipient_count: 0, success_count: 0, failure_count: 0 });
    }

    // Everyone already got a review request: nothing to do, and no campaign
    // row (Recent campaigns shouldn't show sends that never went out).
    if (isReviewRequest && eligiblePhones.length === 0) {
      return json(200, {
        recipient_count: phones.length,
        success_count: 0,
        failure_count: 0,
        skipped_duplicates: skippedDuplicates,
        review_request: true,
      });
    }

    const fullMessage = `${senderName}: ${message}${STOP_SUFFIX}`;

    // For review requests, the campaign logs the sends actually attempted
    // (eligible phones), not the duplicates that were skipped.
    if (isReviewRequest) {
      campaignRow = { ...campaignRow, recipient_count: eligiblePhones.length };
    }

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
    // Track per-phone results so review-request dedup records exactly the
    // numbers that were accepted (failed sends stay eligible for a retry).
    const sendResults: Array<{ phone: string; ok: boolean }> = [];

    for (let i = 0; i < eligiblePhones.length; i += BATCH) {
      const batch = eligiblePhones.slice(i, i + BATCH);
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
      batch.forEach((to, idx) => {
        const ok = results[idx];
        sendResults.push({ phone: to, ok });
        ok ? success++ : failure++;
      });
    }

    await admin
      .from(campaignTable)
      .update({ success_count: success, failure_count: failure })
      .eq("id", campaign.id);

    // ---- Record review-request sends (check-then-record). Only accepted
    // sends are logged, so a failed send can be retried without being
    // treated as a duplicate. The partial unique index on
    // (business, phone_hash) is the race-safety backstop: two concurrent
    // sends to the same number can both pass the check, and the second
    // insert is ignored (error 23505) — dedup still holds.
    if (isReviewRequest && campaign) {
      const hashByPhone = new Map(phoneHashes.map((h) => [h.phone, h.hash]));
      const rows = sendResults
        .filter((r) => r.ok && hashByPhone.has(r.phone))
        .map((r) => ({
          [ownerCol]: ownerId,
          phone_hash: hashByPhone.get(r.phone),
          sent_via: "send-mass-sms",
          campaign_id: campaign.id,
        }));
      if (rows.length > 0) {
        const { error: logErr } = await admin.from("review_request_sends").insert(rows);
        if (logErr && (logErr as any).code !== "23505") {
          console.error("review_request_sends insert failed", logErr);
        }
      }
    }

    return json(200, {
      recipient_count: eligiblePhones.length,
      success_count: success,
      failure_count: failure,
      ...(isReviewRequest ? { skipped_duplicates: skippedDuplicates, review_request: true } : {}),
    });
  } catch (err) {
    console.error("send-mass-sms unexpected error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json(500, { error: msg });
  }
});
