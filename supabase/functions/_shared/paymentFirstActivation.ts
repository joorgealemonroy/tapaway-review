import { deliverPurchaseEmail } from "./purchaseEmail.ts";
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
  if (session.status !== "complete" || session.mode !== "subscription" || session.payment_status === "unpaid") return { skipped: "incomplete" };
  if (session.livemode !== (stripeMode() === "live")) throw new Error("Wrong Stripe environment");
  const db = admin();
  const { data: intent, error: lookupError } = await db.from("checkout_intents").select("*").eq("id", session.metadata.checkout_intent_id).maybeSingle();
  if (lookupError || !intent) throw lookupError || new Error("Checkout intent missing; retry activation");
  if (intent.stripe_checkout_session_id !== session.id || (intent.activated_at && intent.stripe_livemode !== session.livemode)) throw new Error("Checkout intent mismatch");
  if (intent.payment_hold_at) return { onHold: true };
  const mainSub = subId(session.subscription as string | Stripe.Subscription | null);
  const customer = custId(session.customer as string | Stripe.Customer | null);
  const email = (session.customer_details?.email || "").trim().toLowerCase();
  if (!mainSub || !customer || !email) throw new Error("Incomplete purchase details");
  const subscription = await stripe.subscriptions.retrieve(mainSub);
  if (custId(subscription.customer) !== customer || !subscription.items.data.some(item => item.price.id === intent.main_price_id)) throw new Error("Purchased subscription mismatch");
  if (!["active", "trialing"].includes(subscription.status)) return { skipped: "subscription_inactive" };
  if (session.payment_status !== "paid" && !(session.payment_status === "no_payment_required" && subscription.status === "trialing" && subscription.trial_end && subscription.trial_end * 1000 > Date.now())) return { skipped: "not_paid" };
  if (intent.activated_at) {
    await deliverBusinessWelcome(db, intent);
    return { already: true };
  }
  // A lease, rather than a terminal paid flag, lets Stripe retry after any interrupted step.
  const { data: claimed, error: claimError } = await db.from("checkout_intents")
    .update({ activation_started_at: new Date().toISOString() })
    .eq("id", intent.id).is("activated_at", null)
    .or(`activation_started_at.is.null,activation_started_at.lt.${new Date(Date.now() - 120000).toISOString()}`).select("id");
  if (claimError || !claimed?.length) throw claimError || new Error("Activation in progress; retry");
  try {
    let userId = (intent.user_id || null) as string | null;
    let created = intent.user_created_by_purchase === true;
    let status = userId ? "associated" : "pending_association";
    if (!userId) {
      const { data: existing, error } = await db.rpc("get_auth_user_by_email", { lookup_email: email });
      if (error) throw error;
      if (!Array.isArray(existing) || !existing[0]?.id) {
        const result = await db.auth.admin.createUser({ email, email_confirm: false, user_metadata: { source: ONBOARDING_VERSION } });
        if (result.error || !result.data?.user) throw result.error || new Error("Could not create account");
        userId = result.data.user.id; created = true; status = "associated";
      }
    }
    const patch = { status, email, stripe_livemode: session.livemode, user_id: userId, user_created_by_purchase: created, stripe_customer_id: customer, stripe_subscription_id: mainSub, paid_at: intent.paid_at || new Date().toISOString() };
    const saved = await db.from("checkout_intents").update(patch).eq("id", intent.id).select("status,payment_hold_at").single();
    if (saved.error || !saved.data) throw saved.error || new Error("Checkout state unavailable");
    // The database may have clamped this write after a refund raced the Stripe
    // read. Use the guarded row before creating any account setup or add-on.
    if (saved.data.payment_hold_at) return { onHold: true };
    const shipping = (session as any).shipping_details ?? (session as any).collected_information?.shipping_details;
    const onboarding = await db.from("onboarding_sessions").upsert({
      checkout_intent_id: intent.id, user_id: userId, stripe_subscription_id: mainSub,
      shipping_address: addr(shipping?.address, shipping?.name), billing_address: addr(session.customer_details?.address, session.customer_details?.name),
      ...(intent.business_details?.name ? { business_name: intent.business_details.name, business_city: intent.business_details.city,
        business_link: intent.business_details.link || null, google_place_id: intent.business_details.googlePlaceId || null,
        business_address: intent.business_details.address || null, needs_research: !intent.business_details.googlePlaceId,
        setup_status: intent.business_details.googlePlaceId ? "business_identified" : "needs_business_research", step: "logo" } : {}),
    }, { onConflict: "checkout_intent_id", ignoreDuplicates: true });
    if (onboarding.error) throw onboarding.error;
    if (userId) {
      const profileId = await ensureDraftProfile(db, intent.id, userId);
      if (!profileId) throw new Error("Draft hub unavailable; retry");
      const updated = await db.from("personal_profiles").update({ subscription_status: session.livemode ? subscription.status : "pending", trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null }).eq("id", profileId);
      if (updated.error) throw updated.error;
    }
    const membership = await db.from("card_club_memberships").upsert({ checkout_intent_id: intent.id, user_id: userId, stripe_customer_id: customer,
      main_stripe_subscription_id: mainSub, stripe_price_id: intent.card_club_selected ? cardClubPriceId() : null,
      status: intent.card_club_selected ? "pending_activation" : "declined", plan: intent.plan as Plan,
      enrollment_date: intent.card_club_selected ? new Date().toISOString() : null, stripe_livemode: session.livemode,
    }, { onConflict: "checkout_intent_id", ignoreDuplicates: true }).select("*").single();
    if (membership.error) throw membership.error;
    if (intent.card_club_selected && membership.data) {
      await ensureCardClubSubscription(stripe, db, membership.data.id);
      const checked = await db.from("card_club_memberships").select("status").eq("id", membership.data.id).single();
      if (checked.error || checked.data?.status === "activation_failed") throw checked.error || new Error("Card Club activation needs retry");
    }
    const finished = await db.from("checkout_intents").update({ activated_at: new Date().toISOString(), activation_started_at: null }).eq("id", intent.id).select("status,payment_hold_at").single();
    if (finished.error || !finished.data) throw finished.error || new Error("Checkout completion unavailable");
    if (finished.data.payment_hold_at) return { onHold: true };
    await deliverBusinessWelcome(db, { ...intent, ...patch });
    return { status, userId };
  } catch (error) {
    await db.from("checkout_intents").update({ activation_started_at: null }).eq("id", intent.id);
    throw error;
  }
}
async function deliverBusinessWelcome(db: Db, intent: Record<string, any>) {
  if (intent.welcome_email_sent_at || intent.payment_hold_at) return;
  const current = await db.from("checkout_intents").select("payment_hold_at").eq("id",intent.id).single();
  if (current.error) throw current.error;
  if (current.data?.payment_hold_at) return;
  await deliverPurchaseEmail(db, "checkout_intents", intent.id, () => sendWelcomeLink(intent.email, intent.status === "pending_association" ? "verify" : "purchase"));
}

/** Retrieve current Stripe truth even for out-of-order lifecycle events. */
export async function syncBusinessSubscription(stripe: Stripe, subscriptionId: string) {
  const db = admin();
  const { data: intent, error } = await db.from("checkout_intents").select("id,stripe_livemode,payment_hold_at").eq("stripe_subscription_id", subscriptionId).maybeSingle();
  if (error) throw error;
  if (!intent || intent.stripe_livemode !== (stripeMode() === "live")) return;
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const updated = await db.from("personal_profiles").update({ subscription_status: intent.stripe_livemode ? intent.payment_hold_at ? "past_due" : sub.status : "pending", trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null }).eq("stripe_subscription_id", subscriptionId);
  if (updated.error) throw updated.error;
}

/** New orders use an item on the main subscription. Legacy orders retain their original billing. */
export async function ensureCardClubSubscription(stripe: Stripe, db: Db, membershipId: string) {
  const { data: m } = await db.from("card_club_memberships").select("*").eq("id", membershipId).single();
  if (!m || m.card_club_stripe_subscription_id || !["pending_activation", "activation_failed"].includes(m.status)) return m;
  try {
    if (m.checkout_intent_id) {
      const held = await db.from("checkout_intents").select("payment_hold_at").eq("id",m.checkout_intent_id).maybeSingle();
      if (held.error) throw held.error;
      if (held.data?.payment_hold_at) return m;
    }
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
  if (m.checkout_intent_id) {
    const held = await db.from("checkout_intents").select("payment_hold_at").eq("id",m.checkout_intent_id).maybeSingle();
    if (held.error) throw held.error;
    if (held.data?.payment_hold_at) {
      const stopped = await db.from("card_club_memberships").update({status:"past_due"}).eq("id",m.id);
      if (stopped.error) throw stopped.error;
      return;
    }
  }
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
  const { data: sess, error: sessionError } = await db.from("onboarding_sessions").select("id, user_id, personal_profile_id, shipping_address, stripe_subscription_id").eq("checkout_intent_id", intentId).maybeSingle();
  if (sessionError) throw sessionError;
  if (!sess) return null;
  if (sess.user_id && sess.user_id !== userId) throw new Error("Setup belongs to another account");
  if (sess.personal_profile_id) {
    const existing = await db.from("personal_profiles").select("id").eq("id", sess.personal_profile_id).eq("user_id", userId).maybeSingle();
    if (existing.error || !existing.data) throw existing.error || new Error("Hub belongs to another account");
    if (businessName) {
      const named = await db.from("personal_profiles").update({ full_name: businessName }).eq("id", sess.personal_profile_id).eq("user_id", userId).eq("is_approved", false);
      if (named.error) throw named.error;
    }
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
  const { error } = await db.from("personal_profiles").upsert({
    id: intentId, user_id: userId, username, full_name: name, email: intent.email,
    onboarding_source: intent.stripe_livemode ? "payment_first" : "payment_first_test",
    plan_type: intent.billing_interval === "year" ? `${intent.plan}_yearly` : intent.plan,
    subscription_status: "pending", is_approved: false, pipeline_status: "draft", legacy_allowance: false,
    stripe_customer_id: intent.stripe_customer_id, stripe_subscription_id: sess.stripe_subscription_id,
    place_city: intent.business_details?.city || a.city || null, place_state: intent.business_details?.state || a.state || null, place_zip: intent.business_details?.postalCode || a.postal_code || null,
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
  const { data: prof, error: readError } = await db.from("personal_profiles").select("id").eq("id", intentId).eq("user_id", userId).single();
  if (readError || !prof) throw readError || new Error("Draft hub missing");
  const linked = await db.from("onboarding_sessions").update({ personal_profile_id: prof.id, hub_status: "draft" }).eq("id", sess.id).is("personal_profile_id", null);
  if (linked.error) throw linked.error;
  return prof.id as string;
}
