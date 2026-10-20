// Idempotent activation shared by the webhook and /welcome (whichever runs first).
import Stripe from "https://esm.sh/stripe@14.21.0";
import { admin, cardClubPriceId, ONBOARDING_VERSION, sendWelcomeLink, stripeMode, type Plan } from "./paymentFirst.ts";

type Db = ReturnType<typeof admin>;
const subId = (v: string | Stripe.Subscription | null) => (typeof v === "string" ? v : v?.id ?? null);
const custId = (v: string | Stripe.Customer | Stripe.DeletedCustomer | null) => (typeof v === "string" ? v : v?.id ?? null);

function addr(a?: Stripe.Address | null, name?: string | null) {
  if (!a) return null;
  return { name: name ?? null, line1: a.line1, line2: a.line2, city: a.city, state: a.state, postal_code: a.postal_code, country: a.country };
}

export async function activateCheckout(stripe: Stripe, session: Stripe.Checkout.Session) {
  if (session.metadata?.onboarding_version !== ONBOARDING_VERSION) return { skipped: "not_payment_first" };
  if (session.status !== "complete" || session.mode !== "subscription") return { skipped: "incomplete" };
  const db = admin();
  const intentId = session.metadata?.checkout_intent_id;
  const { data: intent } = await db.from("checkout_intents").select("*").eq("id", intentId).maybeSingle();
  if (!intent) { console.error("[activation] intent missing", intentId); return { skipped: "intent_missing" }; }
  const email = (session.customer_details?.email || "").trim().toLowerCase();
  const mainSub = subId(session.subscription as string | Stripe.Subscription | null);
  const customer = custId(session.customer as string | Stripe.Customer | null);
  if (!email || !mainSub) {
    await db.from("checkout_intents").update({ status: "needs_review", review_reason: "missing email or subscription" }).eq("id", intent.id);
    return { skipped: "missing_data" };
  }

  // Claim the intent once: only a 'created'/'checkout_started' row moves forward.
  const { data: claimed } = await db.from("checkout_intents")
    .update({ status: "paid", email, stripe_customer_id: customer, stripe_subscription_id: mainSub, paid_at: new Date().toISOString(), stripe_livemode: session.livemode === true })
    .eq("id", intent.id).in("status", ["created", "checkout_started"]).select("id");
  if (!claimed?.length) return { already: true };

  // Account: create only when the email is new. Existing accounts must verify ownership by email.
  const { data: existing } = await db.rpc("get_auth_user_by_email", { lookup_email: email });
  const existingId = Array.isArray(existing) && existing[0]?.id ? existing[0].id as string : null;
  let userId: string | null = null;
  let status = "associated";
  let created = false;
  if (existingId) {
    status = "pending_association";
  } else {
    const { data: u, error } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { source: ONBOARDING_VERSION } });
    if (error || !u?.user) {
      // A race may have created it; fall back to verification instead of guessing.
      console.error("[activation] createUser failed", error?.message);
      status = "pending_association";
    } else { userId = u.user.id; created = true; }
  }
  await db.from("checkout_intents").update({ status, user_id: userId, user_created_by_purchase: created }).eq("id", intent.id);

  const shipping = (session as unknown as { shipping_details?: { address?: Stripe.Address; name?: string } }).shipping_details
    ?? (session as unknown as { collected_information?: { shipping_details?: { address?: Stripe.Address; name?: string } } }).collected_information?.shipping_details;
  await db.from("onboarding_sessions").upsert({
    checkout_intent_id: intent.id, user_id: userId, stripe_subscription_id: mainSub,
    shipping_address: addr(shipping?.address, shipping?.name),
    billing_address: addr(session.customer_details?.address, session.customer_details?.name),
    ...(intent.business_details?.name ? {
      business_name: intent.business_details.name, business_city: intent.business_details.city,
      business_link: intent.business_details.link || null,
      google_place_id: intent.business_details.googlePlaceId || null, business_address: intent.business_details.address || null,
      needs_research: !intent.business_details.googlePlaceId,
      setup_status: intent.business_details.googlePlaceId ? "business_identified" : "needs_business_research", step: "logo",
    } : {}),
  }, { onConflict: "checkout_intent_id", ignoreDuplicates: true });

  // Initial order = draft Solo/Pro hub (existing model). Unapproved and without print artwork,
  // so it is neither public nor in the print queue until the team finishes setup.
  if (userId) await ensureDraftProfile(db, intent.id, userId);

  const plan = intent.plan as Plan;
  if (intent.card_club_selected) {
    const { data: m } = await db.from("card_club_memberships").upsert({
      checkout_intent_id: intent.id, user_id: userId, stripe_customer_id: customer, main_stripe_subscription_id: mainSub,
      stripe_price_id: cardClubPriceId(), status: "pending_activation", plan, enrollment_date: new Date().toISOString(), stripe_livemode: session.livemode === true,
    }, { onConflict: "checkout_intent_id" }).select("*").single();
    if (m) await ensureCardClubSubscription(stripe, db, m.id);
  } else {
    await db.from("card_club_memberships").upsert({
      checkout_intent_id: intent.id, user_id: userId, stripe_customer_id: customer, main_stripe_subscription_id: mainSub,
      status: "declined", plan, declined_at: new Date().toISOString(), stripe_livemode: session.livemode === true,
    }, { onConflict: "checkout_intent_id", ignoreDuplicates: true });
  }

  if (status === "associated") {
    await sendWelcomeLink(email, "purchase");
  } else {
    await sendWelcomeLink(email, "verify");
    await db.from("checkout_intents").update({ verify_email_sent_at: new Date().toISOString() }).eq("id", intent.id);
  }
  return { status, userId };
}

/** New orders use an item on the main subscription. Legacy orders retain their original billing. */
export async function ensureCardClubSubscription(stripe: Stripe, db: Db, membershipId: string) {
  const { data: m } = await db.from("card_club_memberships").select("*").eq("id", membershipId).single();
  if (!m || m.card_club_stripe_subscription_id || !["pending_activation", "activation_failed"].includes(m.status)) return m;
  try {
    const main = await stripe.subscriptions.retrieve(m.main_stripe_subscription_id);
    if (main.metadata.card_club_billing === "included") {
      const item = main.items.data.find(i => {
        const product = typeof i.price.product === "string" ? i.price.product : i.price.product.id;
        return product === main.metadata.card_club_product_id && i.price.id !== main.metadata.main_price_id;
      });
      if (!item) throw new Error("Card Club item missing from the main subscription");
      const { error } = await db.from("card_club_memberships").update({
        card_club_stripe_subscription_id: main.id, card_club_stripe_subscription_item_id: item.id,
        stripe_price_id: item.price.id, status: "pending_activation", review_reason: null,
      }).eq("id", m.id);
      if (error) throw error;
      return m;
    }
    const pm = typeof main.default_payment_method === "string" ? main.default_payment_method : main.default_payment_method?.id;
    const nowSec = Math.floor(Date.now() / 1000);
    const trialEnd = main.trial_end && main.trial_end > nowSec + 60 ? main.trial_end : undefined;
    const sub = await stripe.subscriptions.create({
      customer: m.stripe_customer_id,
      items: [{ price: m.stripe_price_id || cardClubPriceId() }],
      ...(pm ? { default_payment_method: pm } : {}),
      ...(trialEnd ? { trial_end: trialEnd } : {}),
      description: "TapAway Card Club",
      metadata: { tapaway_addon: "card_club", card_club_membership_id: m.id, main_subscription_id: m.main_stripe_subscription_id, onboarding_version: ONBOARDING_VERSION },
    }, { idempotencyKey: `card-club-${stripeMode()}-${m.id}` });
    await db.from("card_club_memberships").update({
      card_club_stripe_subscription_id: sub.id, card_club_stripe_subscription_item_id: sub.items.data[0]?.id ?? null,
      status: "pending_activation", review_reason: null,
    }).eq("id", m.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[activation] Card Club subscription failed", m.id, msg);
    await db.from("card_club_memberships").update({ status: "activation_failed", review_reason: msg.slice(0, 500) }).eq("id", m.id);
  }
  return m;
}

/** Recomputes Card Club status from Stripe truth. Active only when paid and main plan is valid. */
export async function syncMembership(stripe: Stripe, db: Db, m: Record<string, any>) {
  if (["declined", "cancelled"].includes(m.status) || !m.card_club_stripe_subscription_id) return;
  const [cc, main] = await Promise.all([
    stripe.subscriptions.retrieve(m.card_club_stripe_subscription_id),
    stripe.subscriptions.retrieve(m.main_stripe_subscription_id),
  ]);
  const included = cc.id === main.id;
  if (included && !main.items.data.some(i => i.id === m.card_club_stripe_subscription_item_id)) {
    await db.from("card_club_memberships").update({ status: "cancelled", cancellation_date: new Date().toISOString() }).eq("id", m.id);
    return; // Removing the add-on must never cancel the business plan.
  }
  const mainOk = ["active", "trialing"].includes(main.status);
  if (cc.status === "canceled" || main.status === "canceled") {
    if (!included && cc.status !== "canceled") await stripe.subscriptions.cancel(cc.id).catch(() => null);
    await db.from("card_club_memberships").update({ status: "cancelled", cancellation_date: new Date().toISOString() }).eq("id", m.id);
    return;
  }
  // Plan follows the current main subscription (upgrade never resets the timer).
  const mainPrice = main.items.data.find(i => i.id !== m.card_club_stripe_subscription_item_id)?.price ?? main.items.data[0]?.price;
  const plan = mainPrice?.unit_amount === 3900 || mainPrice?.unit_amount === 39000 ? "venue" : mainPrice ? "solo" : m.plan;
  const next = cc.status === "active" && mainOk && m.card_club_paid_at ? "active"
    : ["past_due", "unpaid", "incomplete", "incomplete_expired"].includes(cc.status) || (m.card_club_paid_at && !mainOk) ? "past_due"
    : "pending_activation";
  await db.from("card_club_memberships").update({ status: next, plan }).eq("id", m.id);
}


/** Creates (once) the unapproved draft hub that represents a payment-first order. */
export async function ensureDraftProfile(db: Db, intentId: string, userId: string, businessName?: string) {
  const { data: sess } = await db.from("onboarding_sessions").select("id, personal_profile_id, shipping_address, stripe_subscription_id").eq("checkout_intent_id", intentId).maybeSingle();
  if (!sess) return null;
  if (sess.personal_profile_id) {
    if (businessName) await db.from("personal_profiles").update({ full_name: businessName }).eq("id", sess.personal_profile_id).eq("is_approved", false);
    return sess.personal_profile_id as string;
  }
  const { data: intent } = await db.from("checkout_intents").select("plan, billing_interval, email, stripe_customer_id, stripe_livemode, business_details").eq("id", intentId).single();
  if (!intent) return null;
  const name = businessName || intent.business_details?.name || "New TapAway business";
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "tapaway";
  let username = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  for (let i = 0; i < 20; i++) {
    const { data: ok } = await db.rpc("is_username_available", { check_username: username });
    if (ok) break;
    username = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  }
  const a = (sess.shipping_address ?? {}) as Record<string, string | null>;
  const { data: prof, error } = await db.from("personal_profiles").insert({
    user_id: userId, username, full_name: name, email: intent.email,
    onboarding_source: intent.stripe_livemode ? "payment_first" : "payment_first_test",
    plan_type: intent.billing_interval === "year" ? `${intent.plan}_yearly` : intent.plan,
    subscription_status: "trialing", is_approved: false, pipeline_status: "draft", legacy_allowance: false,
    stripe_customer_id: intent.stripe_customer_id, stripe_subscription_id: sess.stripe_subscription_id,
    place_city: intent.business_details?.city || a.city || null, place_state: intent.business_details?.state || a.state || null, place_zip: intent.business_details?.postalCode || a.postal_code || null,
  }).select("id").single();
  if (error || !prof) { console.error("[activation] draft hub failed", error?.message); return null; }
  await db.from("onboarding_sessions").update({ personal_profile_id: prof.id, hub_status: "draft" }).eq("id", sess.id).is("personal_profile_id", null);
  return prof.id as string;
}
