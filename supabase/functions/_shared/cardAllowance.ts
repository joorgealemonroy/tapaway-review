/**
 * Monthly NFC card allowance by plan — server-side source of truth.
 * Mirrors src/lib/cardAllowance.ts. Never trust a client-supplied limit.
 *
 *   Venue-family plans → 15 cards per month
 *   Everything else (Solo) → 4 cards per month
 */

export const VENUE_MONTHLY_CARDS = 15;
export const SOLO_MONTHLY_CARDS = 4;

export const VENUE_PLANS = new Set<string>([
  "venue",
  "venue_pack",
  "venue_yearly",
  "bundle",
  "yearly_200",
  "multi",
]);

export function isVenuePlan(planType: string | null | undefined): boolean {
  return !!planType && VENUE_PLANS.has(planType);
}

export function cardAllowanceForPlan(planType: string | null | undefined): number {
  return isVenuePlan(planType) ? VENUE_MONTHLY_CARDS : SOLO_MONTHLY_CARDS;
}

export function cardPlanLabel(planType: string | null | undefined): string {
  return isVenuePlan(planType) ? "TapAway Pro" : "TapAway Solo";
}

export function canRequestCards(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}
