import Stripe from "https://esm.sh/stripe@14.21.0";

export type OnboardingPlan = "solo" | "venue";
export type BillingInterval = "month" | "year";

type CatalogRule = {
  plan: OnboardingPlan;
  interval: BillingInterval;
  amount: number;
  productKey: string;
  label: string;
  lookupKey: string;
  envKey: string;
};

export const ONBOARDING_CATALOG_RULES: CatalogRule[] = [
  { plan: "solo", interval: "month", amount: 2000, productKey: "solo", label: "TapAway Solo", lookupKey: "tapaway_solo_monthly", envKey: "STRIPE_SOLO_MONTHLY_PRICE_ID" },
  { plan: "solo", interval: "year", amount: 19900, productKey: "annual_value_pass", label: "TapAway Solo", lookupKey: "tapaway_solo_yearly", envKey: "STRIPE_SOLO_YEARLY_PRICE_ID" },
  { plan: "venue", interval: "month", amount: 3900, productKey: "venue", label: "TapAway Pro", lookupKey: "tapaway_pro_monthly", envKey: "STRIPE_PRO_MONTHLY_PRICE_ID" },
  { plan: "venue", interval: "year", amount: 39000, productKey: "venue", label: "TapAway Pro", lookupKey: "tapaway_pro_yearly", envKey: "STRIPE_PRO_YEARLY_PRICE_ID" },
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

  const explicitPriceId = Deno.env.get(rule.envKey)?.trim();
  let price: Stripe.Price | null = null;
  if (explicitPriceId) {
    price = await stripe.prices.retrieve(explicitPriceId, { expand: ["product"] });
  } else {
    const byLookupKey = await stripe.prices.list({ lookup_keys: [rule.lookupKey], active: true, limit: 2, expand: ["data.product"] });
    if (byLookupKey.data.length === 1) price = byLookupKey.data[0];
  }
  if (!price) throw new Error(`Missing exact Stripe catalog mapping for ${cacheKey}`);
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