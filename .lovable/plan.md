

# Dynamic Stripe Pricing for Solo Pro vs Venue Pack

## Summary
Update the `create-checkout-session` edge function to dynamically create Stripe products and prices based on the user's plan selection, rather than using a single hardcoded price ID. This ensures each customer is charged the correct amount with the correct trial period.

## Pricing Matrix

```text
Plan             Base    + Protection   Trial (total)
─────────────────────────────────────────────────────
Solo Pro         $15/mo   $20/mo        14 days (7 + 7 shipping)
Venue Pack       $39/mo   $44/mo        21 days (14 + 7 shipping)
```

## Changes

### 1. `supabase/functions/create-checkout-session/index.ts`
- Remove the hardcoded `TRIAL_PRICE_ID` constant and the safety check that blocks other price IDs.
- Use the Stripe API to find-or-create products and prices dynamically:
  - Search for an existing product by metadata (`plan_type=solo` or `plan_type=venue`). If not found, create it.
  - Search for a matching recurring monthly price on that product. If not found, create it.
- Build `line_items` array:
  - Always include the base plan price (Solo $15 or Venue $39).
  - If `hasProtection` is true, add a second line item for the $5/mo Loss Protection add-on (also found-or-created dynamically).
- Set `trial_period_days` correctly: 14 for solo, 21 for venue.
- Pass `plan_type`, `has_protection`, and all IDs in session metadata for downstream fulfillment.

### 2. `src/pages/Onboarding.tsx`
- Ensure the `completeSetup` function passes `planType` and `hasProtection` from state to the edge function (already does this — just verify).
- Update the success URL handling to work without a fixed `price_id` param (use plan_type from metadata instead).

### 3. No new tables or migrations needed
The `restaurants` table already has `plan_type` and `has_loss_protection` columns.

## Technical Notes
- Dynamic price creation uses `stripe.products.search` and `stripe.prices.list` to avoid creating duplicate products/prices on every checkout.
- All prices are created as `recurring: { interval: 'month' }` with `currency: 'usd'`.
- The protection add-on is a separate line item so it appears clearly on the Stripe invoice.

