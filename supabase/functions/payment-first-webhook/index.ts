// Stripe webhook for payment-first onboarding only. Source of truth for activation.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { admin, getStripe, ONBOARDING_VERSION, webhookSecret } from "../_shared/paymentFirst.ts";
import { activateCheckout, syncMembership } from "../_shared/paymentFirstActivation.ts";

serve(async (req) => {
  const secret = webhookSecret();
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return new Response("Missing signature", { status: 400 });
  const stripe = getStripe();
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret, undefined, Stripe.createSubtleCryptoProvider());
  } catch {
    return new Response("Bad signature", { status: 400 });
  }
  const db = admin();
  const { data: claim } = await db.rpc("claim_stripe_event", { p_event_id: event.id, p_event_type: event.type });
  const row = Array.isArray(claim) ? claim[0] : claim;
  if (row && row.claimed === false && row.existing_status === "processed") return new Response("duplicate", { status: 200 });

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.metadata?.onboarding_version === ONBOARDING_VERSION) await activateCheckout(stripe, s);
    } else if (event.type === "invoice.paid") {
      const inv = event.data.object as Stripe.Invoice;
      const sub = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
      if (sub && inv.amount_paid > 0) {
        const { data: m } = await db.from("card_club_memberships").select("*").eq("card_club_stripe_subscription_id", sub).maybeSingle();
        if (m && m.status !== "cancelled") {
          const paidAt = new Date((inv.status_transitions?.paid_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
          if (!m.card_club_paid_at) await db.from("card_club_memberships").update({ card_club_paid_at: paidAt }).eq("id", m.id).is("card_club_paid_at", null);
          await syncMembership(stripe, db, { ...m, card_club_paid_at: m.card_club_paid_at ?? paidAt });
        }
      }
    } else if (["invoice.payment_failed", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      const obj = event.data.object as Stripe.Invoice | Stripe.Subscription;
      const sub = "object" in obj && obj.object === "invoice"
        ? (typeof (obj as Stripe.Invoice).subscription === "string" ? (obj as Stripe.Invoice).subscription as string : (obj as Stripe.Invoice).subscription?.id)
        : (obj as Stripe.Subscription).id;
      if (sub) {
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
