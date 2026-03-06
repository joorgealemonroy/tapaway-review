

# Update Plan Features List

The "Plan Features" section in the billing tab and the checkout step have incorrect/outdated feature lists that don't match the actual plan limits defined in `personalPlanLimits.ts`. Here's what needs to change:

## Current vs Correct (from `personalPlanLimits.ts`)

| Feature | Currently Shows | Should Be |
|---------|----------------|-----------|
| Free links | Up to 5 links | Up to 10 links |
| Email capture | Pro-only | Free (included in both) |

## Files to Update

### 1. `src/components/personal/PersonalBillingTab.tsx` (lines 149-193)

Update the Free features list:
- "Up to 5 links" → "Up to 10 links"
- Add "Email capture block" to Free list

Update the Pro features list:
- Remove "Email capture block" (it's already free)
- Keep: Unlimited links, Custom header image, Photo collage block, Advanced analytics

### 2. `src/components/personal/signup/CheckoutStep.tsx`

Update `freeFeatures` array:
- "Up to 5 links" → "Up to 10 links"

### 3. `src/lib/personalPlanLimits.ts`

The `FEATURE_LIST` constant already has the correct values — no changes needed here.

