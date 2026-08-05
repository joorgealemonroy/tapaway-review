export const PERSONAL_PLANS = {
  paid: {
    name: 'Business',
    maxLinks: -1, // unlimited
    price: '$20',
    priceSubtext: '/month',
    features: {
      customHeader: true,
      photoCollage: true,
      emailCapture: true,
      advancedAnalytics: true,
      socialIconBar: true,
      youtube: true,
      image: true,
      text: true,
      button: true,
    },
  },
  vip: {
    name: 'VIP',
    maxLinks: -1, // unlimited
    price: '$0',
    priceSubtext: 'forever',
    features: {
      customHeader: true,
      photoCollage: true,
      emailCapture: true,
      advancedAnalytics: true,
      socialIconBar: true,
      youtube: true,
      image: true,
      text: true,
      button: true,
    },
  },
} as const;

export type PlanType = keyof typeof PERSONAL_PLANS;
export type FeatureKey = keyof typeof PERSONAL_PLANS.paid.features;

export function getPlanLimits(planType: string | null) {
  if (planType === 'vip') return PERSONAL_PLANS.vip;
  return PERSONAL_PLANS.paid;
}

export function isFeatureAvailable(planType: string | null, feature: FeatureKey): boolean {
  return getPlanLimits(planType).features[feature];
}

export function isVIPPlan(planType: string | null): boolean {
  return planType === 'vip';
}

export function isFoundingPlan(planType: string | null): boolean {
  return planType === 'founding_pro';
}

export function isPaidPlan(planType: string | null): boolean {
  return planType !== 'vip' && planType !== 'founding_pro' && planType !== null;
}
