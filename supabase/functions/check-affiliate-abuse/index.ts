import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";
import { requireUser, isAdmin } from "../_shared/security.ts";
import { readLimitedText } from "../_shared/requestBody.ts";
import { takeQuota } from "../_shared/storefrontRateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "10minutemail.com",
  "yopmail.com",
  "trashmail.com",
  "dispostable.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "maildrop.cc",
  "mailnesia.com",
  "temp-mail.org",
  "fakeinbox.com",
  "mailcatch.com",
  "tempail.com",
  "harakirimail.com",
  "getnada.com",
  "emailondeck.com",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  // Rate limit: 20 requests per hour per IP
  const rlKey = getRateLimitKey(req, "check-affiliate-abuse");
  if (!checkRateLimit(rlKey, 20, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    // M-8: authenticate. Only the affiliate themselves, the referred user, or
    // an admin may run an abuse check for a given affiliate/referral pair.
    // Previously anyone could probe arbitrary affiliate IDs (recon on
    // signup velocity / duplicate IPs) and plant flags on others' referrals.
    const caller = await requireUser(req);
    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let body;
    try { body = JSON.parse(await readLimitedText(req, 4096)); } catch { return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: corsHeaders }); }
    const { referralId, affiliateId } = body || {};
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof referralId !== "string" || !uuid.test(referralId) || typeof affiliateId !== "string" || !uuid.test(affiliateId)) {
      return new Response(
        JSON.stringify({ error: "referralId and affiliateId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The referral must belong to the claimed affiliate, and the caller must
    // be the affiliate owner, the referred user, or an admin.
    const { data: referral, error: referralError } = await supabase
      .from("affiliate_referrals")
      .select("id, affiliate_id, referred_user_id")
      .eq("id", referralId)
      .maybeSingle();

    if (referralError) throw new Error("Referral lookup unavailable");
    if (!referral || referral.affiliate_id !== affiliateId) {
      return new Response(
        JSON.stringify({ error: "Referral not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, user_id")
      .eq("id", affiliateId)
      .maybeSingle();

    const callerIsAdmin = await isAdmin(caller.user.id);
    const callerIsAffiliate = !!affiliate && affiliate.user_id === caller.user.id;
    const callerIsReferred = referral.referred_user_id === caller.user.id;

    if (!callerIsAdmin && !callerIsAffiliate && !callerIsReferred) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (await takeQuota(req, "affiliate-review-user", 20, caller.user.id) < 0 ||
        await takeQuota(req, "affiliate-review-global", 500, "all") < 0) return rateLimitResponse(corsHeaders);
    // A durable one-per-referral claim also prevents concurrent duplicate flags.
    if (await takeQuota(req, "affiliate-review-referral", 1, referral.id) < 0)
      return new Response(JSON.stringify({ flags_created: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: referredAuth, error: authError } = await supabase.auth.admin.getUserById(referral.referred_user_id);
    if (authError || !referredAuth.user) throw new Error("Referral identity unavailable");
    const referredEmail = referredAuth.user.email;
    const flags: Array<{ flag_type: string; details: string }> = [];
    // Historical referral IPs were supplied by browsers. They are not verified
    // abuse evidence, so neither a caller's IP nor those values can plant flags.

    // 2. Rapid signup check (3+ from same affiliate in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentSignups, error: recentError } = await supabase
      .from("affiliate_referrals")
      .select("id")
      .eq("affiliate_id", affiliateId)
      .gte("created_at", oneHourAgo);

    if (recentError) throw new Error("Referral review unavailable");
    if (recentSignups && recentSignups.length >= 3) {
      flags.push({
        flag_type: "rapid_signup",
        details: `${recentSignups.length} referral signups from this affiliate in the last hour`,
      });
    }

    // 3. Suspicious email domain check
    if (referredEmail) {
      const domain = referredEmail.split("@")[1]?.toLowerCase();
      if (domain && DISPOSABLE_DOMAINS.includes(domain)) {
        flags.push({
          flag_type: "suspicious_domain",
          details: `Referred user email uses disposable domain: ${domain}`,
        });
      }
    }

    // Existing flags remain resolved or unresolved; repeated review never
    // recreates them or overwrites an administrator’s decision.
    const { data: existing, error: existingError } = await supabase.from("affiliate_abuse_flags").select("flag_type").eq("referral_id", referralId);
    if (existingError) throw new Error("Referral review unavailable");
    const existingTypes = new Set((existing || []).map(row => row.flag_type));
    const newFlags = flags.filter(flag => !existingTypes.has(flag.flag_type));
    if (newFlags.length > 0) {
      const flagRows = newFlags.map((f) => ({
        referral_id: referralId,
        flag_type: f.flag_type,
        details: f.details,
      }));

      const { error: insertError } = await supabase
        .from("affiliate_abuse_flags")
        .insert(flagRows);

      if (insertError) {
        throw new Error("Referral review could not be saved");
      }
    }

    return new Response(
      JSON.stringify({ flags_created: newFlags.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[check-affiliate-abuse] Error:", error);
    return new Response(
      JSON.stringify({ error: "Referral review is temporarily unavailable." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
