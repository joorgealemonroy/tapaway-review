// Generated from shared/storefrontOffers.ts; edit the source and run npm run sync:public-knowledge.
/** Owner-approved seasonal offer. Never reset the deadline per visitor. */
export const HALLOWEEN_START = Date.parse("2026-10-01T00:00:00-07:00");
export const HALLOWEEN_END = Date.parse("2026-11-01T00:00:00-07:00");
export function seasonalOfferFacts(now = Date.now()) {
  return now >= HALLOWEEN_START && now < HALLOWEEN_END
    ? "Halloween sale: two custom personal NFC + QR cards for $39 once, with free standard US shipping. Ends October 31, 2026 at 11:59 PM Pacific time. Optional hub hosting is $5/month. There is no claimed original price or percentage discount."
    : "No current seasonal promotion is verified. Personal cards remain $39 once for two with free standard US shipping; optional hub hosting is $5/month. Do not claim the Halloween sale is active.";
}
