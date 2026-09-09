// Shared TapAway email library — the single send path for all transactional
// email. Every send renders a branded template (or caller-supplied HTML for
// one-off internal notices), POSTs to Resend, and writes a row to the
// public.email_sends log table. Bodies are NEVER logged — only the
// recipient, template key, subject, status, Resend id, and error.
//
// Migration pattern for existing functions (5 lines):
//
//   import { sendTemplatedEmail } from "../_shared/email.ts";
//   ...
//   const result = await sendTemplatedEmail({
//     to: customerEmail,
//     templateKey: "welcome",          // one of the TEMPLATES keys below
//     vars: { name, businessName, hubUrl, dashboardUrl },
//     // profileId: profile.id,        // optional: correlation for dedup
//   });
//   if (!result.ok) console.error("welcome email failed:", result.error);
//
// For one-off internal/operational emails that don't fit a template, use
// sendEmailAndLog() directly with templateKey "internal" (or a descriptive
// key) and your own subject/html — you still get send logging for free.
import { escapeHtml } from "./sanitize.ts";

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "TapAway <hello@tapaway.co>";
const SITE_URL = "https://tapaway.co";

// ─────────────────────────────────────────────────────────────
// Brand wrapper: one consistent, professional look for every
// customer-facing email. Light theme, 600px max, fluid on mobile,
// green CTA, casual-but-confident copy. NOT slop.
// ─────────────────────────────────────────────────────────────

const BRAND_CSS = `
  .ta-outer { margin:0; padding:0; background:#f3f4f6; }
  .ta-card { background:#ffffff; border-radius:16px; overflow:hidden; }
  .ta-btn { display:inline-block; background:#6BCB77; color:#0b0f0c !important;
    font-size:16px; font-weight:700; padding:14px 32px; border-radius:10px;
    text-decoration:none; }
  .ta-muted { color:#6b7280; }
`;

interface WrapArgs {
  preheader: string;
  headline: string;
  introHtml: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

function wrapEmail(a: WrapArgs): string {
  const cta = a.ctaLabel && a.ctaUrl
    ? `<p style="margin:28px 0;text-align:center;">
         <a href="${a.ctaUrl}" class="ta-btn">${a.ctaLabel}</a>
       </p>`
    : "";
  const footer = a.footerNote
    ? `<p style="margin:24px 0 0 0;font-size:13px;color:#9ca3af;line-height:1.6;
        border-top:1px solid #e5e7eb;padding-top:20px;text-align:center;">${a.footerNote}</p>`
    : "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${BRAND_CSS}</style></head>
<body class="ta-outer" style="margin:0;padding:0;background:#f3f4f6;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${a.preheader}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"
  style="max-width:600px;margin:0 auto;">
<tr><td style="text-align:center;padding-bottom:24px;">
  <span style="font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.5px;">TapAway<span style="color:#6BCB77;">.</span></span>
</td></tr>
<tr><td class="ta-card" style="background:#ffffff;border-radius:16px;overflow:hidden;
  box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <div style="padding:36px 32px;">
    <h1 style="margin:0 0 16px 0;font-size:26px;font-weight:800;color:#111827;
      line-height:1.25;">${a.headline}</h1>
    <div style="font-size:16px;color:#374151;line-height:1.65;">
      ${a.introHtml}
      ${a.bodyHtml}
    </div>
    ${cta}
    ${footer}
  </div>
</td></tr>
<tr><td style="text-align:center;padding-top:24px;">
  <p style="margin:0 0 6px 0;font-size:12px;color:#9ca3af;">
    TapAway — tap a card, grow your business.</p>
  <p style="margin:0;font-size:12px;color:#9ca3af;">
    Questions? Just reply to this email — a human reads every one.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ─────────────────────────────────────────────────────────────
// Template registry
// ─────────────────────────────────────────────────────────────

export type TemplateVars = Record<string, string | number | undefined | null>;

export interface EmailTemplate {
  key: string;
  subject: (v: TemplateVars) => string;
  preheader: (v: TemplateVars) => string;
  html: (v: TemplateVars) => string;
  text: (v: TemplateVars) => string;
}

const DASHBOARD_URL = `${SITE_URL}/dashboard`;
const REPLY_FOOTER =
  "You're getting this because you signed up for TapAway. Reply anytime — we actually read these.";

function stepsList(items: string[]): string {
  return `<div style="background:#f0fdf4;border-radius:12px;padding:20px 20px 20px 22px;margin:20px 0;">
    <ul style="margin:0;padding:0 0 0 20px;color:#374151;line-height:1.9;font-size:15px;">
      ${items.map((i) => `<li>${i}</li>`).join("")}
    </ul></div>`;
}

function billingBox(lines: string[]): string {
  return `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;
    padding:20px;margin:20px 0;font-size:15px;color:#374151;line-height:1.7;">
    ${lines.join("<br>")}</div>`;
}

export const TEMPLATES: Record<string, EmailTemplate> = {
  // a. Just signed up — what happens next.
  welcome: {
    key: "welcome",
    subject: () => "You're in — here's what happens next 🎉",
    preheader: () =>
      "Your hub is live, your cards are being made, and your 14-day trial just started.",
    html: (v) =>
      wrapEmail({
        preheader: "Your hub is live, your cards are being made, and your 14-day trial just started.",
        headline: `Welcome to TapAway, ${v.name || "friend"} 👋`,
        introHtml: `<p style="margin:0 0 8px 0;">Your setup for <strong>${v.businessName || "your business"}</strong> is complete and your free 14-day trial is on. Here's the play-by-play:</p>`,
        bodyHtml: stepsList([
          `<strong>Your cards are being made</strong> — they ship in 1–2 business days.`,
          `<strong>Your hub is already live</strong> — every tap or scan lands customers on your reviews, links, and info.`,
          `<strong>Nothing to install, nothing to train</strong> — set the cards by the register and let them work.`,
        ]) +
          `<p style="margin:0;">Want a head start? Open your dashboard and make sure your hub looks exactly how you want it.</p>`,
        ctaLabel: "Open my dashboard",
        ctaUrl: String(v.dashboardUrl || DASHBOARD_URL),
        footerNote:
          `Trial reminder: you won't be charged today. Cancel anytime before day 14 if it's not for you.<br><br>${REPLY_FOOTER}`,
      }),
    text: (v) =>
      `TapAway — You're in 🎉\n\nWelcome, ${v.name || "friend"}! Your setup for ${v.businessName || "your business"} is complete and your free 14-day trial is on.\n\nWhat happens next:\n- Your cards are being made — they ship in 1–2 business days.\n- Your hub is already live.\n- Nothing to install or train.\n\nOpen your dashboard: ${v.dashboardUrl || DASHBOARD_URL}\n\nTrial reminder: you won't be charged today. Cancel anytime before day 14.\n— TapAway`,
  },

  // a2. Just signed up with NO trial — paid today (discount pay links, any
  // immediate-charge checkout). Same vars as `welcome`, but honest copy:
  // the card WAS charged and the subscription is already active. Picked by
  // finalize-onboarding when subscription_status is already 'active'.
  welcome_paid: {
    key: "welcome_paid",
    subject: () => "You're in — here's what happens next 🎉",
    preheader: () =>
      "Your hub is live, your cards are being made, and your subscription is active.",
    html: (v) =>
      wrapEmail({
        preheader: "Your hub is live, your cards are being made, and your subscription is active.",
        headline: `Welcome to TapAway, ${v.name || "friend"} 👋`,
        introHtml: `<p style="margin:0 0 8px 0;">Your setup for <strong>${v.businessName || "your business"}</strong> is complete and your subscription is <strong>active now</strong> — your card was charged today. Here's the play-by-play:</p>`,
        bodyHtml: stepsList([
          `<strong>Your cards are being made</strong> — they ship in 1–2 business days.`,
          `<strong>Your hub is already live</strong> — every tap or scan lands customers on your reviews, links, and info.`,
          `<strong>Nothing to install, nothing to train</strong> — set the cards by the register and let them work.`,
        ]) +
          `<p style="margin:0;">Want a head start? Open your dashboard and make sure your hub looks exactly how you want it.</p>`,
        ctaLabel: "Open my dashboard",
        ctaUrl: String(v.dashboardUrl || DASHBOARD_URL),
        footerNote:
          `Your subscription renews monthly — no trial, no surprises. Cancel anytime from your dashboard.<br><br>${REPLY_FOOTER}`,
      }),
    text: (v) =>
      `TapAway — You're in 🎉\n\nWelcome, ${v.name || "friend"}! Your setup for ${v.businessName || "your business"} is complete and your subscription is active now — your card was charged today.\n\nWhat happens next:\n- Your cards are being made — they ship in 1–2 business days.\n- Your hub is already live.\n- Nothing to install or train.\n\nOpen your dashboard: ${v.dashboardUrl || DASHBOARD_URL}\n\nYour subscription renews monthly — no trial, no surprises. Cancel anytime.\n— TapAway`,
  },

  // b. Cards printed — the fulfillment pipeline hit the printed stage.
  card_printed: {
    key: "card_printed",
    subject: (v) => `Your cards just came off the printer 🖨️`,
    preheader: () =>
      "They're real, they're yours, and they're one step closer to your counter.",
    html: (v) =>
      wrapEmail({
        preheader: "They're real, they're yours, and they're one step closer to your counter.",
        headline: "Hot off the printer 🖨️",
        introHtml: `<p style="margin:0 0 8px 0;">Good news, ${v.name || "friend"} — your TapAway NFC cards for <strong>${v.businessName || "your business"}</strong> just came off the printer.</p>`,
        bodyHtml:
          `<p style="margin:0 0 8px 0;">Here's what's happening now:</p>` +
          stepsList([
            `<strong>We're activating your cards</strong> so every tap opens your hub.`,
            `<strong>Then they're headed your way</strong> — you'll get another email the moment they're on the move.`,
          ]) +
          `<p style="margin:0;">While you wait, take 2 minutes to preview your hub — it's what every customer will see.</p>`,
        ctaLabel: "Preview my hub",
        ctaUrl: String(v.hubUrl || SITE_URL),
        footerNote: REPLY_FOOTER,
      }),
    text: (v) =>
      `TapAway — Hot off the printer 🖨️\n\nGood news, ${v.name || "friend"} — your TapAway NFC cards for ${v.businessName || "your business"} just came off the printer.\n\nWhat's next:\n- We're activating your cards so every tap opens your hub.\n- Then they're headed your way.\n\nPreview your hub: ${v.hubUrl || SITE_URL}\n— TapAway`,
  },

  // c. Cards delivered / on the way. Pass deliveryNote to stay honest about
  // which one it is ("They shipped — landing in 1–2 days" vs "They're in
  // your hands").
  card_delivered: {
    key: "card_delivered",
    subject: () => "Your TapAway cards are officially yours 🎉",
    preheader: (v) =>
      String(v.deliveryNote || "They're in your hands — time to put them to work."),
    html: (v) =>
      wrapEmail({
        preheader: String(v.deliveryNote || "They're in your hands — time to put them to work."),
        headline: "Your cards are officially yours 🎉",
        introHtml: `<p style="margin:0 0 8px 0;">${v.deliveryNote || `Your TapAway cards for <strong>${v.businessName || "your business"}</strong> are delivered — in your hands and ready to work.`}</p>`,
        bodyHtml:
          `<p style="margin:0 0 8px 0;">The #1 move that gets the first taps:</p>` +
          stepsList([
            `<strong>Put a card by the register</strong> — right where customers pay and wait.`,
            `<strong>Tell your team the one-liner:</strong> "Tap that card to leave us a quick review — it takes 10 seconds."`,
            `<strong>Watch the taps roll in</strong> from your dashboard.`,
          ]) +
          `<p style="margin:0;">Questions about placement or setup? Reply to this email — we'll sort it out together.</p>`,
        ctaLabel: "Open my dashboard",
        ctaUrl: String(v.dashboardUrl || DASHBOARD_URL),
        footerNote: REPLY_FOOTER,
      }),
    text: (v) =>
      `TapAway — Your cards are officially yours 🎉\n\n${v.deliveryNote || `Your TapAway cards for ${v.businessName || "your business"} are delivered.`}\n\nThe #1 move for first taps:\n- Put a card by the register.\n- Tell your team: "Tap that card to leave us a quick review — it takes 10 seconds."\n- Watch the taps roll in from your dashboard: ${v.dashboardUrl || DASHBOARD_URL}\n— TapAway`,
  },

  // d. Trial has 3 days left (sent on day 11). Billing-focused angle —
  // distinct from the day 3/10/13 trial-followup SMS sequence.
  trial_ending: {
    key: "trial_ending",
    subject: () => "3 days left — here's exactly what happens on day 14",
    preheader: (v) =>
      `Your card gets charged ${v.amount || "your plan rate"} on ${v.chargeDate || "day 14"}. Keep it going or cancel — your call.`,
    html: (v) =>
      wrapEmail({
        preheader: `Your card gets charged ${v.amount || "your plan rate"} on ${v.chargeDate || "day 14"}.`,
        headline: "Your trial ends in 3 days",
        introHtml: `<p style="margin:0 0 8px 0;">Hey ${v.name || "friend"} — quick, no-surprises rundown on what's about to happen with <strong>${v.businessName || "your business"}</strong>:</p>`,
        bodyHtml:
          billingBox([
            `📅 <strong>On ${v.chargeDate || "day 14"}</strong>, your card on file will be charged <strong>${v.amount || "your plan's monthly rate"}</strong>.`,
            `🔁 After that, your subscription continues month to month. Your hub and cards keep working, no interruption.`,
            `🚪 <strong>Not feeling it?</strong> Cancel from your dashboard before ${v.chargeDate || "day 14"} and you pay nothing. No hard feelings, no hoops.`,
          ]) +
          `<p style="margin:0;">If TapAway's been earning its keep — reviews coming in, customers tapping — you don't need to do a thing. It just keeps working.</p>`,
        ctaLabel: "Review my plan",
        ctaUrl: String(v.dashboardUrl || DASHBOARD_URL),
        footerNote: `This is a one-time heads-up, not the start of a drip campaign.<br><br>${REPLY_FOOTER}`,
      }),
    text: (v) =>
      `TapAway — Your trial ends in 3 days\n\nHey ${v.name || "friend"} — here's exactly what happens with ${v.businessName || "your business"}:\n\n- On ${v.chargeDate || "day 14"}, your card on file will be charged ${v.amount || "your plan's monthly rate"}.\n- After that, your subscription continues month to month. No interruption.\n- Not feeling it? Cancel from your dashboard before ${v.chargeDate || "day 14"} and you pay nothing.\n\nReview your plan: ${v.dashboardUrl || DASHBOARD_URL}\n— TapAway`,
  },

  // e. A subscription payment failed — update the card.
  payment_failed: {
    key: "payment_failed",
    subject: () => "Your card didn't go through — 30-second fix 💳",
    preheader: () => "Update your payment info to keep your hub live.",
    html: (v) =>
      wrapEmail({
        preheader: "Update your payment info to keep your hub live.",
        headline: "Quick payment hiccup",
        introHtml: `<p style="margin:0 0 8px 0;">Hey ${v.name || "friend"} — we tried to charge${v.amount ? ` <strong>${v.amount}</strong>` : ""} for <strong>${v.businessName || "your TapAway plan"}</strong> and your card said no. Happens all the time — expired cards, new numbers, bank being cautious.</p>`,
        bodyHtml:
          `<p style="margin:0 0 8px 0;">The fix takes 30 seconds:</p>` +
          stepsList([
            `<strong>Open your dashboard</strong> and head to Billing.`,
            `<strong>Update your card</strong> — we'll retry automatically.`,
          ]) +
          `<p style="margin:0;">Your hub stays live for now, but update it soon so nothing pauses. If the card looks fine on your end, reply to this email and we'll dig in.</p>`,
        ctaLabel: "Update my card",
        ctaUrl: String(v.dashboardUrl || DASHBOARD_URL),
        footerNote: REPLY_FOOTER,
      }),
    text: (v) =>
      `TapAway — Quick payment hiccup\n\nHey ${v.name || "friend"} — we tried to charge${v.amount ? ` ${v.amount}` : ""} for ${v.businessName || "your TapAway plan"} and your card said no.\n\nFix it in 30 seconds: open your dashboard and update your card under Billing: ${v.dashboardUrl || DASHBOARD_URL}\n\nYour hub stays live for now, but update it soon so nothing pauses.\n— TapAway`,
  },

  // f. Van-sale password setup. Same copy as the send-van-handoff email
  // (HANDOFF.md) — unified look via the brand wrapper. The setup link is
  // passed as a var; links are never written to any log.
  password_setup: {
    key: "password_setup",
    subject: () => "Your TapAway hub is ready — create your password",
    preheader: () => "One click, one password, and your dashboard is yours.",
    html: (v) =>
      wrapEmail({
        preheader: "One click, one password, and your dashboard is yours.",
        headline: "Your hub is ready",
        introHtml: `<p style="margin:0;">Hey ${v.firstName || "there"} — your TapAway hub for <strong>${v.business || "your business"}</strong> is live! Create your password below to take over your dashboard.</p>`,
        bodyHtml: "",
        ctaLabel: "Create my password",
        ctaUrl: String(v.setupLink || SITE_URL),
        footerNote:
          "This link expires soon and only works once. If you didn't just sign up with Jorge in person, you can safely ignore this email.",
      }),
    text: (v) =>
      `TapAway — Your hub is ready\n\nHey ${v.firstName || "there"},\n\nYour TapAway hub for ${v.business || "your business"} is live! Create your password here:\n\n${v.setupLink || SITE_URL}\n\nThis link expires soon and only works once. If you didn't just sign up with Jorge in person, you can safely ignore this email.\n\n— TapAway`,
  },

  // g. Generic layout for Jorge's manual sends: headline + body + CTA.
  // body is plain text — blank lines become paragraphs (escaped first, so safe).
  feature_update: {
    key: "feature_update",
    subject: (v) => String(v.subject || "Something new from TapAway"),
    preheader: (v) => String(v.preheader || ""),
    html: (v) => {
      const paras = String(v.body || "")
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map(
          (p) =>
            `<p style="margin:0 0 14px 0;">${p.replace(/\n/g, "<br>")}</p>`,
        )
        .join("");
      return wrapEmail({
        preheader: String(v.preheader || ""),
        headline: String(v.headline || "Quick update"),
        introHtml: `<p style="margin:0 0 8px 0;">Hey ${v.name || "friend"} —</p>`,
        bodyHtml: paras || "<p>Details inside.</p>",
        ctaLabel: v.ctaLabel ? String(v.ctaLabel) : undefined,
        ctaUrl: v.ctaUrl ? String(v.ctaUrl) : undefined,
        footerNote: REPLY_FOOTER,
      });
    },
    text: (v) =>
      `TapAway — ${v.headline || "Quick update"}\n\nHey ${v.name || "friend"} —\n\n${v.body || ""}\n\n${v.ctaUrl || ""}\n— TapAway`,
  },

  // hub_ready. Sent when Jorge finishes building a client's hub — the
  // "we'll text and email you the moment your hub is ready" promise from
  // signup. Fired by the send-hub-ready function from the admin.
  // Vars: name, username, hubUrl.
  hub_ready: {
    key: "hub_ready",
    subject: (v) => `Your TapAway hub is ready 🎉`,
    preheader: () =>
      "We built it for you — here's your link, ready to share.",
    html: (v) =>
      wrapEmail({
        preheader: "We built it for you — here's your link, ready to share.",
        headline: `Your hub is ready 🎉`,
        introHtml: `<p style="margin:0 0 8px 0;">Hey ${v.name || "friend"} — great news. We just finished building your TapAway hub and it's live right now.</p>`,
        bodyHtml:
          `<p style="margin:0 0 8px 0;">This is the page every customer will land on when they tap your card or scan your QR code. Take a look:</p>` +
          stepsList([
            `<strong>Your reviews</strong> — one tap takes customers straight to Google.`,
            `<strong>Your links</strong> — socials, menu, directions, everything in one place.`,
            `<strong>Your look</strong> — we matched it to your brand.`,
          ]) +
          `<p style="margin:0;">Want anything changed — colors, links, wording? Just reply to this email and we'll take care of it.</p>`,
        ctaLabel: "View my hub",
        ctaUrl: String(v.hubUrl || SITE_URL),
        footerNote: REPLY_FOOTER,
      }),
    text: (v) =>
      `TapAway — Your hub is ready 🎉\n\nHey ${v.name || "friend"} — great news. We just finished building your TapAway hub and it's live right now.\n\nThis is the page every customer will land on when they tap your card or scan your QR code:\n${v.hubUrl || SITE_URL}\n\nWant anything changed — colors, links, wording? Just reply and we'll take care of it.\n— TapAway`,
  },
};

// ─────────────────────────────────────────────────────────────
// Send + log
// ─────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  /** Log key: a TEMPLATES key, or "internal" / descriptive key for one-offs. */
  templateKey: string;
  /** Optional account correlation — powers dedup checks without extra queries. */
  profileId?: string | null;
  attachments?: Array<{ filename: string; content: string }>;
}

export interface SendEmailResult {
  ok: boolean;
  resendId?: string;
  error?: string;
}

function getLogClient(): Promise<any | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.warn("[email] SUPABASE_URL/SERVICE_ROLE_KEY missing — skipping email_sends log");
    return Promise.resolve(null);
  }
  return import("https://esm.sh/@supabase/supabase-js@2").then((mod) =>
    mod.createClient(url, key, { auth: { persistSession: false } }),
  );
}

/**
 * Sends an email via Resend and logs it to public.email_sends.
 * Never logs bodies. Logging is best-effort — a log failure never fails the send.
 */
export async function sendEmailAndLog(opts: SendEmailOptions): Promise<SendEmailResult> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const toList = Array.isArray(opts.to) ? opts.to : [opts.to];
  const primaryTo = toList[0] || "";

  if (!resendApiKey) {
    const error = "RESEND_API_KEY is not configured";
    console.error("[email]", error);
    await logSend(opts, primaryTo, "failed", null, error);
    return { ok: false, error };
  }

  let resendId: string | undefined;
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: opts.from || Deno.env.get("EMAIL_FROM") || DEFAULT_FROM,
        to: toList,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
        subject: opts.subject,
        html: opts.html,
        ...(opts.text ? { text: opts.text } : {}),
        ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      const error = `Resend HTTP ${res.status}: ${errText.slice(0, 300)}`;
      console.error("[email] Resend error:", error);
      await logSend(opts, primaryTo, "failed", null, error);
      return { ok: false, error };
    }
    const data = await res.json();
    resendId = data?.id;
    console.log("[email] sent", { to: primaryTo, template: opts.templateKey, resendId });
    await logSend(opts, primaryTo, "sent", resendId || null, null);
    return { ok: true, resendId };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown error";
    console.error("[email] send failed:", error);
    await logSend(opts, primaryTo, "failed", null, error);
    return { ok: false, error };
  }
}

export interface EmailLogRow {
  to_email: string;
  template_key: string;
  subject: string;
  status: "sent" | "failed" | "bounced";
  resend_id?: string | null;
  error?: string | null;
  profile_id?: string | null;
}

/** Best-effort insert into public.email_sends. Never throws. */
export async function logEmailSend(row: EmailLogRow): Promise<void> {
  try {
    const client = await getLogClient();
    if (!client) return;
    const { error: dbErr } = await client.from("email_sends").insert({
      to_email: row.to_email,
      template_key: row.template_key,
      subject: row.subject,
      status: row.status,
      resend_id: row.resend_id || null,
      error: row.error || null,
      profile_id: row.profile_id || null,
    });
    if (dbErr) console.error("[email] email_sends insert failed:", dbErr.message);
  } catch (e) {
    console.error("[email] email_sends insert threw:", e instanceof Error ? e.message : e);
  }
}

async function logSend(
  opts: SendEmailOptions,
  toEmail: string,
  status: "sent" | "failed",
  resendId: string | null,
  error: string | null,
): Promise<void> {
  await logEmailSend({
    to_email: toEmail,
    template_key: opts.templateKey,
    subject: opts.subject,
    status,
    resend_id: resendId,
    error,
    profile_id: opts.profileId || null,
  });
}

/** Renders a registered template (vars HTML-escaped). Throws on unknown key. */
export function renderTemplate(
  templateKey: string,
  vars?: TemplateVars,
): { subject: string; preheader: string; html: string; text: string; key: string } {
  const template = TEMPLATES[templateKey];
  if (!template) throw new Error(`Unknown email template: ${templateKey}`);
  const raw = vars || {};
  const v: TemplateVars = {};
  for (const [k, val] of Object.entries(raw)) {
    v[k] = typeof val === "string" ? escapeHtml(val) : val;
  }
  return {
    subject: template.subject(v),
    preheader: template.preheader(v),
    html: template.html(v),
    text: template.text(v),
    key: template.key,
  };
}

export interface TemplatedEmailOptions {
  to: string | string[];
  templateKey: keyof typeof TEMPLATES | string;
  vars?: TemplateVars;
  from?: string;
  replyTo?: string;
  profileId?: string | null;
}

/**
 * Renders a registered template (all vars HTML-escaped) and sends it via
 * sendEmailAndLog. Throws on unknown templateKey — fail loud, not silent.
 */
export async function sendTemplatedEmail(opts: TemplatedEmailOptions): Promise<SendEmailResult> {
  const template = TEMPLATES[opts.templateKey];
  if (!template) throw new Error(`Unknown email template: ${opts.templateKey}`);
  const rendered = renderTemplate(opts.templateKey, opts.vars);
  return sendEmailAndLog({
    to: opts.to,
    from: opts.from,
    replyTo: opts.replyTo,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    templateKey: rendered.key,
    profileId: opts.profileId,
  });
}

/** Convenience: has this profile already received this template (sent, not failed)? */
export async function alreadySentTemplate(
  profileId: string,
  templateKey: string,
): Promise<boolean> {
  try {
    const client = await getLogClient();
    if (!client) return false;
    const { data, error } = await client
      .from("email_sends")
      .select("id")
      .eq("profile_id", profileId)
      .eq("template_key", templateKey)
      .eq("status", "sent")
      .limit(1);
    if (error) {
      console.error("[email] dedup check failed:", error.message);
      return false;
    }
    return (data?.length || 0) > 0;
  } catch (e) {
    console.error("[email] dedup check threw:", e instanceof Error ? e.message : e);
    return false;
  }
}
