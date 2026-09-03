// TEMPORARY one-time administrative send. Delete after confirmed success.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { CARD_FRONT_B64 } from "./card-front.ts";
import { CARD_BACK_B64 } from "./card-back.ts";

const TO = "ruizfamilyinc@yahoo.com";
const SUBJECT = "Your Muchas Gracias Mexican Food TapAway page is ready";
const IDEMPOTENCY_KEY = "muchas-gracias-cards-ready-2026-09-03";
const HUB_URL = "https://tapaway.co/muchasgraciasmexicanfood";

const TEXT = `Hi Ismael,

We're excited to let you know that your Muchas Gracias Mexican Food TapAway page is finished and ready:

${HUB_URL}

Your TapAway cards have also been printed. I attached pictures so you can see how they came out, and we'll be shipping them out tomorrow.

Once they arrive, feel free to reach out with any questions or anything you'd like adjusted. I'll personally help make sure everything is set up exactly how you want it.

Please do not reply to this email - it is not monitored.
Email us at tap@tapaway.co or text +1 (909) 285-6321.

You'll also be able to make updates anytime through your TapAway dashboard, but we're always here if you need any help.

Thank you for choosing TapAway - we're excited to have Muchas Gracias Mexican Food on board!

Best,
Jorge
TapAway
https://tapaway.co`;

const HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${SUBJECT}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f9fafb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;">
    <tr><td style="padding:40px 20px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #f3f4f6;">
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#0d9488;">TapAway</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#111827;">Hi Ismael,</p>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4b5563;">We're excited to let you know that your Muchas Gracias Mexican Food TapAway page is finished and ready:</p>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="${HUB_URL}" style="display:inline-block;background-color:#0d9488;color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">View your TapAway page</a>
            <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">${HUB_URL}</p>
          </div>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4b5563;">Your TapAway cards have also been printed. I attached pictures so you can see how they came out, and we'll be shipping them out tomorrow.</p>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4b5563;">Once they arrive, feel free to reach out with any questions or anything you'd like adjusted. I'll personally help make sure everything is set up exactly how you want it.</p>
          <div style="background-color:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:18px 20px;margin:0 0 24px;">
            <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#0f766e;">Please do not reply to this email &mdash; it is not monitored.</p>
            <p style="margin:0;font-size:15px;line-height:1.6;color:#115e59;">Email us at <a href="mailto:tap@tapaway.co" style="color:#0d9488;font-weight:600;">tap@tapaway.co</a> or text <a href="tel:+19092856321" style="color:#0d9488;font-weight:600;">+1 (909) 285-6321</a>.</p>
          </div>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4b5563;">You'll also be able to make updates anytime through your TapAway dashboard, but we're always here if you need any help.</p>
          <p style="margin:0;font-size:16px;line-height:1.6;color:#4b5563;">Thank you for choosing TapAway &mdash; we're excited to have Muchas Gracias Mexican Food on board!</p>
        </td></tr>
        <tr><td style="padding:24px 32px;background-color:#f9fafb;border-top:1px solid #f3f4f6;">
          <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">Best,<br/>Jorge</p>
          <p style="margin:0;font-size:13px;color:#9ca3af;">TapAway &middot; <a href="https://tapaway.co" style="color:#9ca3af;">https://tapaway.co</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

serve(async (req) => {
  const token = req.headers.get("x-admin-invoke-token");
  const expected = Deno.env.get("ONE_TIME_ADMIN_INVOKE_TOKEN");
  if (!expected || !token || token !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") || "TapAway <no-reply@tapaway.co>";
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Idempotency-Key": IDEMPOTENCY_KEY,
    },
    body: JSON.stringify({
      from,
      to: [TO],
      subject: SUBJECT,
      html: HTML,
      text: TEXT,
      attachments: [
        { filename: "muchas-gracias-tapaway-card-front.png", content: CARD_FRONT_B64 },
        { filename: "muchas-gracias-tapaway-card-back.png", content: CARD_BACK_B64 },
      ],
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`Resend send failed [${res.status}]: ${body}`);
    return new Response(JSON.stringify({ ok: false, status: res.status, details: body }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  let id: string | undefined;
  try {
    id = JSON.parse(body)?.id;
  } catch (_e) {
    id = undefined;
  }

  return new Response(JSON.stringify({ ok: true, id, raw: body }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
