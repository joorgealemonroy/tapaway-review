// Stripe webhook for payment-first onboarding only. Source of truth for activation.
// Nothing is written until the Stripe signature verifies AND the event's livemode
// matches this deployment's mode (test events never touch live state and vice versa).
import { syncLegacySubscription } from "../_shared/legacyBillingSync.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { admin, getStripe, ONBOARDING_VERSION, stripeMode, webhookSecret } from "../_shared/paymentFirst.ts";
import { activatePersonalOrder, syncPersonalSubscription, PERSONAL_VERSION } from "../_shared/personalCards.ts";
import { activateCheckout, syncMembership, syncBusinessSubscription } from "../_shared/paymentFirstActivation.ts";

/** Subscription id on an invoice across Stripe API versions. */
export function invoiceSubscriptionId(inv: Record<string, any>): string | null {
  const direct = inv.subscription;
  if (typeof direct === "string") return direct;
  if (direct?.id) return direct.id;
  const nested = inv.parent?.subscription_details?.subscription;
  if (typeof nested === "string") return nested;
  const line = inv.lines?.data?.[0];
  return line?.subscription ?? line?.parent?.subscription_item_details?.subscription ?? null;
}

/** Accept both the pinned SDK shape and the newer live webhook invoice shape. */
function invoiceLineMatchesClub(line: Stripe.InvoiceLineItem, membership: Record<string, any>) {
  const modern = line as unknown as {
    parent?: { subscription_item_details?: { subscription_item?: string } };
    pricing?: { price_details?: { price?: string | { id: string } } };
  };
  const item = line.subscription_item || modern.parent?.subscription_item_details?.subscription_item;
  const price = line.price?.id || modern.pricing?.price_details?.price;
  const priceId = typeof price === "string" ? price : price?.id;
  return line.amount > 0 && (
    (!!membership.card_club_stripe_subscription_item_id && item === membership.card_club_stripe_subscription_item_id) ||
    (!!membership.stripe_price_id && priceId === membership.stripe_price_id)
  );
}

serve(async (req) => {
  const secret = webhookSecret();
  if (!secret) {
    console.error("[payment-first-webhook] signing secret missing for mode", stripeMode());
    return new Response("Webhook not configured", { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });
  const raw = await req.text();
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret, undefined, Stripe.createSubtleCryptoProvider());
  } catch {
    return new Response("Bad signature", { status: 400 });
  }
  if (event.livemode !== (stripeMode() === "live")) {
    console.error("[payment-first-webhook] livemode mismatch", event.id, event.livemode, stripeMode());
    return new Response("Wrong environment", { status: 400 });
  }

  const db = admin();
  // Namespaced so the legacy stripe-webhook (same table, same event ids) never dedups us or vice versa.
  const claimId = `pf:${event.id}`;
  const { data: claim, error: claimError } = await db.rpc("claim_stripe_event", { p_event_id: claimId, p_event_type: event.type });
  if (claimError) return new Response("Claim unavailable", { status: 503 });
  const row = Array.isArray(claim) ? claim[0] : claim;
  if (!row) return new Response("Claim unavailable", { status: 503 });
  if (row.claimed === false) {
    if (row.existing_status === "processed") return new Response("duplicate", { status: 200 });
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: takeover, error } = await db.from("processed_stripe_events").update({ processed_at: new Date().toISOString() }).eq("event_id", claimId).eq("status", "claimed").lt("processed_at", cutoff).select("event_id");
    if (error || !takeover?.length) return new Response("Event in progress; retry", { status: 503 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.metadata?.onboarding_version === ONBOARDING_VERSION) await activateCheckout(stripe, s);
      if (s.metadata?.commerce_version === PERSONAL_VERSION) await activatePersonalOrder(stripe, s);
    } else if (event.type === "invoice.paid") {
      const inv = event.data.object as Stripe.Invoice;
      const sub = invoiceSubscriptionId(inv as unknown as Record<string, any>);
      if (sub) { await syncPersonalSubscription(stripe, sub); await syncBusinessSubscription(stripe, sub); await syncLegacySubscription(stripe, sub); }
      if (sub && inv.amount_paid > 0) {
        const { data: m } = await db.from("card_club_memberships").select("*").eq("card_club_stripe_subscription_id", sub).maybeSingle();
        const paidClubLine = m && (m.card_club_stripe_subscription_id !== m.main_stripe_subscription_id || inv.lines.data.some(line => invoiceLineMatchesClub(line, m)));
        if (m && paidClubLine && m.status !== "cancelled" && m.status !== "declined") {
          // The actual successful payment time — never trial or checkout dates.
          const paidAt = new Date((inv.status_transitions?.paid_at ?? event.created) * 1000).toISOString();
          if (!m.card_club_paid_at) await db.from("card_club_memberships").update({ card_club_paid_at: paidAt }).eq("id", m.id).is("card_club_paid_at", null);
          await syncMembership(stripe, db, { ...m, card_club_paid_at: m.card_club_paid_at ?? paidAt });
        }
      }
    } else if (["invoice.payment_failed", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      const obj = event.data.object as unknown as Record<string, any>;
      const sub = obj.object === "invoice" ? invoiceSubscriptionId(obj) : (obj.id as string);
      if (sub && /^sub_[A-Za-z0-9]+$/.test(sub)) {
        await syncPersonalSubscription(stripe, sub);
        await syncBusinessSubscription(stripe, sub);
        await syncLegacySubscription(stripe, sub);
        const { data: ms } = await db.from("card_club_memberships").select("*")
          .or(`card_club_stripe_subscription_id.eq.${sub},main_stripe_subscription_id.eq.${sub}`);
        for (const m of ms ?? []) await syncMembership(stripe, db, m);
      }
    }
    if (["charge.refunded", "charge.dispute.created"].includes(event.type)) {
      const obj = event.data.object as unknown as Record<string, any>;
      const charge = event.type === "charge.dispute.created" ? await stripe.charges.retrieve(typeof obj.charge === "string" ? obj.charge : obj.charge.id) : obj;
      const payment = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      const invoiceId = typeof charge.invoice === "string" ? charge.invoice : charge.invoice?.id;
      const invoice = invoiceId ? await stripe.invoices.retrieve(invoiceId) : null;
      const subscription = invoice ? invoiceSubscriptionId(invoice as unknown as Record<string, any>) : null;
      // A later $5 hosting refund must not refund or stop the original physical-card order.
      const originalPurchase = !invoice || invoice.billing_reason === "subscription_create";
      if (originalPurchase && (payment || subscription)) {
        // Partial refunds require staff review, but are not represented as a full refund.
        const status = event.type === "charge.dispute.created" ? "disputed" : charge.refunded ? "refunded" : undefined;
        let query = db.from("personal_card_orders").update({ ...(status ? { status } : {}), production_status: "on_hold" }).eq("stripe_livemode", event.livemode);
        query = subscription ? query.eq("stripe_subscription_id", subscription) : query.eq("stripe_payment_intent_id", payment);
        const { error } = await query;
        if (error) throw error;
      }
    }
    const { error: markedError } = await db.from("processed_stripe_events").update({ status: "processed" }).eq("event_id", claimId).eq("status", "claimed");
    if (markedError) throw markedError;
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("[payment-first-webhook] failed", event.type, e instanceof Error ? e.message : e);
    await db.from("processed_stripe_events").delete().eq("event_id", claimId).eq("status", "claimed");
    return new Response("retry", { status: 500 });
  }
});
