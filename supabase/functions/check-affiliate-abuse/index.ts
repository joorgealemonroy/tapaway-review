import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { referralId, affiliateId, ipAddress, referredEmail } = await req.json();

    if (!referralId || !affiliateId) {
      return new Response(
        JSON.stringify({ error: "referralId and affiliateId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const flags: Array<{ flag_type: string; details: string }> = [];

    // 1. Duplicate IP check (same affiliate, same IP, last 30 days)
    if (ipAddress) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: dupeIps } = await supabase
        .from("affiliate_referrals")
        .select("id")
        .eq("affiliate_id", affiliateId)
        .eq("ip_address", ipAddress)
        .neq("id", referralId)
        .gte("created_at", thirtyDaysAgo);

      if (dupeIps && dupeIps.length > 0) {
        flags.push({
          flag_type: "duplicate_ip",
          details: `IP ${ipAddress} used by ${dupeIps.length + 1} referrals from this affiliate in last 30 days`,
        });
      }
    }

    // 2. Rapid signup check (3+ from same affiliate in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentSignups } = await supabase
      .from("affiliate_referrals")
      .select("id")
      .eq("affiliate_id", affiliateId)
      .gte("created_at", oneHourAgo);

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

    // Insert flags into database
    if (flags.length > 0) {
      const flagRows = flags.map((f) => ({
        referral_id: referralId,
        flag_type: f.flag_type,
        details: f.details,
      }));

      const { error: insertError } = await supabase
        .from("affiliate_abuse_flags")
        .insert(flagRows);

      if (insertError) {
        console.error("[check-affiliate-abuse] Insert error:", insertError);
      }
    }

    console.log(`[check-affiliate-abuse] Checked referral ${referralId}: ${flags.length} flags`);

    return new Response(
      JSON.stringify({ flags_created: flags.length, flags }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[check-affiliate-abuse] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
