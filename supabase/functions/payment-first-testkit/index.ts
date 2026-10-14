// TEST-ONLY helper for payment-first QA (Stripe test clocks). Refuses in live mode and without the private test key.
// Remove after QA.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin, cors, getStripe, json, paymentFirstAllowed, stripeMode } from "../_shared/paymentFirst.ts";
import { ensureCardClubSubscription } from "../_shared/paymentFirstActivation.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (stripeMode() !== "test" || Deno.env.get("PAYMENT_FIRST_ENABLED") === "true" || !(await paymentFirstAllowed(req))) return json({ error: "Not available." }, 404);
  const stripe = getStripe();
  const db = admin();
  const body = await req.json().catch(() => ({}));
  const { data: intent } = await db.from("checkout_intents").select("*").eq("stripe_checkout_session_id", String(body.sessionId || "")).maybeSingle();
  if (!intent || intent.stripe_livemode) return json({ error: "No test intent." }, 404);
  const { data: m } = await db.from("card_club_memberships").select("*").eq("checkout_intent_id", intent.id).maybeSingle();
  const cust = await stripe.customers.retrieve(intent.stripe_customer_id) as unknown as { test_clock?: string };

  if (body.action === "advance") {
    if (!cust.test_clock) return json({ error: "no clock" }, 400);
    const clock = await stripe.testHelpers.testClocks.retrieve(cust.test_clock);
    const to = clock.frozen_time + Math.round(Number(body.days) * 86400);
    await stripe.testHelpers.testClocks.advance(cust.test_clock, { frozen_time: to });
    for (let i = 0; i < 30; i++) {
      const c = await stripe.testHelpers.testClocks.retrieve(cust.test_clock);
      if (c.status === "ready") break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    return json({ ok: true, frozen_time: to });
  }
  if (body.action === "recover") {
    // Swap to a working card and pay the open Card Club invoice (real Stripe payment in test mode).
    const pm = await stripe.paymentMethods.attach("pm_card_visa", { customer: intent.stripe_customer_id });
    await stripe.customers.update(intent.stripe_customer_id, { invoice_settings: { default_payment_method: pm.id } });
    const subs = [m?.card_club_stripe_subscription_id, intent.stripe_subscription_id].filter(Boolean) as string[];
    const paid: string[] = [];
    for (const s of subs) {
      await stripe.subscriptions.update(s, { default_payment_method: pm.id });
      const inv = await stripe.invoices.list({ subscription: s, status: "open", limit: 5 });
      for (const i of inv.data) { const r = await stripe.invoices.pay(i.id, { payment_method: pm.id }); paid.push(`${s}:${r.status}`); }
    }
    return json({ ok: true, paid });
  }
  if (body.action === "break_club") {
    // Simulate a Card Club activation failure for retry testing.
    if (!m) return json({ error: "no membership" }, 400);
    await db.from("card_club_memberships").update({ status: "activation_failed", card_club_stripe_subscription_id: null, card_club_stripe_subscription_item_id: null, review_reason: "simulated failure" }).eq("id", m.id);
    return json({ ok: true, previous_subscription: m.card_club_stripe_subscription_id });
  }
  if (body.action === "retry") {
    if (!m) return json({ error: "no membership" }, 400);
    await ensureCardClubSubscription(stripe, db, m.id);
    const { data } = await db.from("card_club_memberships").select("status, card_club_stripe_subscription_id").eq("id", m.id).single();
    return json(data);
  }
  if (body.action === "status") {
    const subs = await stripe.subscriptions.list({ customer: intent.stripe_customer_id, status: "all" });
    return json({ membership: m, subs: subs.data.map((s) => ({ id: s.id, status: s.status, desc: s.description, trial_end: s.trial_end })) });
  }
  return json({ error: "unknown action" }, 400);
});
