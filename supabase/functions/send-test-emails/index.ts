import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OTP Email HTML
function generateOtpEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f0fdfa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <tr>
      <td style="text-align:center;padding-bottom:24px;">
        <span style="font-size:24px;font-weight:800;color:#0d9488;">TapAway</span><br/>
        <span style="font-size:14px;color:#6b7280;">Finish setting up your trial</span>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;border-radius:16px;padding:32px;text-align:center;box-shadow:0 4px 24px rgba(13,148,136,0.10);">
        <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#111827;">Your verification code</h1>
        <p style="margin:0 0 24px 0;font-size:15px;color:#6b7280;">Enter this code to continue your TapAway setup:</p>
        <div style="background:#f0fdfa;border:2px dashed #0d9488;border-radius:12px;padding:20px;margin-bottom:24px;">
          <span style="font-size:36px;font-weight:800;letter-spacing:6px;color:#0d9488;">${code}</span>
        </div>
        <p style="margin:0 0 24px 0;font-size:13px;color:#9ca3af;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
        <p style="margin:0;font-size:14px;color:#6b7280;">
          Need help? Reply to this email — we'll take care of you.<br/>
          — TapAway
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateOtpEmailText(code: string): string {
  return `TapAway — Verification code

Your TapAway verification code is: ${code}

This code expires in 10 minutes.
If you didn't request this, ignore this email.

Need help? Reply to this email.
— TapAway`;
}

// Welcome Email HTML
function generateWelcomeEmailHtml(businessName: string): string {
  const displayName = businessName || "your business";
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f0fdfa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <tr>
      <td style="text-align:center;padding-bottom:24px;">
        <span style="font-size:24px;font-weight:800;color:#0d9488;">TapAway</span><br/>
        <span style="font-size:14px;color:#6b7280;">Setup complete</span>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(13,148,136,0.10);">
        <h1 style="margin:0 0 16px 0;font-size:26px;font-weight:700;color:#111827;text-align:center;">You're all set 🎉</h1>
        <p style="margin:0 0 24px 0;font-size:16px;color:#374151;line-height:1.6;text-align:center;">
          Your TapAway setup for <strong>${displayName}</strong> is complete and your free 30-day trial is active.
        </p>
        <div style="background:#f0fdfa;border-radius:12px;padding:20px;margin-bottom:24px;">
          <h2 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#0d9488;">What happens next</h2>
          <ul style="margin:0;padding:0 0 0 20px;color:#374151;line-height:1.8;font-size:15px;">
            <li>Your NFC cards ship in 1–2 business days</li>
            <li>Your review + social hub is ready to use</li>
            <li>We'll help you optimize anytime you want</li>
          </ul>
        </div>
        <p style="margin:0 0 24px 0;font-size:15px;color:#374151;text-align:center;">
          Need anything? Just reply to this email — we respond fast.
        </p>
        <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;border-top:1px solid #e5e7eb;padding-top:20px;">
          <strong>Trial reminder:</strong> You won't be charged today. Cancel anytime before day 30 if you decide it's not for you.<br/><br/>
          — TapAway
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateWelcomeEmailText(businessName: string): string {
  const displayName = businessName || "your business";
  
  return `TapAway — Setup complete

You're all set 🎉
Your TapAway setup for ${displayName} is complete and your free 30-day trial is active.

What happens next:
- Your NFC cards ship in 1–2 business days
- Your review + social hub is ready to use

Need help? Reply to this email.

Trial reminder: No charge today. Cancel anytime before day 30.
— TapAway`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, businessName } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromEmail = Deno.env.get("EMAIL_FROM") || "TapAway <no-reply@tapaway.co>";
    const testCode = "123456";
    const testBusinessName = businessName || "Test Restaurant";

    // Send OTP email
    console.log("[send-test-emails] Sending OTP email to:", email);
    const otpResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "Your TapAway verification code",
        html: generateOtpEmailHtml(testCode),
        text: generateOtpEmailText(testCode),
        reply_to: "tap@tapaway.co",
      }),
    });

    const otpResult = await otpResponse.json();
    console.log("[send-test-emails] OTP email result:", otpResult);

    // Send Welcome email
    console.log("[send-test-emails] Sending Welcome email to:", email);
    const welcomeResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "You're all set — TapAway is live 🎉",
        html: generateWelcomeEmailHtml(testBusinessName),
        text: generateWelcomeEmailText(testBusinessName),
        reply_to: "tap@tapaway.co",
      }),
    });

    const welcomeResult = await welcomeResponse.json();
    console.log("[send-test-emails] Welcome email result:", welcomeResult);

    return new Response(
      JSON.stringify({
        success: true,
        otp: { id: otpResult.id, status: otpResponse.ok ? "sent" : "failed" },
        welcome: { id: welcomeResult.id, status: welcomeResponse.ok ? "sent" : "failed" },
        from: fromEmail,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-test-emails] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Something went wrong" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
