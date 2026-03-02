export const PERSONAL_PLANS = {
  free: {
    name: 'Free',
    maxLinks: 10,
    price: '$0',
    priceSubtext: 'forever',
    features: {
      customHeader: false,
      photoCollage: false,
      emailCapture: true,
      advancedAnalytics: false,
      socialIconBar: true,
      youtube: true,
      image: true,
      text: true,
      button: true,
    },
  },
  paid: {
    name: 'Pro',
    maxLinks: -1, // unlimited
    price: '$10',
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
export type FeatureKey = keyof typeof PERSONAL_PLANS.free.features;

export function getPlanLimits(planType: string | null) {
  if (planType === 'free') return PERSONAL_PLANS.free;
  if (planType === 'vip') return PERSONAL_PLANS.vip;
  return PERSONAL_PLANS.paid;
}

export function isFeatureAvailable(planType: string | null, feature: FeatureKey): boolean {
  return getPlanLimits(planType).features[feature];
}

export function isVIPPlan(planType: string | null): boolean {
  return planType === 'vip';
}

export function isPaidPlan(planType: string | null): boolean {
  return planType !== 'free' && planType !== 'vip' && planType !== null;
}

// Feature display info for pricing page
export const FEATURE_LIST = [
  { key: 'links', freeValue: '10 links', proValue: 'Unlimited links', included: { free: true, pro: true } },
  { key: 'socialIconBar', label: 'Social icon bar', included: { free: true, pro: true } },
  { key: 'youtube', label: 'YouTube embeds', included: { free: true, pro: true } },
  { key: 'image', label: 'Image blocks', included: { free: true, pro: true } },
  { key: 'text', label: 'Text blocks', included: { free: true, pro: true } },
  { key: 'button', label: 'Button blocks', included: { free: true, pro: true } },
  { key: 'emailCapture', label: 'Email capture block', included: { free: true, pro: true } },
  
  { key: 'customHeader', label: 'Custom header image', included: { free: false, pro: true } },
  { key: 'photoCollage', label: 'Photo collage block', included: { free: false, pro: true } },
  { key: 'advancedAnalytics', label: 'Advanced analytics', included: { free: false, pro: true } },
] as const;
