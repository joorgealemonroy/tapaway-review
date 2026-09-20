import Stripe from "https://esm.sh/stripe@14.21.0";

export type OnboardingPlan = "solo" | "venue";
export type BillingInterval = "month" | "year";

type CatalogRule = {
  plan: OnboardingPlan;
  interval: BillingInterval;
  amount: number;
  productKey: string;
  label: string;
  priceId: string;
};

export const ONBOARDING_CATALOG_RULES: CatalogRule[] = [
  { plan: "solo", interval: "month", amount: 2000, productKey: "solo", label: "TapAway Solo", priceId: "price_1UF9UkDg8DaTuVNZfeu06iQ6" },
  { plan: "solo", interval: "year", amount: 19900, productKey: "annual_value_pass", label: "TapAway Solo", priceId: "price_1UCl7ZDg8DaTuVNZMQw3XC3g" },
  { plan: "venue", interval: "month", amount: 3900, productKey: "venue", label: "TapAway Pro", priceId: "price_1TLK31Dg8DaTuVNZu9t79rFA" },
  { plan: "venue", interval: "year", amount: 39000, productKey: "venue", label: "TapAway Pro", priceId: "price_1UF9UoDg8DaTuVNZKYLiLHl7" },
];

export type VerifiedCatalogItem = {
  plan: OnboardingPlan;
  interval: BillingInterval;
  priceId: string;
  amount: number;
  currency: "usd";
  trialDays: 14;
  available: true;
};

const cache = new Map<string, { expiresAt: number; value: VerifiedCatalogItem }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function productObject(price: Stripe.Price): Stripe.Product | null {
  return typeof price.product === "object" && price.product && !price.product.deleted
    ? price.product as Stripe.Product
    : null;
}

function validatePrice(price: Stripe.Price, rule: CatalogRule): VerifiedCatalogItem {
  const product = productObject(price);
  const valid = price.active
    && price.type === "recurring"
    && price.currency === "usd"
    && price.unit_amount === rule.amount
    && price.recurring?.interval === rule.interval
    && product?.active === true
    && product.metadata?.tapaway_plan === rule.productKey;
  if (!valid) throw new Error(`Invalid Stripe catalog mapping for ${rule.plan}_${rule.interval}`);
  return { plan: rule.plan, interval: rule.interval, priceId: price.id, amount: rule.amount, currency: "usd", trialDays: 14, available: true };
}

export async function resolveOnboardingPrice(
  stripe: Stripe,
  plan: OnboardingPlan,
  interval: BillingInterval,
  forceRefresh = false,
): Promise<VerifiedCatalogItem> {
  const rule = ONBOARDING_CATALOG_RULES.find((item) => item.plan === plan && item.interval === interval);
  if (!rule) throw new Error("Unknown onboarding catalog selection");
  const cacheKey = `${plan}_${interval}`;
  const cached = cache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.value;

  const price = await stripe.prices.retrieve(rule.priceId, { expand: ["product"] });
  const value = validatePrice(price, rule);
  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
}

export async function getPublicOnboardingCatalog(stripe: Stripe) {
  const results = await Promise.all(ONBOARDING_CATALOG_RULES.map(async (rule) => {
    try {
      const item = await resolveOnboardingPrice(stripe, rule.plan, rule.interval);
      return { plan: item.plan, interval: item.interval, amount: item.amount, currency: item.currency, trialDays: item.trialDays, available: true as const };
    } catch (error) {
      console.error("[onboarding-catalog] Mapping unavailable", { plan: rule.plan, interval: rule.interval, error: error instanceof Error ? error.message : "unknown" });
      return { plan: rule.plan, interval: rule.interval, amount: rule.amount, currency: "usd" as const, trialDays: 14 as const, available: false as const };
    }
  }));
  return results;
}