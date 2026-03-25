import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { escapeHtml } from "../_shared/sanitize.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "TapAway <no-reply@tapaway.co>";
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://tapaway.co";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit: 30 per hour per IP
  const rlKey = getRateLimitKey(req, "notify-new-lead");
  if (!checkRateLimit(rlKey, 30, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const { profileId, formTitle, submissionData } = await req.json();

    if (!profileId || !submissionData) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up profile owner
    const { data: profile } = await supabaseAdmin
      .from("personal_profiles")
      .select("user_id, full_name, username")
      .eq("id", profileId)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get owner email from auth
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    const ownerEmail = userData?.user?.email;

    if (!ownerEmail) {
      return new Response(
        JSON.stringify({ error: "Owner email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeTitle = escapeHtml(formTitle || "New Lead");
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "full",
      timeStyle: "short",
    });

    // Build data rows
    const dataRows = Object.entries(submissionData as Record<string, string>)
      .map(
        ([key, value]) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#374151;width:35%;vertical-align:top;">${escapeHtml(key)}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#1f2937;">${escapeHtml(String(value))}</td></tr>`
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0FB5BA,#0d9fa3);padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">🔔 New TapAway Lead</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${safeTitle}</p>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">${escapeHtml(timestamp)}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            ${dataRows}
          </table>
          <div style="margin-top:24px;text-align:center;">
            <a href="${FRONTEND_URL}/personal/dashboard?tab=leads" style="display:inline-block;background-color:#0FB5BA;color:#ffffff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">View in Dashboard</a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Sent from TapAway · ${escapeHtml(profile.username)}'s profile</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await resend.emails.send({
      from: EMAIL_FROM,
      to: [ownerEmail],
      subject: `New TapAway Lead: ${formTitle || "New Inquiry"}`,
      html,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-new-lead error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
