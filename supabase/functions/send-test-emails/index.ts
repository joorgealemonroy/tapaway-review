import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Shared helpers ──────────────────────────────────────────────────────

function getFromEmail(): string {
  const raw = Deno.env.get("EMAIL_FROM") || "no-reply@tapaway.co";
  return raw.includes("<") ? raw : `TapAway <${raw}>`;
}

async function sendEmail(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  text?: string
) {
  const body: Record<string, unknown> = { from, to: [to], subject, html, reply_to: "tap@tapaway.co" };
  if (text) body.text = text;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) console.error("[send-test-emails] Resend error:", JSON.stringify(json));
  return { id: json.id, ok: res.ok, error: res.ok ? undefined : json };
}

// ── 1. OTP Email ────────────────────────────────────────────────────────

function otpHtml(code: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0fdfa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;padding:40px 20px;">
<tr><td style="text-align:center;padding-bottom:24px;"><span style="font-size:24px;font-weight:800;color:#0d9488;">TapAway</span><br/><span style="font-size:14px;color:#6b7280;">Finish setting up your trial</span></td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:32px;text-align:center;box-shadow:0 4px 24px rgba(13,148,136,0.10);">
<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Your verification code</h1>
<p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Enter this code to continue your TapAway setup:</p>
<div style="background:#f0fdfa;border:2px dashed #0d9488;border-radius:12px;padding:20px;margin-bottom:24px;">
<span style="font-size:36px;font-weight:800;letter-spacing:6px;color:#0d9488;">${code}</span></div>
<p style="margin:0 0 24px;font-size:13px;color:#9ca3af;">This code expires in 10 minutes.</p>
<p style="margin:0;font-size:14px;color:#6b7280;">Need help? Reply to this email.<br/>— TapAway</p>
</td></tr></table></body></html>`;
}

// ── 2. Welcome Email ────────────────────────────────────────────────────

function welcomeHtml(biz: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0fdfa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;padding:40px 20px;">
<tr><td style="text-align:center;padding-bottom:24px;"><span style="font-size:24px;font-weight:800;color:#0d9488;">TapAway</span><br/><span style="font-size:14px;color:#6b7280;">Setup complete</span></td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(13,148,136,0.10);">
<h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#111827;text-align:center;">You're all set 🎉</h1>
<p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;text-align:center;">Your TapAway setup for <strong>${biz}</strong> is complete and your free 30-day trial is active.</p>
<div style="background:#f0fdfa;border-radius:12px;padding:20px;margin-bottom:24px;">
<h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0d9488;">What happens next</h2>
<ul style="margin:0;padding:0 0 0 20px;color:#374151;line-height:1.8;font-size:15px;">
<li>Your NFC cards ship in 1–2 business days</li><li>Your review + social hub is ready to use</li><li>We'll help you optimize anytime</li></ul></div>
<p style="margin:0;font-size:13px;color:#6b7280;text-align:center;border-top:1px solid #e5e7eb;padding-top:20px;">
<strong>Trial reminder:</strong> No charge today. Cancel anytime before day 30.<br/><br/>— TapAway</p>
</td></tr></table></body></html>`;
}

// ── 3. Buyer Purchase Email ─────────────────────────────────────────────

function buyerHtml(title: string, price: string, downloadUrl: string, logoUrl: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0fdfa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;padding:40px 20px;">
<tr><td style="text-align:center;padding-bottom:24px;"><img src="${logoUrl}" alt="TapAway" style="height:32px;" /></td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(13,148,136,0.10);">
<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Your purchase is ready!</h1>
<p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;text-align:center;">Thank you for purchasing <strong>${title}</strong> for ${price}.</p>
<div style="text-align:center;margin-bottom:24px;">
<a href="${downloadUrl}" style="display:inline-block;background:#0d9488;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Download Now</a></div>
<p style="color:#9ca3af;font-size:13px;text-align:center;margin:0;">This download link expires in 72 hours. Need help? Reply to this email.<br/>— TapAway</p>
</td></tr></table></body></html>`;
}

// ── 4. Creator Sale Notification Email ──────────────────────────────────

function creatorHtml(title: string, maskedBuyer: string, price: string, logoUrl: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0fdfa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;padding:40px 20px;">
<tr><td style="text-align:center;padding-bottom:24px;"><img src="${logoUrl}" alt="TapAway" style="height:32px;" /></td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(13,148,136,0.10);">
<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">You made a sale! 🎉</h1>
<p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px;text-align:center;"><strong>${maskedBuyer}</strong> just purchased your product:</p>
<div style="background:#f0fdfa;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
<p style="margin:0 0 4px;font-weight:700;color:#111827;font-size:16px;">${title}</p>
<p style="margin:0;color:#0d9488;font-weight:800;font-size:20px;">${price}</p></div>
<p style="color:#9ca3af;font-size:13px;text-align:center;margin:0;">You can view all your sales in your TapAway dashboard.<br/>— TapAway</p>
</td></tr></table></body></html>`;
}

// ── Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, businessName } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const from = getFromEmail();
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://tapaway.co";
    const logoUrl = `${frontendUrl}/tapaway-logo-email.png`;
    const biz = businessName || "Test Restaurant";
    const results: Record<string, unknown> = {};

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    // 1. OTP
    console.log("[send-test-emails] Sending OTP →", email);
    results.otp = await sendEmail(resendApiKey, from, email, "Your TapAway verification code", otpHtml("123456"));
    await delay(1200);

    // 2. Welcome
    console.log("[send-test-emails] Sending Welcome →", email);
    results.welcome = await sendEmail(resendApiKey, from, email, "You're all set — TapAway is live 🎉", welcomeHtml(biz));
    await delay(1200);

    // 3. Buyer purchase confirmation
    console.log("[send-test-emails] Sending Buyer email →", email);
    const dummyDownload = `${frontendUrl}/#test-download-link`;
    results.buyer = await sendEmail(resendApiKey, from, email, "Your purchase: Premium Growth Course", buyerHtml("Premium Growth Course", "$0.99", dummyDownload, logoUrl));
    await delay(1200);

    // 4. Creator sale notification
    console.log("[send-test-emails] Sending Creator email →", email);
    results.creator = await sendEmail(resendApiKey, from, email, "You made a sale! 🎉", creatorHtml("Premium Growth Course", "te***@example.com", "$0.99", logoUrl));

    return new Response(JSON.stringify({ success: true, from, ...results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[send-test-emails] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
