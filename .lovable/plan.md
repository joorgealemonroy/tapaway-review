

# Link Reborn Wraps + Remove $10 Pricing & Free/Founding Tier

## Part 1: Database Update

Rename the restaurant (id: `ccea844b-...`) from "My Restaurant" to "Reborn Wraps". The Stripe customer `cus_UD6fiXdZsHQfGB` is already linked — no change needed there.

**Tool**: Use the insert tool to run:
```sql
UPDATE restaurants SET restaurant_name = 'Reborn Wraps' WHERE id = 'ccea844b-b2a9-485d-9197-f93a08a0a80f';
```

## Part 2: Update Pricing from $10 → $15 Everywhere

### `src/lib/personalConfig.ts`
- `monthly: 10` → `monthly: 15`

### `src/lib/personalPlanLimits.ts`
- `paid.price: '$10'` → `'$15'`
- Remove the entire `founding_pro` plan object
- Update `isFoundingPlan` to return `false` always (or remove)
- Update `isPaidPlan` to remove `founding_pro` exclusion

### `src/components/personal/PersonalBillingTab.tsx`
- Line 87: `$10/month` → `$15/month`
- Line 184: `$10/month` → `$15/month`
- Remove all `isFounding` logic and "Founding Creator" badge/text
- Remove "Free" plan feature column (or relabel)

### `src/components/personal/ProUpgradeDialog.tsx`
- Remove "Try Pro free for 7 days" text, replace with "$15/month" messaging

## Part 3: Remove Founding Creator Program UI

### `src/components/landing/personal/FoundingBanner.tsx`
- Delete file (or empty it to return `null`)

### `src/components/landing/personal/FoundingCounter.tsx`
- Delete file (or empty it to return `null`)

### `src/pages/Personal.tsx`
- Remove `FoundingBanner` and `FoundingCounter` imports and renders

### `src/pages/personal/PersonalPricing.tsx`
- Remove founding spots badge and `get_founding_count` RPC call
- Remove "No credit card" / "Free to start" text
- Update to show $15/month pricing

### `src/components/personal/signup/CheckoutStep.tsx`
- Remove `founding_pro` plan type handling
- Remove `isFoundingPromo` state and founding spots logic
- Remove "free" plan option throughout

### `src/components/personal/signup/LinksStep.tsx`
- Remove "Try Pro Free for 7 Days" text

### `src/components/personal/signup/IdentityStep.tsx`
- Remove founding_pro from plan type union
- Remove "free trial" toast text

### `src/hooks/usePersonalOnboarding.ts`
- Remove `founding_pro` from plan type union

### `src/components/personal/AdvancedAnalyticsTab.tsx`
- Remove `founding_pro` from pro access check

### `src/pages/personal/PersonalSignup.tsx`
- Remove `founding_pro` from plan type unions

### `supabase/functions/create-personal-upgrade/index.ts`
- Update price IDs if needed (currently $9/month and $99/year — may need new $15/month Stripe price)

## Files Summary

| File | Change |
|------|--------|
| DB: restaurants table | Rename to "Reborn Wraps" |
| `src/lib/personalConfig.ts` | monthly: 10 → 15 |
| `src/lib/personalPlanLimits.ts` | $10 → $15, remove founding_pro |
| `src/components/personal/PersonalBillingTab.tsx` | $10 → $15, remove founding references |
| `src/components/personal/ProUpgradeDialog.tsx` | Remove free trial language |
| `src/components/landing/personal/FoundingBanner.tsx` | Delete |
| `src/components/landing/personal/FoundingCounter.tsx` | Delete |
| `src/pages/Personal.tsx` | Remove founding imports/renders |
| `src/pages/personal/PersonalPricing.tsx` | Remove founding, update pricing |
| `src/components/personal/signup/CheckoutStep.tsx` | Remove founding_pro + free plan |
| `src/components/personal/signup/LinksStep.tsx` | Remove free trial text |
| `src/components/personal/signup/IdentityStep.tsx` | Remove founding_pro |
| `src/hooks/usePersonalOnboarding.ts` | Remove founding_pro type |
| `src/components/personal/AdvancedAnalyticsTab.tsx` | Remove founding_pro check |
| `src/pages/personal/PersonalSignup.tsx` | Remove founding_pro type |
| `supabase/functions/create-personal-upgrade/index.ts` | May need new $15 Stripe price ID |

