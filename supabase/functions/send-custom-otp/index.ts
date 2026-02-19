import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: max 5 sends per 10 minutes per email
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(email);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true };
}

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("[send-custom-otp] RESEND_API_KEY not configured");
    return false;
  }

  const rawFrom = Deno.env.get("EMAIL_FROM") || "no-reply@tapaway.co";
  const fromEmail = rawFrom.includes("<") ? rawFrom : `TapAway <${rawFrom}>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
        text,
        reply_to: "tap@tapaway.co",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[send-custom-otp] Resend API error:", errorText);
      return false;
    }

    const data = await response.json();
    console.log("[send-custom-otp] Email sent via Resend:", data.id);
    return true;
  } catch (error) {
    console.error("[send-custom-otp] Error sending email:", error);
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

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log("[send-custom-otp] Generating OTP for:", normalizedEmail);

    // Check rate limit
    const rateCheck = checkRateLimit(normalizedEmail);
    if (!rateCheck.allowed) {
      console.log("[send-custom-otp] Rate limit exceeded for:", normalizedEmail);
      return new Response(
        JSON.stringify({ 
          error: "Too many requests. Please try again later.", 
          retryAfterSeconds: rateCheck.retryAfterSeconds 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate OTP code
    const code = generateOtpCode();
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTPs for this email
    await supabase
      .from("pending_otps")
      .delete()
      .eq("email", normalizedEmail);

    // Insert new OTP (store hashed code)
    const { error: insertError } = await supabase
      .from("pending_otps")
      .insert({
        email: normalizedEmail,
        code: codeHash,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("[send-custom-otp] Error inserting OTP:", insertError);
      throw new Error("Failed to generate verification code");
    }

    // Send email
    const rawFromLog = Deno.env.get("EMAIL_FROM") || "no-reply@tapaway.co";
    const fromEmailLog = rawFromLog.includes("<") ? rawFromLog : `TapAway <${rawFromLog}>`;
    console.log("[send-custom-otp] Dispatching email", {
      email: normalizedEmail,
      ts: new Date().toISOString(),
      type: "otp",
      provider: "resend",
      from: fromEmailLog,
    });

    const html = generateOtpEmailHtml(code);
    const text = generateOtpEmailText(code);
    const sent = await sendEmail(normalizedEmail, "Your TapAway verification code", html, text);

    if (!sent) {
      throw new Error("Failed to send verification email");
    }

    console.log("[send-custom-otp] OTP sent successfully", {
      email: normalizedEmail,
      ts: new Date().toISOString(),
      type: "otp",
      from: fromEmailLog,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-custom-otp] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Something went wrong" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
