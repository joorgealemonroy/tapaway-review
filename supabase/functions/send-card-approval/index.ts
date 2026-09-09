import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { escapeHtml } from "../_shared/sanitize.ts";
import { sendEmailAndLog } from "../_shared/email.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CardApprovalRequest {
  fullName: string;
  username: string;
  email: string;
  profileId: string;
  frontImageBase64: string;
  backImageBase64: string;
  cardHeadline?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit: 10 requests per hour per IP
  const rlKey = getRateLimitKey(req, "send-card-approval");
  if (!checkRateLimit(rlKey, 10, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const { 
      fullName, 
      username, 
      email, 
      profileId,
      frontImageBase64, 
      backImageBase64,
      cardHeadline
    }: CardApprovalRequest = await req.json();

    console.log(`[send-card-approval] Processing card approval for ${username} (${email})`);

    // Validate required fields
    if (!fullName || !username || !email || !frontImageBase64 || !backImageBase64) {
      console.error("[send-card-approval] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Escape all user-provided values
    const safeFullName = escapeHtml(fullName);
    const safeUsername = escapeHtml(username);
    const safeEmail = escapeHtml(email);
    const safeProfileId = escapeHtml(profileId);
    const safeCardHeadline = escapeHtml(cardHeadline);

    const timestamp = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    // Send email with card images as attachments — via the shared library so
    // the send is logged to email_sends (internal ops mail, templateKey "internal").
    const emailResult = await sendEmailAndLog({
      from: "TapAway Cards <cards@tapaway.co>",
      to: ["tap@tapaway.co"],
      replyTo: email,
      templateKey: "internal_card_approval",
      subject: `[Card Approval] ${safeFullName} (@${safeUsername}) - Ready to Print`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background: #f5f5f5; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6BCB77, #4ECCA3); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">✓ Card Design Approved</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Ready to print</p>
            </div>

            <!-- User Info -->
            <div style="padding: 30px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Name:</td>
                  <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${safeFullName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Username:</td>
                  <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">@${safeUsername}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Profile URL:</td>
                  <td style="padding: 8px 0; font-size: 14px;">
                    <a href="https://tapaway.co/${encodeURIComponent(username)}" style="color: #6BCB77; text-decoration: none;">tapaway.co/${safeUsername}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Email:</td>
                  <td style="padding: 8px 0; font-size: 14px;">
                    <a href="mailto:${safeEmail}" style="color: #6BCB77; text-decoration: none;">${safeEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Profile ID:</td>
                  <td style="padding: 8px 0; font-size: 12px; font-family: monospace; color: #999;">${safeProfileId}</td>
                </tr>
                ${safeCardHeadline ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Card Headline:</td>
                  <td style="padding: 8px 0; font-size: 14px; white-space: pre-line;">${safeCardHeadline}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Approved:</td>
                  <td style="padding: 8px 0; font-size: 14px;">${timestamp}</td>
                </tr>
              </table>

              <!-- Card Previews -->
              <h2 style="font-size: 16px; font-weight: 700; margin: 0 0 16px 0; color: #1a1a1a;">Card Designs:</h2>
              
              <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                <!-- Front Card -->
                <div style="text-align: center;">
                  <p style="font-size: 12px; color: #666; margin: 0 0 8px 0; font-weight: 600;">FRONT</p>
                  <img src="${frontImageBase64}" alt="Card Front" style="max-width: 200px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
                </div>
                
                <!-- Back Card -->
                <div style="text-align: center;">
                  <p style="font-size: 12px; color: #666; margin: 0 0 8px 0; font-weight: 600;">BACK</p>
                  <img src="${backImageBase64}" alt="Card Back" style="max-width: 200px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #888; margin: 0;">
                Reply to this email to contact the customer directly.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `${username}-card-front.png`,
          content: frontImageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
        {
          filename: `${username}-card-back.png`,
          content: backImageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      ],
    });

    if (!emailResult.ok) {
      throw new Error(emailResult.error || "Email send failed");
    }

    console.log("[send-card-approval] Email sent successfully:", emailResult.resendId);

    return new Response(
      JSON.stringify({ success: true, message: "Card approval email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[send-card-approval] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
