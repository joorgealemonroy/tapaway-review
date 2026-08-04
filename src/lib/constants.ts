// Stripe Configuration - SINGLE SOURCE OF TRUTH
// IMPORTANT: This price ID includes 30-day free trial with card required, $0 due today
export const TRIAL_PRICE_ID = "price_1Sl3aCDg8DaTuVNZtL0SAQrl";

// Stripe Payment Link for trial signups (uses TRIAL_PRICE_ID)
// IMPORTANT: All CTAs must use this URL
export const TRIAL_URL = "https://buy.stripe.com/3cIdR98y34vp31v0wagYU0b";

// Card Club Add-on ($5/mo recurring — 3 cards/month, shipping included)
export const CARD_ADDON_PRICE_ID = "price_1TMM0LDg8DaTuVNZUgZ4GtWJ";

// One-Time Card Order ($10 — 3 NFC cards)
export const CARD_ONETIME_PRICE_ID = "price_1TMM0LDg8DaTuVNZZ2EfLZrk";

// ---------------------------------------------------------------------------
// UNIVERSAL PRICING — single source of truth for every customer-facing price.
// Base software $15/mo · Card Club add-on +$5/mo ($20/mo total) · $180/yr annual.
// ---------------------------------------------------------------------------
export const PRICING = {
  base: {
    id: "base" as const,
    label: "Base Software",
    amount: 15,
    display: "$15",
    interval: "/month",
    blurb: "Full interactive hub, dashboard, analytics & SMS engine.",
  },
  cardClub: {
    id: "card_club" as const,
    label: "Card Club",
    amount: 5,
    display: "$5",
    interval: "/month",
    blurb: "Hardware replacements, physical refresh passes, priority stand support.",
  },
  bundle: {
    id: "bundle" as const,
    label: "Base + Card Club",
    amount: 20,
    display: "$20",
    interval: "/month",
    blurb: "Everything in Base plus ongoing card replacements.",
  },
  annual: {
    id: "annual" as const,
    label: "Annual Value Pass",
    amount: 180,
    display: "$180",
    interval: "/year",
    blurb: "Save 25% and Card Club membership is included free.",
  },
} as const;

export type PricingPlanId = (typeof PRICING)[keyof typeof PRICING]["id"];
