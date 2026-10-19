import {
  getCampaignParams,
  getOnboardingData,
  saveOnboardingData,
} from "./onboardingData";
import type { BillingInterval, OnboardingPlan } from "./onboardingCatalog";

export type StorefrontAudience = "business" | "personal";

/** Carry the selected offer and attribution through /start, including reloads. */
export function selectStorefrontPlan(
  plan: OnboardingPlan,
  interval: BillingInterval,
  search: string,
  audience: StorefrontAudience,
) {
  const saved = getOnboardingData();
  saveOnboardingData({
    planType: plan,
    billingInterval: interval,
    billingSelectionExplicit: true,
    hasProtection: false,
    cardClubSelected: false,
    audience,
    dashboardType: plan === "solo" ? "personal" : "restaurant",
    campaign: { ...saved.campaign, ...getCampaignParams() },
  });
  const params = new URLSearchParams(search);
  params.set("plan", plan);
  params.set("billing", interval);
  params.set("audience", audience);
  return `/start?${params.toString()}`;
}
