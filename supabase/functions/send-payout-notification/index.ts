import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

  try {
    const { payout_id }: PayoutNotificationRequest = await req.json();

    if (!payout_id) {
      console.error("Missing payout_id in request");
      return new Response(
        JSON.stringify({ error: "payout_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const repName = payoutAccount.payee_name || "Sales Partner";
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

    // Build email HTML
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0F766E; margin: 0; font-size: 24px;">💰 Payout Sent!</h1>
        </div>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hi ${repName},</p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your TapAway commission payout has been sent.</p>
        
        <div style="background: #F8FAFC; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748B; font-size: 14px;">Amount</td>
              <td style="padding: 8px 0; color: #0F172A; font-size: 16px; font-weight: 600; text-align: right;">$${amount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748B; font-size: 14px;">Status</td>
              <td style="padding: 8px 0; color: #059669; font-size: 14px; font-weight: 500; text-align: right;">✓ Sent</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748B; font-size: 14px;">Date</td>
              <td style="padding: 8px 0; color: #0F172A; font-size: 14px; text-align: right;">${paidAt}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748B; font-size: 14px;">Bank Account</td>
              <td style="padding: 8px 0; color: #0F172A; font-size: 14px; font-family: monospace; text-align: right;">****${payoutAccount.account_last4}</td>
            </tr>
            ${payout.note ? `
            <tr>
              <td style="padding: 8px 0; color: #64748B; font-size: 14px;">Note</td>
              <td style="padding: 8px 0; color: #0F172A; font-size: 14px; text-align: right;">${payout.note}</td>
            </tr>
            ` : ""}
          </table>
        </div>
        
        <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin-top: 24px;">
          Payouts are processed weekly on Tuesdays at 12 PM Pacific and may take 1–3 business days to arrive depending on your bank.
        </p>
        
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;" />
        
        <p style="color: #94A3B8; font-size: 12px; text-align: center;">
          TapAway • Commission Payout Notification
        </p>
      </div>
    `;

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: emailFrom,
      to: [repEmail],
      subject: "Your TapAway payout has been sent",
      html: htmlContent,
    });

    if (emailError) {
      console.error("Failed to send payout notification email");
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark email as sent to prevent duplicates
    await supabase
      .from("rep_payout_history")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", payout_id);

    console.log("Payout notification email sent successfully to:", repEmail);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-payout-notification:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
