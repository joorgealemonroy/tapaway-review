
# Remove NFC Card from Pro Plan Features

## Why

The NFC card is now sold separately in the Shop tab ($10/$25 one-time purchase). It should not appear as a feature included with the Pro subscription plan.

## Changes

### 1. Remove `nfcCard` from plan feature flags (`src/lib/personalPlanLimits.ts`)

Remove the `nfcCard: false/true` line from all three plan objects (free, paid, vip). This flag is never checked anywhere in the UI — no `isFeatureAvailable("nfcCard")` calls exist — so removing it is safe and has no side effects.

### 2. No other files need changes

- `PersonalPricing.tsx` — does not list NFC card as a Pro feature (already clean)
- `PersonalBillingTab.tsx` — does not mention NFC card (already clean)
- `PersonalShopTab.tsx` — correctly treats NFC cards as a separate product (no changes needed)
- `FEATURE_LIST` in `personalPlanLimits.ts` — does not include an NFC card entry (already clean)

This is a minimal, safe cleanup — just removing dead config data.
