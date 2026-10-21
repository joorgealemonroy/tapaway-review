import Stripe from 'https://esm.sh/stripe@14.21.0';
import { admin, stripeMode } from './paymentFirst.ts';

/** Older accounts use the same Stripe lifecycle endpoint, without legacy email,
 * commission, or content-archiving side effects. Never match by customer alone. */
export async function syncLegacySubscription(stripe: Stripe, subscriptionId: string) {
  const db = admin();
  const groups: { table: string; ids: string[] }[] = [];
  for (const table of ['personal_profiles', 'restaurants']) {
    const columns = table === 'personal_profiles' ? 'id,payment_state,onboarding_source' : 'id,payment_state';
    const { data, error } = await db.from(table).select(columns).eq('stripe_subscription_id', subscriptionId);
    if (error) throw error;
    const ids = (data || []).filter((row: any) => row.payment_state !== 'complimentary' &&
      !/^(payment_first|personal_cards_v1)/.test(row.onboarding_source || '')).map((row: any) => row.id);
    if (ids.length) groups.push({ table, ids });
  }
  if (!groups.length) return;
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (sub.livemode !== (stripeMode() === 'live')) throw new Error('Legacy subscription environment mismatch');
  // No legacy production row can become entitled from a TEST subscription.
  if (!sub.livemode) return;
  for (const group of groups) {
    const { error } = await db.from(group.table).update({ subscription_status: sub.status,
      trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    }).in('id', group.ids).eq('stripe_subscription_id', subscriptionId);
    if (error) throw error;
  }
}
