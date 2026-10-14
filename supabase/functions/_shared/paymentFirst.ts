// Payment-first onboarding: Stripe mode, catalog and Card Club price.
// PAYMENT_FIRST_STRIPE_MODE defaults to "test" until the owner approves go-live.
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export type Plan = "solo" | "venue";
export type Interval = "month" | "year";
export const ONBOARDING_VERSION = "payment_first_v1";
export const CARD_QUANTITY: Record<Plan, number> = { solo: 4, venue: 15 };
export const TRIAL_DAYS = 14;

type Mode = "test" | "live";
export function stripeMode(): Mode {
  return Deno.env.get("PAYMENT_FIRST_STRIPE_MODE") === "live" ? "live" : "test";
}

const PRICES: Record<Mode, Record<`${Plan}_${Interval}` | "card_club", { id: string; amount: number; interval: Interval }>> = {
  live: {
    solo_month: { id: "price_1UF9UkDg8DaTuVNZfeu06iQ6", amount: 2000, interval: "month" },
    solo_year: { id: "price_1UCl7ZDg8DaTuVNZMQw3XC3g", amount: 19900, interval: "year" },
    venue_month: { id: "price_1TLK31Dg8DaTuVNZu9t79rFA", amount: 3900, interval: "month" },
    venue_year: { id: "price_1UF9UoDg8DaTuVNZKYLiLHl7", amount: 39000, interval: "year" },
    card_club: { id: "price_1TMM0LDg8DaTuVNZUgZ4GtWJ", amount: 500, interval: "month" },
  },
  test: {
    solo_month: { id: "price_1UQOCBDg8DaTuVNZQbcVxN2M", amount: 2000, interval: "month" },
    solo_year: { id: "price_1UQOCBDg8DaTuVNZ7lC5mlkg", amount: 19900, interval: "year" },
    venue_month: { id: "price_1UQOCCDg8DaTuVNZ49I2RTMk", amount: 3900, interval: "month" },
    venue_year: { id: "price_1UQOCCDg8DaTuVNZLnrnkW3G", amount: 39000, interval: "year" },
    card_club: { id: "price_1UQOCCDg8DaTuVNZufOCdQhk", amount: 500, interval: "month" },
  },
};

export function getStripe(): Stripe {
  const key = stripeMode() === "live" ? Deno.env.get("STRIPE_SECRET_KEY") : Deno.env.get("STRIPE_TEST_SECRET_KEY");
  if (!key) throw new Error("Stripe key not configured");
  return new Stripe(key, { apiVersion: "2023-10-16" });
}

export function webhookSecret(): string | undefined {
  return stripeMode() === "live"
    ? Deno.env.get("PAYMENT_FIRST_WEBHOOK_SECRET_LIVE")
    : (Deno.env.get("STRIPE_TEST_WEBHOOK_SECRET") || Deno.env.get("PAYMENT_FIRST_WEBHOOK_SECRET_TEST"));
}

/** Retrieves and validates a configured price. Never trusts client values. */
export async function verifiedPrice(stripe: Stripe, key: `${Plan}_${Interval}` | "card_club") {
  const rule = PRICES[stripeMode()][key];
  const price = await stripe.prices.retrieve(rule.id);
  if (!price.active || price.currency !== "usd" || price.unit_amount !== rule.amount || price.recurring?.interval !== rule.interval) {
    throw new Error(`Price mapping invalid for ${key}`);
  }
  return { id: price.id, amount: rule.amount, interval: rule.interval };
}

export function cardClubPriceId() {
  return PRICES[stripeMode()].card_club.id;
}

export function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

export async function userFromRequest(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const { data } = await admin().auth.getUser(auth.slice(7));
  return data?.user ?? null;
}

export const frontendUrl = () => (Deno.env.get("FRONTEND_URL") || "https://tapaway.co").replace(/\/$/, "");

export async function sendEmail(to: string, subject: string, html: string, text: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) { console.error("[paymentFirst] RESEND_API_KEY missing"); return false; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM") || "TapAway <no-reply@tapaway.co>", to: [to], subject, html, text, reply_to: "tap@tapaway.co" }),
  });
  if (!res.ok) console.error("[paymentFirst] email failed", res.status, await res.text());
  return res.ok;
}

/** Sends a durable magic link that returns the customer to /welcome. */
export async function sendWelcomeLink(email: string, kind: "purchase" | "verify" | "login") {
  const { data, error } = await admin().auth.admin.generateLink({
    type: "magiclink", email, options: { redirectTo: `${frontendUrl()}/welcome` },
  });
  if (error || !data?.properties?.action_link) { console.error("[paymentFirst] link failed", error?.message); return false; }
  const link = data.properties.action_link;
  const subject = kind === "purchase" ? "Your TapAway is being built 🎉"
    : kind === "verify" ? "Confirm your email to finish your TapAway order" : "Your TapAway sign-in link";
  const lead = kind === "purchase"
    ? "Thanks for joining TapAway. We're setting everything up for you now. Our team will gather your business links, build your TapAway page, prepare your cards, and get everything ready to ship."
    : kind === "verify"
      ? "Your payment went through. You already have a TapAway account with this email, so please confirm it's you to attach this order and finish setup."
      : "Use the button below to sign in to TapAway.";
  const html = `<div style="background:#ffffff;font-family:Arial,sans-serif;padding:32px 20px"><div style="max-width:520px;margin:0 auto">
<h1 style="font-size:22px;color:#111">${subject}</h1><p style="font-size:15px;color:#444;line-height:1.6">${lead}</p>
<p><a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600">Access My Dashboard</a></p>
<p style="font-size:12px;color:#888">This link works once. If it expires, open tapaway.co/welcome to get a new one.</p></div></div>`;
  return sendEmail(email, subject, html, `${lead}\n\nAccess My Dashboard: ${link}`);
}

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pf-test-key",
};

/** Payment-first is off for ordinary traffic until GO LIVE (PAYMENT_FIRST_ENABLED=true).
 *  Before that, only requests carrying the private test access key may start a purchase. */
export async function paymentFirstAllowed(req: Request): Promise<boolean> {
  if (Deno.env.get("PAYMENT_FIRST_ENABLED") === "true") return true;
  const key = req.headers.get("x-pf-test-key") || "";
  if (!key || key.length > 64 || stripeMode() !== "test") return false;
  const { data } = await admin().from("payment_first_config").select("test_access_key").eq("id", 1).maybeSingle();
  return !!data?.test_access_key && data.test_access_key === key;
}
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
