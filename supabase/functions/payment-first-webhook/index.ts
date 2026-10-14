// Stripe webhook for payment-first onboarding only. Source of truth for activation.
// Nothing is written until the Stripe signature verifies AND the event's livemode
// matches this deployment's mode (test events never touch live state and vice versa).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { admin, getStripe, ONBOARDING_VERSION, stripeMode, webhookSecret } from "../_shared/paymentFirst.ts";
import { activateCheckout, syncMembership } from "../_shared/paymentFirstActivation.ts";

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
  const { data: claim } = await db.rpc("claim_stripe_event", { p_event_id: event.id, p_event_type: event.type });
  const row = Array.isArray(claim) ? claim[0] : claim;
  if (row && row.claimed === false) return new Response("duplicate", { status: 200 });

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.metadata?.onboarding_version === ONBOARDING_VERSION) await activateCheckout(stripe, s);
    } else if (event.type === "invoice.paid") {
      const inv = event.data.object as Stripe.Invoice;
      const sub = invoiceSubscriptionId(inv as unknown as Record<string, any>);
      if (sub && inv.amount_paid > 0) {
        const { data: m } = await db.from("card_club_memberships").select("*").eq("card_club_stripe_subscription_id", sub).maybeSingle();
        if (m && m.status !== "cancelled" && m.status !== "declined") {
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
        const { data: ms } = await db.from("card_club_memberships").select("*")
          .or(`card_club_stripe_subscription_id.eq.${sub},main_stripe_subscription_id.eq.${sub}`);
        for (const m of ms ?? []) await syncMembership(stripe, db, m);
      }
    }
    await db.from("processed_stripe_events").update({ status: "processed" }).eq("event_id", event.id);
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("[payment-first-webhook] failed", event.type, e instanceof Error ? e.message : e);
    await db.from("processed_stripe_events").delete().eq("event_id", event.id);
    return new Response("retry", { status: 500 });
  }
});
