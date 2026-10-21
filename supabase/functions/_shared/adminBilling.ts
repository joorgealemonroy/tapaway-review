/** An explicit run-rate estimate; never count trials as earned revenue. */
export function subscriptionRunRate(sub: any): {
  cents: number;
  excluded: boolean;
} {
  if (
    sub.livemode !== true ||
    !["active", "past_due"].includes(sub.status) ||
    sub.pause_collection
  )
    return { cents: 0, excluded: false };
  // Discounted, tiered or usage-based contracts need their own invoice-level calculation.
  // Exclude visibly instead of showing an inflated estimate.
  if (sub.discount || sub.discounts?.length || sub.items?.has_more)
    return { cents: 0, excluded: true };
  let total = 0;
  for (const item of sub.items?.data || []) {
    const p = item.price,
      r = p?.recurring;
    if (!r) continue;
    if (
      p.currency !== "usd" ||
      p.billing_scheme === "tiered" ||
      r.usage_type === "metered" ||
      item.discounts?.length ||
      p.unit_amount == null
    )
      return { cents: 0, excluded: true };
    const count = r.interval_count || 1,
      amount = p.unit_amount * (item.quantity ?? 1);
    if (r.interval === "month") total += amount / count;
    else if (r.interval === "year") total += amount / (12 * count);
    else if (r.interval === "week")
      total += (amount * 365.25) / (12 * 7 * count);
    else if (r.interval === "day") total += (amount * 365.25) / (12 * count);
    else return { cents: 0, excluded: true };
  }
  return { cents: total, excluded: false };
}
