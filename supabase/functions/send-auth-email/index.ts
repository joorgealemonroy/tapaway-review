import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateOtpEmailHtml(token: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 400px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <img src="https://tapaway.co/tapaway-logo-email.png" width="120" alt="TapAway" style="margin-bottom: 24px; display: block;">
      </td>
    </tr>
    <tr>
      <td>
        <h1 style="color: #1a1a1a; font-size: 24px; font-weight: 700; margin: 0 0 24px 0;">Your TapAway setup code</h1>
      </td>
    </tr>
    <tr>
      <td>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
          Use this code to continue setting up your account:
        </p>
      </td>
    </tr>
    <tr>
      <td>
        <div style="display: inline-block; padding: 16px 24px; background-color: #f4f4f4; border-radius: 8px; border: 1px solid #e0e0e0;">
          <span style="color: #1a1a1a; font-size: 32px; font-weight: 700; letter-spacing: 4px; font-family: monospace;">${token}</span>
        </div>
      </td>
    </tr>
    <tr>
      <td>
        <p style="color: #888888; font-size: 14px; line-height: 20px; margin: 16px 0 0 0;">
          This code expires in 10 minutes.
        </p>
      </td>
    </tr>
    <tr>
      <td>
        <p style="color: #888888; font-size: 14px; margin-top: 32px;">
          — TapAway
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("[send-auth-email] RESEND_API_KEY not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "TapAway <no-reply@tapaway.co>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[send-auth-email] Resend API error:", errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[send-auth-email] Error sending email:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!hookSecret) {
    console.error("[send-auth-email] SEND_EMAIL_HOOK_SECRET not configured");
    return new Response(
      JSON.stringify({ error: { message: "Hook secret not configured" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  try {
    const wh = new Webhook(hookSecret);
    const {
      user,
      email_data: { token, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string;
      };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
        site_url: string;
      };
    };

    console.log("[send-auth-email] Sending OTP email to:", user.email, "type:", email_action_type);

    // Generate TapAway branded email
    const html = generateOtpEmailHtml(token);

    // Determine subject based on action type
    let subject = "Your TapAway setup code";
    if (email_action_type === "recovery") {
      subject = "Reset your TapAway password";
    } else if (email_action_type === "email_change") {
      subject = "Confirm your new email";
    }

    const sent = await sendEmail(user.email, subject, html);
    
    if (!sent) {
      throw new Error("Failed to send email");
    }

    console.log("[send-auth-email] Email sent successfully");

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[send-auth-email] Error:", error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: error.code || 500,
          message: error.message || "Failed to send email",
        },
      }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
