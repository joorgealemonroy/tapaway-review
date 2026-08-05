// Shared Stripe product/price resolution so every checkout path bills the same
// canonical amounts (base $20/mo, bundle $25/mo, annual $199/yr).
import Stripe from 'https://esm.sh/stripe@14.21.0';

export const PRICE_AMOUNTS = {
  baseMonthly: 2000, // $20/mo
  cardClubMonthly: 500, // +$5/mo
  bundleMonthly: 2500, // $25/mo
  annual: 19900, // $199/yr, Card Club included
} as const;

export async function findOrCreateProduct(
  stripe: Stripe,
  key: string,
  value: string,
  name: string,
): Promise<string> {
  const existing = await stripe.products.search({
    query: `metadata["${key}"]:"${value}" active:"true"`,
    limit: 1,
  });
  if (existing.data.length > 0) return existing.data[0].id;
  const product = await stripe.products.create({ name, metadata: { [key]: value } });
  return product.id;
}

export async function findOrCreatePrice(
  stripe: Stripe,
  productId: string,
  unitAmount: number,
  interval: 'month' | 'year',
): Promise<string> {
  const prices = await stripe.prices.list({ product: productId, type: 'recurring', active: true, limit: 50 });
  const match = prices.data.find(
    (p: Stripe.Price) =>
      p.unit_amount === unitAmount && p.currency === 'usd' && p.recurring?.interval === interval,
  );
  if (match) return match.id;
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: 'usd',
    recurring: { interval },
  });
  return price.id;
}

/** Resolves the recurring price id for the personal plan ($20/mo or $199/yr). */
export async function resolvePersonalPriceId(
  stripe: Stripe,
  planType: 'monthly' | 'yearly' | string,
): Promise<string> {
  if (planType === 'yearly') {
    const prod = await findOrCreateProduct(
      stripe,
      'tapaway_plan',
      'annual_value_pass',
      'TapAway Annual Value Pass',
    );
    return findOrCreatePrice(stripe, prod, PRICE_AMOUNTS.annual, 'year');
  }
  const prod = await findOrCreateProduct(
    stripe,
    'tapaway_plan',
    'base_software',
    'TapAway Base Software',
  );
  return findOrCreatePrice(stripe, prod, PRICE_AMOUNTS.baseMonthly, 'month');
}
