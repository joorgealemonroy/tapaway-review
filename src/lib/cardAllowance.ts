/**
 * Monthly NFC card allowance by plan.
 *
 * Policy (single source of truth for the client):
 *   Venue-family plans → 15 cards per month
 *   Everything else (Solo) → 4 cards per month
 *
 * Card requests also require an active or trialing subscription.
 */

export const VENUE_MONTHLY_CARDS = 15;
export const SOLO_MONTHLY_CARDS = 4;

/** Plan identifiers that count as the Venue tier. */
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

/** Cards this plan may request per calendar month. */
export function cardAllowanceForPlan(planType: string | null | undefined): number {
  return isVenuePlan(planType) ? VENUE_MONTHLY_CARDS : SOLO_MONTHLY_CARDS;
}

/** Customer-facing plan name. */
export function cardPlanLabel(planType: string | null | undefined): string {
  return isVenuePlan(planType) ? "TapAway Pro" : "TapAway Solo";
}

/** Statuses that may request cards. */
export function canRequestCards(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

/** Friendly label for a subscription status. */
export function subscriptionLabel(status: string | null | undefined): string {
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Trial";
    case "past_due":
      return "Payment due";
    case "canceled":
      return "Canceled";
    case "paused":
      return "Paused";
    default:
      return "Inactive";
  }
}
