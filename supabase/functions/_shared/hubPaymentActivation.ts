import Stripe from "https://esm.sh/stripe@14.21.0";
import { admin, frontendUrl, stripeMode } from "./paymentFirst.ts";
import { ONBOARDING_CATALOG_RULES } from "./onboardingCatalog.ts";
import { sendEmailAndLog, wrapEmail } from "./email.ts";
import { escapeHtml } from "./sanitize.ts";

export const HUB_PAYMENT_VERSION = "hub_payment_v1";
const idOf = (value: any): string | null => typeof value === "string" ? value : value?.id || null;
const soloPrice = ONBOARDING_CATALOG_RULES.find(rule => rule.plan === "solo" && rule.interval === "month")!;

async function paidInvoice(stripe: Stripe, sub: Stripe.Subscription): Promise<boolean> {
  const id = idOf(sub.latest_invoice);
  if (!id) return false;
  const invoice = typeof sub.latest_invoice === "object" && sub.latest_invoice
    ? sub.latest_invoice : await stripe.invoices.retrieve(id);
  if (invoice.status !== "paid" || invoice.paid !== true || invoice.livemode !== true || invoice.currency !== "usd"
    || invoice.amount_paid < soloPrice.amount || idOf(invoice.customer) !== idOf(sub.customer)
    || idOf(invoice.subscription) !== sub.id) return false;
  const paymentId = idOf(invoice.payment_intent);
  if (!paymentId) return false;
  const payment = await stripe.paymentIntents.retrieve(paymentId, { expand: ["latest_charge"] });
  if (!payment.livemode || payment.status !== "succeeded" || payment.currency !== "usd"
    || payment.amount_received < soloPrice.amount || idOf(payment.customer) !== idOf(sub.customer)) return false;
  const chargeId = idOf(payment.latest_charge);
  if (!chargeId) return false;
  const charge = typeof payment.latest_charge === "object" && payment.latest_charge
    ? payment.latest_charge : await stripe.charges.retrieve(chargeId);
  return charge.livemode === true && charge.paid === true && idOf(charge.payment_intent) === paymentId
    && !charge.refunded && !charge.disputed && charge.amount_refunded === 0;
}

/** Validate the current subscription, not an earlier paid checkout snapshot. */
async function currentSubscription(stripe: Stripe, id: string) {
  const sub = await stripe.subscriptions.retrieve(id, { expand: ["latest_invoice"] });
  if (stripeMode() !== "live" || sub.livemode !== true) throw new Error("Hub payment environment mismatch");
  return sub;
}

/** Only a signed payment webhook calls this. The browser's return URL is read-only. */
export async function activateHubPayment(stripe: Stripe, supplied: Stripe.Checkout.Session) {
  if (supplied.metadata?.commerce_version !== HUB_PAYMENT_VERSION) return { skipped: "other_checkout" };
  if (stripeMode() !== "live" || supplied.livemode !== true) throw new Error("Hub payment environment mismatch");
  const session = await stripe.checkout.sessions.retrieve(supplied.id);
  if (session.livemode !== true || session.metadata?.commerce_version !== HUB_PAYMENT_VERSION) throw new Error("Hub checkout mismatch");
  if (session.mode !== "subscription" || session.status !== "complete" || session.payment_status !== "paid") return { skipped: "not_paid" };
  const profileId = session.metadata.profile_id;
  const version = session.metadata.request_version;
  const subscriptionId = idOf(session.subscription);
  const customerId = idOf(session.customer);
  const email = (session.customer_details?.email || session.customer_email || "").trim().toLowerCase();
  if (!profileId || !version || !subscriptionId || !customerId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Incomplete hub payment details");

  const db = admin();
  const { data: request, error } = await db.from("hub_payment_requests").select("*").eq("profile_id", profileId).eq("request_version", version).maybeSingle();
  if (error || !request || request.stripe_checkout_session_id !== session.id) throw error || new Error("Hub payment request mismatch");
  if (request.payment_hold_at) return { skipped: "payment_review" };
  const sub = await currentSubscription(stripe, subscriptionId);
  const item = sub.items.data[0];
  if (idOf(sub.customer) !== customerId || sub.metadata?.commerce_version !== HUB_PAYMENT_VERSION
    || sub.metadata.profile_id !== profileId || sub.metadata.request_version !== version
    || sub.items.data.length !== 1 || item?.quantity !== 1 || item.price.id !== soloPrice.priceId
    || item.price.unit_amount !== soloPrice.amount || item.price.currency !== "usd"
    || item.price.recurring?.interval !== "month" || item.price.recurring.interval_count !== 1) {
    throw new Error("Purchased hub subscription mismatch");
  }
  if (sub.status !== "active" || !(await paidInvoice(stripe, sub))) return { skipped: "subscription_not_paid" };
  const result = await db.rpc("fulfill_hub_payment", {
    _profile_id: profileId, _request_version: version, _session_id: session.id,
    _subscription_id: subscriptionId, _customer_id: customerId, _billing_email: email,
  });
  if (result.error) throw result.error;
  if (result.data?.held === true || result.data?.reviewRequired === true) return { skipped: "payment_review" };
  if (result.data?.activated !== true) throw new Error("Hub payment fulfillment was not saved");
  await deliverHubPaymentReceipt(db, profileId, version, email);
  return { activated: true };
}

/** Finds pending invoice-first payments as well as established hub subscriptions. */
export async function syncHubPaymentSubscription(stripe: Stripe, subscriptionId: string): Promise<boolean> {
  const db = admin();
  const { data: associated, error } = await db.from("hub_payment_requests").select("*").eq("stripe_subscription_id", subscriptionId).maybeSingle();
  if (error) throw error;
  if (associated?.payment_hold_at) return true;
  // Metadata is necessary when invoice.paid arrives before checkout.completed.
  const sub = associated ? await currentSubscription(stripe, subscriptionId) : await stripe.subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] });
  if (!associated && sub.metadata?.commerce_version !== HUB_PAYMENT_VERSION) return false;
  if (stripeMode() !== "live" || sub.livemode !== true) throw new Error("Hub payment environment mismatch");
  let request = associated;
  if (!request) {
    const found = await db.from("hub_payment_requests").select("*")
      .eq("profile_id", sub.metadata.profile_id).eq("request_version", sub.metadata.request_version).maybeSingle();
    if (found.error || !found.data) throw found.error || new Error("Hub payment request missing");
    request = found.data;
  }
  if (request.payment_hold_at) return true;
  if (!request.fulfilled_at) {
    if (!request.stripe_checkout_session_id) throw new Error("Hub checkout persistence pending; retry");
    const session = await stripe.checkout.sessions.retrieve(request.stripe_checkout_session_id);
    if (idOf(session.subscription) !== subscriptionId) throw new Error("Hub invoice checkout mismatch");
    await activateHubPayment(stripe, session);
    return true;
  }
  // A failed/delayed recurring invoice cannot keep an active Stripe status entitled.
  const status = sub.status === "active" && !(await paidInvoice(stripe, sub)) ? "past_due" : sub.status;
  const saved = await db.from("personal_profiles").update({ subscription_status: status, trial_ends_at: null })
    .eq("id", request.profile_id).eq("stripe_subscription_id", subscriptionId).eq("payment_state", "paying").select("id");
  if (saved.error) throw saved.error;
  if (!saved.data?.length) return true;
  // An invoice-first activation may have committed before its email failed.
  // Retrying that same invoice must finish delivery, not silently acknowledge it.
  if (status === "active" && !request.welcome_email_sent_at) {
    const session = await stripe.checkout.sessions.retrieve(request.stripe_checkout_session_id);
    await activateHubPayment(stripe, session);
  }
  return true;
}

/** Match a verified provider charge to this exact fulfilled flow before holding. */
export async function holdHubPaymentForCharge(stripe: Stripe, type: string, eventId: string, charge: Record<string, any>, subscriptionId: string | null) {
  if (!subscriptionId || !["charge.refunded", "charge.dispute.created"].includes(type)) return false;
  const db = admin();
  const { data: request, error } = await db.from("hub_payment_requests").select("*").eq("stripe_subscription_id", subscriptionId).maybeSingle();
  if (error) throw error;
  if (!request?.fulfilled_at) return false;
  // Use current Stripe truth for refunds: an old or partial refund is not a full refund.
  const current = await stripe.charges.retrieve(charge.id);
  if (stripeMode() !== "live" || current.livemode !== true) throw new Error("Hub refund environment mismatch");
  if (type === "charge.refunded" && current.refunded !== true) return true;
  const invoiceId = idOf(current.invoice);
  if (!invoiceId || invoiceId !== idOf(charge.invoice)) throw new Error("Hub refund invoice mismatch");
  const invoice = await stripe.invoices.retrieve(invoiceId);
  const modern = invoice as unknown as Record<string, any>;
  const actualSubscription = idOf(invoice.subscription) || idOf(modern.parent?.subscription_details?.subscription);
  if (invoice.livemode !== true || actualSubscription !== subscriptionId || idOf(invoice.customer) !== idOf(current.customer)) {
    throw new Error("Hub refund subscription mismatch");
  }
  const result = await db.rpc("hold_hub_payment_by_subscription", {
    _subscription_id: subscriptionId, _reason: type === "charge.dispute.created" ? "disputed" : "refunded", _event_id: eventId,
  });
  if (result.error) throw result.error;
  return result.data === true;
}

async function deliverHubPaymentReceipt(db: any, profileId: string, version: string, email: string) {
  const query = () => db.from("hub_payment_requests").select("*").eq("profile_id", profileId).eq("request_version", version);
  const { data: request, error } = await query().single();
  if (error || !request?.fulfilled_at) throw error || new Error("Hub receipt has no fulfilled payment");
  if (request.payment_hold_at) return;
  if (request.welcome_email_sent_at) return;
  const started = new Date().toISOString();
  const { data: lease, error: leaseError } = await db.from("hub_payment_requests")
    .update({ welcome_email_started_at: started }).eq("profile_id", profileId).eq("request_version", version)
    .is("welcome_email_sent_at", null)
    .is("payment_hold_at", null)
    .or(`welcome_email_started_at.is.null,welcome_email_started_at.lt.${new Date(Date.now() - 120000).toISOString()}`).select("profile_id");
  if (leaseError || !lease?.length) throw leaseError || new Error("Hub receipt in progress; retry");
  try {
    const { data: current, error: reviewError } = await query().single();
    if (reviewError) throw reviewError;
    if (current?.payment_hold_at) {
      await db.from("hub_payment_requests").update({ welcome_email_started_at: null })
        .eq("profile_id", profileId).eq("request_version", version).eq("welcome_email_started_at", started);
      return;
    }
    const { data: profile, error: profileError } = await db.from("personal_profiles").select("username,full_name").eq("id", profileId).single();
    if (profileError || !profile?.username) throw profileError || new Error("Hub receipt branding unavailable");
    const name = profile.full_name?.trim() || profile.username;
    const link = `${frontendUrl()}/${encodeURIComponent(profile.username)}`;
    const result = await sendEmailAndLog({
      to: email, subject: "Your TapAway page is back online", templateKey: "hub_payment_receipt", profileId,
      replyTo: "tap@tapaway.co", idempotencyKey: `hub-payment-receipt/${version}`,
      html: wrapEmail({
        preheader: "Your existing cards are ready to use again. Thank you for choosing TapAway.",
        headline: "You're back. Let every tap count.",
        introHtml: `<p>Thank you for activating TapAway for ${escapeHtml(name)}. Your page is back online, and the four cards you already have work with the same links.</p>`,
        bodyHtml: `<div style="background:#f0f8ed;border-radius:12px;padding:20px;margin-top:20px"><strong>Your plan: $20 per month</strong><p>Your subscription renews automatically each month. Cancel anytime. No replacement cards or setup steps are needed to start using your page again.</p></div><p>Already manage this business on TapAway? Sign in to your existing dashboard to update links and see activity. Need help getting dashboard access? Reply to this email and we'll help confirm the right owner.</p>`,
        ctaLabel: "Open my business page", ctaUrl: escapeHtml(link),
        footerNote: "A payment activates the page. It does not transfer ownership of an existing account.",
      }),
      text: `Thank you for activating TapAway for ${name}. Your page is back online, and your four existing cards are ready to use.\n\n${link}\n\n$20 per month, renewing automatically. Cancel anytime.\n\nAlready manage this business? Sign in to your existing dashboard. Need dashboard access? Reply to tap@tapaway.co so we can confirm the right owner.`,
    });
    if (!result.ok) throw new Error("Hub receipt delivery failed; retry");
    const saved = await db.from("hub_payment_requests").update({ welcome_email_sent_at: new Date().toISOString(), welcome_email_started_at: null })
      .eq("profile_id", profileId).eq("request_version", version).eq("welcome_email_started_at", started).select("profile_id");
    if (saved.error || !saved.data?.length) throw saved.error || new Error("Hub receipt lease was lost; retry");
  } catch (error) {
    await db.from("hub_payment_requests").update({ welcome_email_started_at: null })
      .eq("profile_id", profileId).eq("request_version", version).eq("welcome_email_started_at", started);
    throw error;
  }
}
