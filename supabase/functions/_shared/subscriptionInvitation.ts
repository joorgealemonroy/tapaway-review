import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { admin, frontendUrl, getStripe, stripeMode, userFromRequest, verifiedPrice } from "./paymentFirst.ts";
import { hashValue, takeQuota } from "./storefrontRateLimit.ts";
import { readAccessBody, normalizedEmail } from "./accountAccess.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendEmailAndLog, wrapEmail } from "./email.ts";
import { escapeHtml } from "./sanitize.ts";
import { INVITATION_VERSION, INVITATION_TTL_MS, canInviteSubscription, subscriptionTotal } from "./subscriptionInvitationRules.ts";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const idOf = (v: any): string | null => typeof v === "string" ? v : v?.id ?? null;
const secret = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
const table = (kind: string) => kind === "personal" ? "personal_profiles" : "restaurants";
async function hubFor(db: any, kind: string, id: string) {
  const r = await db.from(table(kind)).select("*").eq("id", id).single();
  if (r.error || !r.data) throw new Error("Hub unavailable");
  return r.data;
}
async function checkBilling(stripe: Stripe, db: any, hub: any, email: string, kind: string, attemptId?: string) {
  if (!canInviteSubscription(hub)) throw new Error("This hub is not an eligible free active business");
  // Any known customer must be checked. Provider failures never mean 'unbilled'.
  const customers = hub.stripe_customer_id ? [await stripe.customers.retrieve(hub.stripe_customer_id)] : [];
  const found = await stripe.customers.list({ email, limit: 100 });
  if (found.has_more) throw new Error("Billing requires review");
  customers.push(...found.data);
  for (const customer of new Map(customers.map(c => [c.id, c])).values()) {
    if ("deleted" in customer && customer.deleted) throw new Error("Billing requires review");
    if (customer.livemode !== (stripeMode() === "live")) throw new Error("Billing mode mismatch");
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 100 });
    if (subs.has_more || subs.data.some(s => !["canceled", "incomplete_expired"].includes(s.status) && !(s.status === "incomplete" && attemptId && s.metadata?.attempt_id === attemptId && s.metadata.commerce_version === INVITATION_VERSION))) throw new Error("An existing subscription needs review before another payment");
  }
  const owner = kind === "personal" ? hub.user_id : hub.owner_id;
  if (owner) {
    const result = await db.auth.admin.getUserById(owner);
    const ownerEmail = normalizedEmail(result.data?.user?.email);
    if (result.error || !ownerEmail || !/@demo\.tapaway\.local$/i.test(ownerEmail) && ownerEmail !== email) throw new Error("Use the existing owner's verified account email; ownership cannot be reassigned");
  }
  const users = await db.rpc("get_auth_user_by_email", { lookup_email: email });
  if (users.error) throw users.error;
  const existing = users.data?.[0]?.id;
  if (existing && !(owner === existing && email && !/@demo\.tapaway\.local$/i.test(email))) {
    const opposite = await db.from(kind === "personal" ? "restaurants" : "personal_profiles").select("id").eq(kind === "personal" ? "owner_id" : "user_id", existing).limit(1);
    if (opposite.error || opposite.data?.length) throw new Error("This email already belongs to the other account kind");
  }
}
async function invitation(db: any, token: unknown, allowExpired = false) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new Error("Invalid invitation");
  const r = await db.from("subscription_invitations").select("*").eq("token_hash", await hashValue(token)).single();
  if (r.error || !r.data || r.data.revoked_at || r.data.stripe_livemode !== (stripeMode() === "live") || (!allowExpired && Date.parse(r.data.expires_at) <= Date.now())) throw new Error("Invitation expired or revoked");
  return r.data;
}
function boundSession(i: any, s: Stripe.Checkout.Session) {
  if (s.id !== i.stripe_checkout_session_id || s.livemode !== i.stripe_livemode || s.metadata?.commerce_version !== INVITATION_VERSION || s.metadata.invitation_id !== i.id || s.metadata.attempt_id !== i.attempt_id || s.metadata.hub_id !== i.hub_id || s.metadata.hub_kind !== i.hub_kind) throw new Error("Checkout binding mismatch");
}

export async function handleSubscriptionInvitation(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  let body: Record<string, unknown>;
  try { body = await readAccessBody(req); } catch { return reply({ error: "Invalid request" }, 400); }
  let checkoutLease: { id: string; key: string } | null = null;
  try {
    const db = admin(), stripe = getStripe();
    if (body.action === "owner_state") {
      const user = await userFromRequest(req); if (!user) return reply({ error: "Please sign in" }, 401);
      const r = await db.from("subscription_invitations").select("id,selection,shipping_address,hub_id,hub_kind").eq("access_user_id", user.id).eq("hub_id", body.hubId).is("payment_hold_at", null).not("associated_at", "is", null).maybeSingle();
      if (r.error) throw r.error; if (!r.data) return reply({ invitation: null });
      const membership = await db.from("card_club_memberships").select("id,status").eq("subscription_invitation_id", r.data.id).maybeSingle();
      if (membership.error) throw membership.error;
      const entitlement = membership.data ? await db.rpc("card_club_entitlement", { _membership_id: membership.data.id }) : { data: null, error: null };
      if (entitlement.error) throw entitlement.error;
      return reply({ invitation: r.data, club: membership.data, entitlement: Array.isArray(entitlement.data) ? entitlement.data[0] : entitlement.data });
    }
    if (body.action === "admin_info" || body.action === "mint" || body.action === "revoke") {
      const user = await userFromRequest(req);
      if (!user) return reply({ error: "Please sign in" }, 401);
      const roles = await db.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
      if (roles.error || !roles.data?.length) return reply({ error: "Admins only" }, 403);
      if (!["personal", "restaurant"].includes(String(body.kind)) || typeof body.hubId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.hubId)) return reply({ error: "Invalid hub" }, 400);
      const hub = await hubFor(db, String(body.kind), body.hubId);
      const owner = body.kind === "personal" ? hub.user_id : hub.owner_id;
      if (body.action === "admin_info") {
        let email = normalizedEmail(hub.email);
        if (owner) { const u = await db.auth.admin.getUserById(owner); if (u.error) throw u.error; email = normalizedEmail(u.data?.user?.email); }
        return reply({ email: /@demo\.tapaway\.local$/i.test(email) ? "" : email, bound: !!owner && !/@demo\.tapaway\.local$/i.test(email), eligible: canInviteSubscription(hub) });
      }
      const previous = await db.from("subscription_invitations").select("*").eq("hub_kind", body.kind).eq("hub_id", body.hubId).is("revoked_at", null).maybeSingle();
      if (previous.error) throw previous.error;
      if (previous.data) {
        const key = crypto.randomUUID();
        const lock = await db.from("subscription_invitations").update({ checkout_lock_id: key, checkout_lock_at: new Date().toISOString() }).eq("id", previous.data.id).is("paid_at", null).is("revoked_at", null).or(`checkout_lock_at.is.null,checkout_lock_at.lt.${new Date(Date.now() - 120000).toISOString()}`).select("id");
        if (lock.error || !lock.data?.length) throw new Error("Checkout processing; cannot replace invitation");
        checkoutLease = { id: previous.data.id, key };
        if (previous.data.paid_at || previous.data.attempt_id && !previous.data.stripe_checkout_session_id) throw new Error("An earlier payment is processing; do not create another invitation");
        if (previous.data.stripe_checkout_session_id) {
          const s = await stripe.checkout.sessions.retrieve(previous.data.stripe_checkout_session_id); boundSession(previous.data, s);
          if (s.status === "complete") throw new Error("Payment processing; do not replace this invitation");
          if (s.status === "open") await stripe.checkout.sessions.expire(s.id);
        }
        const revoked = await db.from("subscription_invitations").update({ revoked_at: new Date().toISOString() }).eq("id", previous.data.id).is("paid_at", null);
        if (revoked.error) throw revoked.error;
      }
      if (body.action === "revoke") return reply({ revoked: true });
      const email = normalizedEmail(body.email);
      if (!email || /@demo\.tapaway\.local$/i.test(email)) return reply({ error: "Confirm a real dashboard email" }, 400);
      await checkBilling(stripe, db, hub, email, String(body.kind));
      let placeholder = false;
      if (owner) { const u = await db.auth.admin.getUserById(owner); if (u.error) throw u.error; placeholder = /@demo\.tapaway\.local$/i.test(u.data?.user?.email || ""); }
      const token = secret(), expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();
      const saved = await db.from("subscription_invitations").insert({ hub_kind: body.kind, hub_id: body.hubId, intended_email: email, bound_owner_id: owner || null, owner_placeholder: placeholder, created_by: user.id, token_hash: await hashValue(token), expires_at: expiresAt, stripe_livemode: stripeMode() === "live" });
      if (saved.error) throw saved.error;
      return reply({ token, expiresAt });
    }
    if (await takeQuota(req, "subscription-invitation", 60) < 0) return reply({ error: "Please try later" }, 429);
    if (body.action === "access") return await redeemAccess(db, body);
    let i = await invitation(db, body.token, body.action === "status" || body.action === "resend" || body.action === "summary");
    const hub = await hubFor(db, i.hub_kind, i.hub_id);
    if (body.action === "summary") { if (!i.paid_at && Date.parse(i.expires_at) <= Date.now()) throw new Error("Invitation expired"); return reply({ name: hub.full_name || hub.restaurant_name, slug: hub.username || hub.custom_slug, logo: hub.profile_photo_url || hub.logo_url, paid: !!i.paid_at && !i.payment_hold_at }); }
    if (body.action === "resend") {
      if (!i.paid_at || i.payment_hold_at) return reply({ error: "Payment not ready" }, 409);
      if (await takeQuota(req, "subscription-access-email", 3, i.id) < 0) return reply({ error: "Please try later" }, 429);
      await deliverInvitationAccess(db, i, true); return reply({ sent: true });
    }
    if (body.action === "status") {
      if (!i.stripe_checkout_session_id || body.sessionId !== i.stripe_checkout_session_id) return reply({ status: "not_paid" });
      const s = await stripe.checkout.sessions.retrieve(i.stripe_checkout_session_id); boundSession(i, s);
      const proof = await paidInvitationProof(stripe, i, s);
      return reply({ status: i.payment_hold_at ? "review" : !proof ? s.status === "expired" ? "expired" : "not_paid" : i.paid_at ? "paid" : "processing", emailSent: !!i.welcome_email_sent_at });
    }
    if (body.action !== "checkout" || !["solo", "venue"].includes(String(body.plan)) || !["month", "year"].includes(String(body.interval)) || typeof body.cardClub !== "boolean") return reply({ error: "Invalid checkout selection" }, 400);
    if (i.paid_at) return reply({ error: "This invitation has already been paid" }, 409);
    const key = crypto.randomUUID();
    const lock = await db.from("subscription_invitations").update({ checkout_lock_id: key, checkout_lock_at: new Date().toISOString() }).eq("id", i.id).is("revoked_at", null).is("paid_at", null).or(`checkout_lock_at.is.null,checkout_lock_at.lt.${new Date(Date.now() - 120000).toISOString()}`).select("*").single();
    if (lock.error || !lock.data) return reply({ error: "Checkout is processing; retry shortly" }, 409);
    checkoutLease = { id: i.id, key }; i = lock.data;
    const selection = { plan: body.plan, interval: body.interval, cardClub: body.cardClub };
    if (i.stripe_checkout_session_id) {
      const s = await stripe.checkout.sessions.retrieve(i.stripe_checkout_session_id); boundSession(i, s);
      if (s.status === "complete") return reply({ error: "Payment processing. Do not pay again", processing: true }, 409);
      if (s.status === "open" && JSON.stringify(selection) === JSON.stringify(i.selection)) return reply({ url: s.url });
      if (s.status === "open") await stripe.checkout.sessions.expire(s.id);
      const reset = await db.from("subscription_invitations").update({ attempt_id: null, selection: null, stripe_checkout_session_id: null }).eq("id", i.id).eq("attempt_id", i.attempt_id).is("paid_at", null).select("id");
      if (reset.error || !reset.data?.length) throw new Error("Checkout changed; retry");
      i.attempt_id = null;
    }
    await checkBilling(stripe, db, hub, i.intended_email, i.hub_kind, i.attempt_id);
    const main = await verifiedPrice(stripe, `${body.plan as "solo" | "venue"}_${body.interval as "month" | "year"}`);
    const club = body.cardClub ? await verifiedPrice(stripe, "card_club") : null;
    if (!i.attempt_id) {
      const claimed = await db.from("subscription_invitations").update({ attempt_id: crypto.randomUUID(), attempt_started_at: new Date().toISOString(), selection }).eq("id", i.id).is("attempt_id", null).is("paid_at", null).is("revoked_at", null).select("*").single();
      if (claimed.error || !claimed.data) return reply({ error: "Checkout is starting; retry shortly" }, 409);
      Object.assign(i, claimed.data);
    }
    if (JSON.stringify(i.selection) !== JSON.stringify(selection) || Date.now() - Date.parse(i.attempt_started_at) > 23 * 60 * 60 * 1000) return reply({ error: "Earlier payment requires review" }, 409);
    const meta = { commerce_version: INVITATION_VERSION, invitation_id: i.id, attempt_id: i.attempt_id, hub_kind: i.hub_kind, hub_id: i.hub_id, main_price_id: main.id };
    const total = subscriptionTotal(main.amount, body.interval as "month" | "year", body.cardClub);
    const s = await stripe.checkout.sessions.create({ mode: "subscription", customer_email: i.intended_email, payment_method_types: ["card"], allow_promotion_codes: false,
      billing_address_collection: "required", shipping_address_collection: { allowed_countries: ["US"] },
      line_items: [{ price: main.id, quantity: 1 }, ...(club ? body.interval === "month" ? [{ price: club.id, quantity: 1 }] : [{ price_data: { currency: "usd", product: club.product, unit_amount: 6000, recurring: { interval: "year" as const } }, quantity: 1 }] : [])],
      subscription_data: { metadata: meta }, metadata: meta,
      success_url: `${frontendUrl()}/subscribe?invite=${encodeURIComponent(String(body.token))}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl()}/subscribe?invite=${encodeURIComponent(String(body.token))}&canceled=1`,
      custom_text: { submit: { message: `$${total / 100} due today and every ${body.interval}. No free trial. ${body.cardClub ? `Includes Card Club ${body.interval === "year" ? "$60/year" : "$5/month"} on this subscription and invoice.` : "Card Club not included."} Your existing hub and cards stay online. Cancel anytime.` } },
    }, { idempotencyKey: `optional-hub-${i.attempt_id}` });
    if (s.livemode !== i.stripe_livemode) throw new Error("Checkout mode mismatch");
    const saved = await db.from("subscription_invitations").update({ stripe_checkout_session_id: s.id }).eq("id", i.id).eq("attempt_id", i.attempt_id).is("revoked_at", null).select("id");
    if (saved.error || !saved.data?.length) throw new Error("Checkout persistence pending; retry");
    return reply({ url: s.url });
  } catch { return reply({ error: "This invitation cannot continue. Ask your admin to confirm the email, billing or link status." }, 409); }
  finally { if (checkoutLease) await admin().from("subscription_invitations").update({ checkout_lock_id: null, checkout_lock_at: null }).eq("id", checkoutLease.id).eq("checkout_lock_id", checkoutLease.key); }
}

export async function paidInvitationProof(stripe: Stripe, i: any, s: Stripe.Checkout.Session) {
  boundSession(i, s);
  if (s.mode !== "subscription" || s.status !== "complete" || s.payment_status !== "paid") return null;
  const subId = idOf(s.subscription), customer = idOf(s.customer);
  if (!subId || !customer) throw new Error("Missing subscription");
  const sub = await stripe.subscriptions.retrieve(subId, { expand: ["latest_invoice"] });
  if (sub.livemode !== i.stripe_livemode || sub.metadata?.invitation_id !== i.id || sub.metadata.commerce_version !== INVITATION_VERSION || sub.metadata.attempt_id !== i.attempt_id || idOf(sub.customer) !== customer) throw new Error("Subscription binding mismatch");
  if (sub.status !== "active" || sub.trial_end || sub.items.has_more) return null;
  const choice = i.selection, main = await verifiedPrice(stripe, `${choice.plan}_${choice.interval}`);
  const items = sub.items.data, base = items.find(item => item.price.id === main.id);
  if (!base || base.quantity !== 1 || base.price.unit_amount !== main.amount || base.price.currency !== "usd" || base.price.recurring?.interval !== choice.interval || base.price.recurring.interval_count !== 1 || items.length !== (choice.cardClub ? 2 : 1)) throw new Error("Purchased selection mismatch");
  let clubItem = null;
  if (choice.cardClub) {
    const club = await verifiedPrice(stripe, "card_club");
    clubItem = items.find(item => item.id !== base.id);
    if (!clubItem || clubItem.quantity !== 1 || idOf(clubItem.price.product) !== club.product || clubItem.price.currency !== "usd" || clubItem.price.unit_amount !== (choice.interval === "year" ? 6000 : 500) || clubItem.price.recurring?.interval !== choice.interval || clubItem.price.recurring.interval_count !== 1) throw new Error("Card Club mismatch");
  }
  const inv = typeof sub.latest_invoice === "object" && sub.latest_invoice ? sub.latest_invoice : await stripe.invoices.retrieve(String(sub.latest_invoice));
  const total = subscriptionTotal(main.amount, choice.interval, choice.cardClub);
  if (inv.livemode !== i.stripe_livemode || !inv.paid || inv.status !== "paid" || inv.amount_paid < total || inv.currency !== "usd" || idOf(inv.customer) !== customer || idOf(inv.subscription) !== subId) return null;
  const paymentId = idOf(inv.payment_intent); if (!paymentId) return null;
  const pi = await stripe.paymentIntents.retrieve(paymentId, { expand: ["latest_charge"] });
  if (pi.livemode !== i.stripe_livemode || pi.status !== "succeeded" || pi.amount_received < total || pi.currency !== "usd" || idOf(pi.customer) !== customer || idOf(pi.invoice) !== inv.id) return null;
  const charge = typeof pi.latest_charge === "object" && pi.latest_charge ? pi.latest_charge : await stripe.charges.retrieve(String(pi.latest_charge));
  if (charge.livemode !== i.stripe_livemode || !charge.paid || charge.refunded || charge.disputed || charge.amount_refunded > 0 || idOf(charge.payment_intent) !== pi.id || idOf(charge.invoice) !== inv.id) return null;
  return { subscription: subId, customer, payment: pi.id, clubItem: clubItem?.id || null, clubPrice: clubItem?.price.id || null, paidAt: new Date((inv.status_transitions?.paid_at || Math.floor(Date.now() / 1000)) * 1000).toISOString() };
}

export async function activateSubscriptionInvitation(stripe: Stripe, supplied: Stripe.Checkout.Session) {
  if (supplied.metadata?.commerce_version !== INVITATION_VERSION) return;
  const db = admin(), r = await db.from("subscription_invitations").select("*").eq("id", supplied.metadata.invitation_id).single();
  if (r.error || !r.data) throw new Error("Invitation missing");
  const i = r.data, s = await stripe.checkout.sessions.retrieve(supplied.id);
  if (i.payment_hold_at) return;
  const proof = await paidInvitationProof(stripe, i, s); if (!proof) return;
  const shipping = s.shipping_details || (s as any).collected_information?.shipping_details;
  if (!shipping?.address?.line1 || !shipping.address.postal_code) throw new Error("Shipping missing");
  const saved = await db.rpc("fulfill_subscription_invitation", { _id: i.id, _session: s.id, _subscription: proof.subscription, _customer: proof.customer, _payment: proof.payment, _paid_at: proof.paidAt, _shipping: { ...shipping.address, name: shipping.name }, _club_item: proof.clubItem, _club_price: proof.clubPrice });
  if (saved.error || !saved.data?.paid) throw saved.error || new Error("Activation pending");
  const fresh = await db.from("subscription_invitations").select("*").eq("id", i.id).single();
  if (fresh.error) throw fresh.error;
  await deliverInvitationAccess(db, fresh.data);
}

export async function syncSubscriptionInvitation(stripe: Stripe, subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (sub.metadata?.commerce_version !== INVITATION_VERSION) return false;
  const db = admin(), r = await db.from("subscription_invitations").select("*").eq("id", sub.metadata.invitation_id).single();
  if (r.error || !r.data || !r.data.stripe_checkout_session_id) throw new Error("Invitation persistence pending");
  const i = r.data;
  if (sub.livemode !== i.stripe_livemode) throw new Error("Mode mismatch");
  if (!i.paid_at || !i.welcome_email_sent_at) await activateSubscriptionInvitation(stripe, await stripe.checkout.sessions.retrieve(i.stripe_checkout_session_id));
  // Unpaid invitations never touch public state; established paid subscriptions follow current Stripe truth.
  if (i.paid_at) {
    const updated = await db.from(table(i.hub_kind)).update({ subscription_status: sub.status }).eq("id", i.hub_id).eq("stripe_subscription_id", subscriptionId);
    if (updated.error) throw updated.error;
  }
  return true;
}

async function deliverInvitationAccess(db: any, i: any, resend = false) {
  if (!i?.paid_at || i.payment_hold_at || !resend && i.welcome_email_sent_at) return;
  const started = new Date().toISOString();
  const lease = await db.from("subscription_invitations").update({ welcome_email_started_at: started }).eq("id", i.id).is("payment_hold_at", null).or(`welcome_email_started_at.is.null,welcome_email_started_at.lt.${new Date(Date.now() - 120000).toISOString()}`).select("id");
  if (lease.error || !lease.data?.length) throw new Error("Email processing; retry");
  try {
    const found = await db.rpc("get_auth_user_by_email", { lookup_email: i.intended_email }); if (found.error) throw found.error;
    const existing = found.data?.[0]?.id;
    if (i.bound_owner_id && !i.owner_placeholder && existing !== i.bound_owner_id) throw new Error("Bound owner email changed");
    let token = i.access_delivery_token;
    if (!token || resend) {
      const generated = await db.auth.admin.generateLink({ type: "magiclink", email: i.intended_email });
      const authHash = generated.data?.properties?.hashed_token, uid = generated.data?.user?.id;
      const verificationType = generated.data?.properties?.verification_type;
      if (generated.error || !authHash || !uid || !["magiclink", "signup"].includes(verificationType) || i.bound_owner_id && !i.owner_placeholder && uid !== i.bound_owner_id) throw new Error("Secure access unavailable");
      token = secret(); const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      // Keep the returned OTP type alongside its hash; old unprefixed magic links remain valid.
      const persisted = await db.from("subscription_invitations").update({ access_delivery_token: token, access_token_hash: await hashValue(token), access_auth_hash: `${verificationType}:${authHash}`, access_user_id: uid, access_expires_at: expires, access_consumed_at: null }).eq("id", i.id).eq("welcome_email_started_at", started);
      if (persisted.error) throw persisted.error;
    }
    const url = `${frontendUrl()}/subscribe/access#token=${token}`;
    const result = await sendEmailAndLog({ to: i.intended_email, subject: "Your TapAway dashboard access", templateKey: "optional_subscription_access", profileId: i.hub_kind === "personal" ? i.hub_id : undefined, idempotencyKey: `optional-access/${i.id}/${resend ? started : "first"}`,
      html: wrapEmail({ preheader: "Your payment is confirmed. Verify your email to access your existing hub.", headline: "Your TapAway subscription is ready", introHtml: "<p>Your existing hub, links and cards remain unchanged. Confirm your email to open your dashboard and arrange your included cards.</p>", bodyHtml: "<p>This private link works once and expires in one hour. Never share it.</p>", ctaLabel: "Verify email & open dashboard", ctaUrl: escapeHtml(url) }), text: `Your payment is confirmed. Your existing hub stays online. Verify your email and open your dashboard: ${url}\nThis link works once and expires in one hour.` });
    if (!result.ok) throw new Error("Email retry required");
    const saved = await db.from("subscription_invitations").update({ welcome_email_sent_at: new Date().toISOString(), welcome_email_started_at: null }).eq("id", i.id).eq("welcome_email_started_at", started);
    if (saved.error) throw saved.error;
  } catch (e) { await db.from("subscription_invitations").update({ welcome_email_started_at: null }).eq("id", i.id).eq("welcome_email_started_at", started); throw e; }
}

async function redeemAccess(db: any, body: Record<string, unknown>) {
  if (typeof body.accessToken !== "string" || !/^[a-f0-9]{64}$/.test(body.accessToken)) return reply({ error: "Invalid access link" }, 400);
  const r = await db.from("subscription_invitations").select("*").eq("access_token_hash", await hashValue(body.accessToken)).single();
  const i = r.data;
  if (r.error || !i?.paid_at || i.revoked_at || i.payment_hold_at || i.access_consumed_at || Date.parse(i.access_expires_at) <= Date.now()) return reply({ error: "Access link expired or already used" }, 410);
  const proof = await paidInvitationProof(getStripe(), i, await getStripe().checkout.sessions.retrieve(i.stripe_checkout_session_id));
  if (!proof) return reply({ error: "Payment needs review" }, 409);
  const claimed = await db.from("subscription_invitations").update({ access_consumed_at: new Date().toISOString() }).eq("id", i.id).is("access_consumed_at", null).select("id");
  if (claimed.error || !claimed.data?.length) return reply({ error: "Access link already used" }, 410);
  const stored = typeof i.access_auth_hash === "string" ? i.access_auth_hash : "";
  const separator = stored.indexOf(":");
  const type = separator < 0 ? "magiclink" : stored.slice(0, separator);
  const tokenHash = separator < 0 ? stored : stored.slice(separator + 1);
  if ((type !== "magiclink" && type !== "signup") || !tokenHash) return reply({ error: "Verification failed. Request a new link" }, 410);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) throw new Error("Auth verification unavailable");
  // verifyOtp installs a session even without persistence. Never sign in the privileged db client.
  const authClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const verified = await authClient.auth.verifyOtp({ token_hash: tokenHash, type });
  if (verified.error || verified.data?.user?.id !== i.access_user_id || normalizedEmail(verified.data.user.email) !== i.intended_email || !verified.data.session) return reply({ error: "Verification failed. Request a new link" }, 410);
  const associated = await db.rpc("associate_subscription_invitation", { _id: i.id, _user: verified.data.user.id, _email: i.intended_email });
  if (associated.error || !associated.data?.associated) return reply({ error: "Owner association needs review" }, 409);
  const owned = await hubFor(db, i.hub_kind, i.hub_id);
  if ((i.hub_kind === "personal" ? owned.user_id : owned.owner_id) !== verified.data.user.id) return reply({ error: "Owner association needs review" }, 409);
  const dashboardPath = i.hub_kind === "personal" ? `/dashboard?type=lite&profile_id=${encodeURIComponent(i.hub_id)}` : `/dashboard?type=restaurant&restaurant_id=${encodeURIComponent(i.hub_id)}`;
  return reply({ dashboardPath, session: { access_token: verified.data.session.access_token, refresh_token: verified.data.session.refresh_token } });
}