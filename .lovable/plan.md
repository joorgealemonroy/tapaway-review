# Update TapAway Pricing Constants

## Goal
Update the single source of truth for customer-facing pricing in `src/lib/constants.ts` to the new structure.

## Changes

Update the `PRICING` object in `src/lib/constants.ts`:

- **Base Software**: `$15/mo` → `$20/mo`
- **Card Club add-on**: stays `$5/mo`
- **Base + Card Club bundle**: `$20/mo` → `$25/mo`
- **Annual Value Pass**: `$180/yr` → `$199/yr` (Card Club included)

Keep all existing exports, types, and comments intact; only change the numeric `amount` and `display` fields plus the top-of-file comment that summarizes the pricing.

## Follow-up (out of scope unless requested)
A separate grep sweep will be needed to update any hardcoded `$15`, `$20`, `$180`, etc. strings in components and marketing pages so they stay in sync with the new constants.
