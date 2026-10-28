import Stripe from 'https://esm.sh/stripe@14.21.0';

export const LEGACY_CARD_ADDON_PRICE = 'price_1TMM0LDg8DaTuVNZUgZ4GtWJ';
const id = (value: any): string | null => typeof value === 'string' ? value : value?.id ?? null;

/** The old standalone plan includes three cards per calendar month. A dashboard
 * flag is only presentation; a current paid live subscription is the authority.
 * Modern Card Club memberships keep their separate canonical eligibility rules.
 */
export async function legacyCardPaymentProof(stripe: Stripe, db: any, profile: { id: string; stripe_customer_id: string | null }) {
  if (!/^cus_[A-Za-z0-9]+$/.test(profile.stripe_customer_id || '')) return null;
  const subscriptions = await stripe.subscriptions.list({ customer: profile.stripe_customer_id!, status: 'active', limit: 100, expand: ['data.latest_invoice'] });
  for (const sub of subscriptions.data) {
    if (sub.livemode !== true || sub.status !== 'active' || id(sub.customer) !== profile.stripe_customer_id
      || sub.current_period_end <= Math.floor(Date.now() / 1000) || sub.items.data.length !== 1) continue;
    const item = sub.items.data[0], price = item.price;
    if (item.quantity !== 1 || price.id !== LEGACY_CARD_ADDON_PRICE || price.unit_amount !== 500 || price.currency !== 'usd'
      || price.recurring?.interval !== 'month' || price.recurring?.interval_count !== 1) continue;
    const membership = await db.from('card_club_memberships').select('id').eq('card_club_stripe_subscription_id', sub.id).maybeSingle();
    if (membership.error) throw membership.error;
    if (membership.data) continue;
    // Legacy checkout stored the profile in the Checkout Session, not on the
    // subscription. Recover that exact server-created relationship rather than
    // granting the same paid add-on to every profile sharing a customer ID.
    const sessions = await stripe.checkout.sessions.list({ subscription: sub.id, limit: 100 });
    if (!sessions.data.some(session => session.livemode === true && session.status === 'complete' && session.mode === 'subscription'
      && id(session.subscription) === sub.id && id(session.customer) === profile.stripe_customer_id
      && session.metadata?.type === 'card_addon' && session.metadata?.profile_id === profile.id)) continue;
    const invoiceId = id(sub.latest_invoice);
    if (!invoiceId) continue;
    const invoice = typeof sub.latest_invoice === 'object' && sub.latest_invoice ? sub.latest_invoice : await stripe.invoices.retrieve(invoiceId);
    if (invoice.livemode !== true || invoice.status !== 'paid' || invoice.paid !== true || invoice.amount_paid <= 0
      || invoice.currency !== 'usd' || id(invoice.customer) !== profile.stripe_customer_id || id(invoice.subscription) !== sub.id
      || !invoice.lines.data.some(line => line.subscription_item === item.id && id(line.price) === price.id && line.amount > 0)) continue;
    const paymentId = id(invoice.payment_intent);
    if (!paymentId) continue;
    const payment = await stripe.paymentIntents.retrieve(paymentId, { expand: ['latest_charge'] });
    if (payment.livemode !== true || payment.status !== 'succeeded' || payment.currency !== 'usd' || payment.amount_received <= 0
      || id(payment.customer) !== profile.stripe_customer_id || id(payment.invoice) !== invoice.id) continue;
    const chargeId = id(payment.latest_charge);
    if (!chargeId) continue;
    const charge = typeof payment.latest_charge === 'object' && payment.latest_charge ? payment.latest_charge : await stripe.charges.retrieve(chargeId);
    if (charge.livemode !== true || charge.paid !== true || charge.refunded || charge.disputed || charge.amount_refunded > 0
      || id(charge.payment_intent) !== payment.id || id(charge.customer) !== profile.stripe_customer_id || id(charge.invoice) !== invoice.id) continue;
    return { subscriptionId: sub.id, invoiceId: invoice.id, paymentIntentId: payment.id };
  }
  return null;
}
