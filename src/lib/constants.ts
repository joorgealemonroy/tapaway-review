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
