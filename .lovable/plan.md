

# Update Las Islas Marias OG to Trial Status

## What
Change the restaurant's billing status from "active" (with no plan type) to a trial state so the Billing tab reflects they're on a trial before moving to paid.

## Database Change
Update the `restaurants` table for id `1d83b669-e326-4231-a8d1-686630915073`:
- Set `subscription_status` to `'trialing'`
- Set `plan_type` to `'monthly'` (the plan they'll transition to)

## UI Change — BillingTab.tsx
The BillingTab currently doesn't handle the `trialing` status. Add trial-specific display:
- Show "Free Trial" as the plan title with a clock icon
- Show a blue "Trial" badge instead of "Active"
- Add a message: "Your trial is active — you'll be moved to a paid plan soon."
- Keep the "Manage Subscription" button and help text

## Files
| File | Change |
|------|--------|
| Database migration | Update subscription_status to `trialing`, plan_type to `monthly` |
| `src/components/dashboard/BillingTab.tsx` | Add trialing state UI with appropriate messaging |
| `src/lib/subscriptionStatus.ts` | Verify `trialing` is in the allowed statuses list |

