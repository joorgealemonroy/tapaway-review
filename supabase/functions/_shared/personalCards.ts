import { deliverPurchaseEmail } from "./purchaseEmail.ts";
import { wrapEmail } from "./email.ts";
import { escapeHtml } from "./sanitize.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import {
  admin,
  frontendUrl,
  getStripe,
  paymentFirstAllowed,
  sendEmail,
  stripeMode,
} from "./paymentFirst.ts";
export const PERSONAL_VERSION = "personal_cards_v1";
export const PERSONAL_BUCKET = "personal-card-artwork";
// Public Stripe identifiers, verified in TapAway's live account. Secret keys stay in Cloud.
const LIVE_PERSONAL_PRICES = {
  cards: "price_1USlnhDg8DaTuVNZvpuFiScC",
  hub: "price_1USlnpDg8DaTuVNZebiRWrPS",
};
export function personalPortalConfiguration() {
  const configured = Deno.env.get(
    `PERSONAL_PORTAL_CONFIGURATION_ID_${stripeMode().toUpperCase()}`,
  );
  const configuration =
    configured ||
    (stripeMode() === "live" ? "bpc_1USlo1Dg8DaTuVNZovODPDXA" : undefined);
  if (!configuration)
    throw new Error("Personal billing portal is not configured");
  return configuration;
}
export async function personalCardsAllowed(req: Request) {
  if (Deno.env.get("PERSONAL_CARDS_ENABLED") === "true")
    return paymentFirstAllowed(req);
  return (
    stripeMode() === "test" &&
    !!req.headers.get("x-pf-test-key") &&
    (await paymentFirstAllowed(req))
  );
}
export async function personalPrice(kind: "cards" | "hub") {
  const variable = `${kind === "cards" ? "PERSONAL_CARDS" : "PERSONAL_HUB"}_PRICE_ID_${stripeMode().toUpperCase()}`;
  const id =
    Deno.env.get(variable) ||
    (stripeMode() === "live" ? LIVE_PERSONAL_PRICES[kind] : undefined);
  if (!id || !/^price_/.test(id))
    throw new Error("Personal catalog is not configured");
  const price = await getStripe().prices.retrieve(id, { expand: ["product"] });
  const amount = kind === "cards" ? 3900 : 500;
  if (
    !price.active ||
    price.currency !== "usd" ||
    price.unit_amount !== amount ||
    price.livemode !== (stripeMode() === "live") ||
    (typeof price.product !== "string" &&
      (!("active" in price.product) || !price.product.active)) ||
    (kind === "cards"
      ? !!price.recurring
      : price.recurring?.interval !== "month" ||
        price.recurring?.interval_count !== 1)
  )
    throw new Error("Personal catalog price mismatch");
  return price;
}
export function personalReturnOrigin(value: unknown) {
  return stripeMode() === "test" &&
    typeof value === "string" &&
    /^(http:\/\/localhost:(8080|4173)|https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com))$/.test(
      value,
    )
    ? value
    : frontendUrl();
}
export function publicLink(value: unknown) {
  if (typeof value !== "string" || value.length > 220) return "";
  try {
    const url = new URL(
      /^https?:\/\//i.test(value.trim())
        ? value.trim()
        : `https://${value.trim()}`,
    );
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.hostname.includes(".") ||
      url.username ||
      url.password
    )
      return "";
    return url.href.length <= 220 ? url.href : "";
  } catch {
    return "";
  }
}
const id = (value: unknown): string | null =>
  typeof value === "string"
    ? value
    : value && typeof value === "object" && "id" in value
      ? String(value.id)
      : null;

/** Idempotent paid-order activation. No trial, no Card Club, and no legacy card allowance. */
export async function activatePersonalOrder(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  if (session.metadata?.commerce_version !== PERSONAL_VERSION) return { pending: true };
  session = await stripe.checkout.sessions.retrieve(session.id);
  if (
    session.metadata?.commerce_version !== PERSONAL_VERSION ||
    session.status !== "complete" ||
    session.payment_status !== "paid"
  )
    return { pending: true };
  if (session.livemode !== (stripeMode() === "live"))
    throw new Error("Wrong Stripe environment");
  const db = admin();
  const { data: order, error: lookupError } = await db
    .from("personal_card_orders")
    .select("*")
    .eq("id", session.metadata.personal_order_id)
    .single();
  if (
    lookupError ||
    !order ||
    order.stripe_livemode !== session.livemode ||
    order.artwork_revision !== session.metadata.artwork_revision ||
    order.stripe_checkout_session_id !== session.id
  )
    throw new Error("Order revision mismatch");
  if (
    ["refunded", "disputed"].includes(order.status) ||
    order.production_status === "on_hold"
  )
    return { onHold: true };
  const expected = order.hub_requested ? 4400 : 3900;
  if (
    session.amount_total !== expected ||
    session.currency !== "usd" ||
    session.mode !== (order.hub_requested ? "subscription" : "payment")
  )
    throw new Error("Order payment mismatch");
  const email = (session.customer_details?.email || "").trim().toLowerCase();
  // Webhook versions from Basil onward nest shipping under collected_information.
  const shipping =
    session.shipping_details ||
    (
      session as unknown as {
        collected_information?: {
          shipping_details?: Stripe.Checkout.Session.ShippingDetails;
        };
      }
    ).collected_information?.shipping_details;
  if (
    !email ||
    !shipping?.address ||
    (order.hub_requested && !session.subscription)
  )
    throw new Error("Missing paid order details");
  // The signed event can predate a refund. Prove the current charge before
  // creating a print request, dashboard, or thank-you email.
  const invoiceId = id(session.invoice);
  const invoice = invoiceId ? await stripe.invoices.retrieve(invoiceId) : null;
  const paymentId = id(session.payment_intent) || id(invoice?.payment_intent);
  if (!paymentId || (invoice && (invoice.status !== "paid" || id(invoice.customer) !== id(session.customer) || id(invoice.subscription) !== id(session.subscription)))) throw new Error("Order invoice mismatch");
  const payment = await stripe.paymentIntents.retrieve(paymentId, { expand: ["latest_charge"] });
  if (payment.livemode !== session.livemode || payment.status !== "succeeded" || payment.amount_received !== expected || payment.currency !== "usd" || id(payment.customer) !== id(session.customer)) throw new Error("Order charge mismatch");
  const charge = typeof payment.latest_charge === "object" && payment.latest_charge ? payment.latest_charge : await stripe.charges.retrieve(id(payment.latest_charge)!);
  if (!charge || charge.livemode !== session.livemode || !charge.paid || id(charge.payment_intent) !== paymentId) throw new Error("Order charge missing");
  if (charge.refunded || charge.disputed || charge.amount_refunded > 0) {
    const held = await db.from("personal_card_orders").update({ production_status: "on_hold", ...(charge.disputed ? {status:"disputed"} : charge.refunded ? {status:"refunded"} : {}) }).eq("id", order.id);
    if (held.error) throw held.error;
    if (order.hub_requested && order.stripe_subscription_id) {
      const stopped = await db.from("personal_profiles").update({is_approved:false,subscription_status:"past_due"}).eq("id",order.personal_profile_id).eq("stripe_subscription_id",order.stripe_subscription_id);
      if (stopped.error) throw stopped.error;
    }
    return {onHold:true};
  }
  let subscription: Stripe.Subscription | null = null;
  let hubActive = false;
  if (order.hub_requested) {
    subscription = await stripe.subscriptions.retrieve(id(session.subscription)!, { expand: ["latest_invoice"] });
    const hubPrice = await personalPrice("hub");
    if (subscription.livemode !== session.livemode || id(subscription.customer) !== id(session.customer) || subscription.metadata.commerce_version !== PERSONAL_VERSION || subscription.items.data.length !== 1 || subscription.items.data[0].price.id !== hubPrice.id || subscription.items.data[0].quantity !== 1) throw new Error("Order subscription mismatch");
    const latestInvoice = typeof subscription.latest_invoice === "object" && subscription.latest_invoice ? subscription.latest_invoice : subscription.latest_invoice ? await stripe.invoices.retrieve(id(subscription.latest_invoice)!) : null;
    hubActive = subscription.status === "active" && latestInvoice?.status === "paid" && latestInvoice.amount_paid >= 500;
  }
  if (order.activated_at) { await deliverPersonalWelcome(db, order); return { paid: true }; }
  // A short lease permits recovery after a crash, while concurrent welcome/webhook calls retry.
  const { data: claimed, error: claimError } = await db
    .from("personal_card_orders")
    .update({
      activation_started_at: new Date().toISOString(),
      paid_at: order.paid_at || new Date().toISOString(),
      status: "paid",
      stripe_checkout_session_id: session.id,
      stripe_customer_id: id(session.customer),
      stripe_subscription_id: id(session.subscription),
      stripe_payment_intent_id: paymentId,
      email,
      customer_name: session.customer_details?.name || shipping.name,
      shipping_address: { name: shipping.name, ...shipping.address },
    })
    .eq("id", order.id)
    .is("activated_at", null)
    .neq("production_status", "on_hold").neq("status", "refunded").neq("status", "disputed")
    .or(
      `activation_started_at.is.null,activation_started_at.lt.${new Date(Date.now() - 120000).toISOString()}`,
    )
    .select("id,production_status,status");
  if (claimError) throw claimError;
  if (!claimed?.length) throw new Error("Order activation in progress");
  if (claimed[0].production_status === "on_hold" || ["refunded","disputed"].includes(claimed[0].status)) return {onHold:true};
  try {
    if (order.hub_requested) {
      let userId = order.user_id;
      if (!userId) {
        const { data: existing, error } = await db.rpc(
          "get_auth_user_by_email",
          { lookup_email: email },
        );
        if (error) throw error;
        userId = Array.isArray(existing) ? existing[0]?.id : null;
        if (!userId) {
          const result = await db.auth.admin.createUser({
            email,
            email_confirm: false,
            user_metadata: { source: PERSONAL_VERSION },
          });
          if (result.error || !result.data.user)
            throw result.error || new Error("Account unavailable");
          userId = result.data.user.id;
        }
        const { error: saveUser } = await db
          .from("personal_card_orders")
          .update({ user_id: userId })
          .eq("id", order.id);
        if (saveUser) throw saveUser;
      }
      const { error: profileError } = await db.from("personal_profiles").upsert(
        {
          id: order.personal_profile_id,
          user_id: userId,
          username: `p${order.id.replace(/-/g, "")}`,
          full_name:
            order.hub_name || session.customer_details?.name || "Your new hub",
          email,
          plan_type: "personal_hosted",
          subscription_status: session.livemode
            ? hubActive ? "active" : "past_due"
            : "pending",
          is_approved: session.livemode && hubActive,
          legacy_allowance: false,
          onboarding_source: session.livemode
            ? PERSONAL_VERSION
            : `${PERSONAL_VERSION}_test`,
          stripe_customer_id: id(session.customer),
          stripe_subscription_id: id(session.subscription),
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (profileError) throw profileError;
      const links = (order.hub_links || []) as string[];
      for (let i = 0; i < links.length; i++) {
        const linkId = `${order.personal_profile_id.slice(0, 24)}${String(i + 1).padStart(12, "0")}`;
        const { error } = await db.from("personal_links").upsert(
          {
            id: linkId,
            profile_id: order.personal_profile_id,
            link_type: "website",
            label: new URL(links[i]).hostname.replace(/^www\./, ""),
            url: links[i],
            sort_order: i,
            is_active: true,
          },
          { onConflict: "id", ignoreDuplicates: true },
        );
        if (error) throw error;
      }
    }
    const { data: finished, error } = await db
      .from("personal_card_orders")
      .update({
        activated_at: new Date().toISOString(),
        production_status: "needs_review",
        activation_started_at: null,
      })
      .eq("id", order.id).neq("production_status", "on_hold").neq("status", "refunded").neq("status", "disputed").select("id,production_status,status");
    if (error) throw error;
    if (!finished?.length || finished[0].production_status === "on_hold") return { onHold: true };
    await deliverPersonalWelcome(db, { ...order, email });
    return { paid: true };
  } catch (error) {
    await db
      .from("personal_card_orders")
      .update({ activation_started_at: null })
      .eq("id", order.id);
    throw error;
  }
}
async function deliverPersonalWelcome(db: ReturnType<typeof admin>, order: Record<string, any>) {
  if (order.welcome_email_sent_at) return;
  const current = await db.from("personal_card_orders").select("status,production_status").eq("id",order.id).single();
  if(current.error || !current.data) throw current.error || new Error("Order unavailable");
  if(current.data.status !== "paid" || current.data.production_status === "on_hold") return;
  const text = `Thanks for choosing TapAway! Your two cards are paid for. We'll review your artwork, print and program both cards, then ship to your checkout address. ${order.hub_requested ? "Your optional hub is $5/month until canceled. Open your dashboard to choose your address, add links and see analytics." : "Your cards are a one-time purchase with no TapAway subscription."} Order ${order.id}. Questions? Reply to tap@tapaway.co.`;
  await deliverPurchaseEmail(db, "personal_card_orders", order.id, async () => {
  let accessUrl = `${frontendUrl()}/support`;
  if (order.hub_requested) {
    const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email: order.email, options: { redirectTo: `${frontendUrl()}/dashboard` } });
    if (error || !data?.properties?.action_link) throw error || new Error("Dashboard link unavailable");
    accessUrl = data.properties.action_link;
  }
  const html = wrapEmail({ preheader: "Two cards. Endless ways to make them yours.", headline: "Thanks! Your cards are in good hands.", introHtml: `<p>${escapeHtml(text)}</p>`,
    bodyHtml: `<div style="padding:20px;background:#f0f8ed;border-radius:12px"><strong>What happens next</strong><p>Artwork review → Printing & programming → Shipping</p><p>Keep this email with your order number. We're here if you need help.</p></div>`,
    ctaLabel: order.hub_requested ? "Customize my hub" : "Get help with my order", ctaUrl: escapeHtml(accessUrl), footerNote: "Free standard US shipping. No marketing enrollment is added to your purchase." });
  return sendEmail(order.email, "Thank you for your TapAway order", html, `${text}\n\n${accessUrl}`, "personal_order");
  });
}

export async function syncPersonalSubscription(
  stripe: Stripe,
  subscriptionId: string,
) {
  const db = admin();
  const { data: order } = await db
    .from("personal_card_orders")
    .select("id, personal_profile_id, stripe_livemode, stripe_customer_id, status, production_status")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (!order || order.stripe_livemode !== (stripeMode() === "live")) return;
  const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] });
  if (sub.metadata.commerce_version !== PERSONAL_VERSION || sub.livemode !== order.stripe_livemode || id(sub.customer) !== order.stripe_customer_id) throw new Error("Personal subscription mismatch");
  const held = ["refunded", "disputed"].includes(order.status) || order.production_status === "on_hold";
  const invoice = typeof sub.latest_invoice === "object" && sub.latest_invoice ? sub.latest_invoice : sub.latest_invoice ? await stripe.invoices.retrieve(id(sub.latest_invoice)!) : null;
  const paid = sub.status === "active" && invoice?.status === "paid" && invoice.amount_paid >= 500;
  const status = held || (sub.status === "active" && !paid) ? "past_due" : sub.status;
  const { error } = await db
    .from("personal_profiles")
    .update({
      subscription_status: order.stripe_livemode ? status : "pending",
      ...(held ? { is_approved: false } : {}),
    })
    .eq("id", order.personal_profile_id)
    .eq("stripe_subscription_id", subscriptionId);
  if (error) throw error;
}
