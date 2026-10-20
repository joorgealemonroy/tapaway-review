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
    order.artwork_revision !== session.metadata.artwork_revision
  )
    throw new Error("Order revision mismatch");
  if (
    ["refunded", "disputed"].includes(order.status) ||
    order.production_status === "on_hold"
  )
    return { onHold: true };
  if (order.activated_at) return { paid: true };
  const expected = order.hub_requested ? 4400 : 3900;
  if (
    session.amount_total !== expected ||
    session.currency !== "usd" ||
    session.mode !== (order.hub_requested ? "subscription" : "payment")
  )
    throw new Error("Order payment mismatch");
  const email = (session.customer_details?.email || "").trim().toLowerCase();
  const shipping = session.shipping_details;
  if (
    !email ||
    !shipping?.address ||
    (order.hub_requested && !session.subscription)
  )
    throw new Error("Missing paid order details");
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
      stripe_payment_intent_id: id(session.payment_intent),
      email,
      customer_name: session.customer_details?.name || shipping.name,
      shipping_address: { name: shipping.name, ...shipping.address },
    })
    .eq("id", order.id)
    .is("activated_at", null)
    .or(
      `activation_started_at.is.null,activation_started_at.lt.${new Date(Date.now() - 120000).toISOString()}`,
    )
    .select("id");
  if (claimError) throw claimError;
  if (!claimed?.length) throw new Error("Order activation in progress");
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
      const subscription = await stripe.subscriptions.retrieve(
        id(session.subscription)!,
      );
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
            ? subscription.status
            : "pending",
          is_approved: session.livemode,
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
    const { error } = await db
      .from("personal_card_orders")
      .update({
        activated_at: new Date().toISOString(),
        production_status: "needs_review",
        activation_started_at: null,
      })
      .eq("id", order.id);
    if (error) throw error;
    // Checkout confirmation is transactional. Never enroll the buyer in marketing.
    const text = `Your two TapAway cards are paid for. We'll check your artwork, print both cards, program their links, and ship to the address you entered. ${order.hub_requested ? "Your optional personal hub is $5/month until canceled. No website is needed. Request your dashboard access at https://tapaway.co/support#access, choose an available tapaway.co/yourname address, then add photos, text, links and colors. Your dashboard and analytics are available 24/7." : "Your cards are a one-time purchase with no TapAway subscription."} Questions? Reply to tap@tapaway.co. Order ${order.id}.`;
    await sendEmail(
      email,
      "Your TapAway card order",
      `<p>${text}</p>`,
      text,
    ).catch(() => false);
    return { paid: true };
  } catch (error) {
    await db
      .from("personal_card_orders")
      .update({ activation_started_at: null })
      .eq("id", order.id);
    throw error;
  }
}
export async function syncPersonalSubscription(
  stripe: Stripe,
  subscriptionId: string,
) {
  const db = admin();
  const { data: order } = await db
    .from("personal_card_orders")
    .select("id, personal_profile_id, stripe_livemode")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (!order || order.stripe_livemode !== (stripeMode() === "live")) return;
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (sub.metadata.commerce_version !== PERSONAL_VERSION) return;
  const { error } = await db
    .from("personal_profiles")
    .update({
      subscription_status: order.stripe_livemode ? sub.status : "pending",
    })
    .eq("id", order.personal_profile_id)
    .eq("stripe_subscription_id", subscriptionId);
  if (error) throw error;
}
