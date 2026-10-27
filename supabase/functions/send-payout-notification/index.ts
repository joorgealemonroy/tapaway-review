import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendEmailAndLog } from "../_shared/email.ts";
import { requireUser, isAdmin, adminClient } from "../_shared/security.ts";
import { readLimitedText } from "../_shared/requestBody.ts";
import { takeQuota } from "../_shared/storefrontRateLimit.ts";
import { escapeHtml } from "../_shared/sanitize.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayoutNotificationRequest {
  payout_id: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const auth = await requireUser(req);
    if (!auth || !await isAdmin(auth.user.id)) return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (await takeQuota(req, "payout-notification", 40, auth.user.id) < 0) return new Response(JSON.stringify({ error: "Please try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    let body: PayoutNotificationRequest;
    try { body = JSON.parse(await readLimitedText(req, 4096)); } catch { return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
    const payout_id = body?.payout_id;

    if (typeof payout_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payout_id)) {
      console.error("Missing payout_id in request");
      return new Response(
        JSON.stringify({ error: "payout_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for full access
    const supabase = adminClient();

    // Fetch payout record
    const { data: payout, error: payoutError } = await supabase
      .from("rep_payout_history")
      .select("*")
      .eq("id", payout_id)
      .single();

    if (payoutError || !payout) {
      console.error("Payout not found:", payout_id);
      return new Response(
        JSON.stringify({ error: "Payout not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email was already sent
    if (payout.email_sent_at) {
      console.log("Email already sent for payout:", payout_id);
      return new Response(
        JSON.stringify({ success: true, message: "Email already sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only send email if status is 'sent'
    if (payout.status !== "sent") {
      console.log("Payout status is not sent, skipping email:", payout.status);
      return new Response(
        JSON.stringify({ success: true, message: "Payout not in sent status" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch rep's payout account settings
    const { data: payoutAccount, error: accountError } = await supabase
      .from("rep_payout_accounts")
      .select("payee_name, account_last4, email_payout_notifications")
      .eq("rep_user_id", payout.rep_user_id)
      .single();

    if (accountError || !payoutAccount) {
      console.log("No payout account found for rep:", payout.rep_user_id);
      return new Response(
        JSON.stringify({ success: true, message: "No payout account configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email notifications are enabled
    if (!payoutAccount.email_payout_notifications) {
      console.log("Email notifications disabled for rep:", payout.rep_user_id);
      return new Response(
        JSON.stringify({ success: true, message: "Email notifications disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch rep's user record for email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(payout.rep_user_id);

    if (userError || !userData?.user?.email) {
      console.error("Failed to fetch rep user email");
      return new Response(
        JSON.stringify({ error: "Failed to fetch rep email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const repEmail = userData.user.email;
    
    // Get first name from payee_name or use full payee_name
    const payeeNameParts = (payoutAccount.payee_name || "").trim().split(" ");
    const firstName = payeeNameParts[0] || payoutAccount.payee_name || "Partner";
    
    const amount = Number(payout.amount).toFixed(2);
    const paidAt = payout.paid_at ? new Date(payout.paid_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }) : new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emailFrom = Deno.env.get("EMAIL_FROM") || "TapAway <notifications@tapaway.co>";

    // Build email HTML with TapAway's friendly tone
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
        
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hi ${escapeHtml(firstName)},</p>
        
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Your TapAway commission payout has just been sent.</p>
        
        <div style="background: #F8FAFC; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="padding: 8px 0; font-size: 15px;">
              <strong>Amount:</strong> $${amount}
            </li>
            <li style="padding: 8px 0; font-size: 15px;">
              <strong>Status:</strong> <span style="color: #059669;">Sent</span>
            </li>
            <li style="padding: 8px 0; font-size: 15px;">
              <strong>Date:</strong> ${paidAt}
            </li>
            <li style="padding: 8px 0; font-size: 15px;">
              <strong>Bank:</strong> ending in ****${escapeHtml(payoutAccount.account_last4)}
            </li>
          </ul>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 0 0 24px 0;">
          Payouts are processed every Tuesday at 12:00 PM Pacific and can take 1–3 business days to show up in your account depending on your bank.
        </p>
        
        <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 0 0 24px 0;">
          If anything looks off, reply to this email and we'll check it out.
        </p>
        
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0;">
          – TapAway
        </p>
        
      </div>
    `;

    // Plain text version
    const textContent = `Hi ${firstName},

Your TapAway commission payout has just been sent.

• Amount: $${amount}
• Status: Sent
• Date: ${paidAt}
• Bank: ending in ****${escapeHtml(payoutAccount.account_last4)}

Payouts are processed every Tuesday at 12:00 PM Pacific and can take 1–3 business days to show up in your account depending on your bank.

If anything looks off, reply to this email and we'll check it out.

– TapAway`;

    // Send email via Resend
    const result = await sendEmailAndLog({
      templateKey: "rep_payout",
      idempotencyKey: `payout-notification:${payout_id}`,
      from: emailFrom,
      to: [repEmail],
      subject: "Your TapAway payout is on the way 💸",
      html: htmlContent,
      text: textContent,
    });

    if (!result.ok) {
      console.error("Failed to send payout notification email");
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark email as sent to prevent duplicates
    const { error: markError } = await supabase
      .from("rep_payout_history")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", payout_id);

    if (markError) throw new Error("Delivery record unavailable");

    return new Response(
      JSON.stringify({ success: true, message: "Email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Payout notification unavailable");
    return new Response(
      JSON.stringify({ error: "Notification temporarily unavailable" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
