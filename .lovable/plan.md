

# Fix Card Club Copy + Update Stripe Product Description

## Problem
The Cards tab and the Stripe product both say cards are "shipped to you every month," implying automatic fulfillment. Cards must be manually requested.

## Changes

### 1. Fix UI copy in `CardsTab.tsx`
**Line 263** — Card Club promo description:
- From: *"Get 3 NFC cards shipped to you every month for just $5/mo. Shipping included!"*
- To: *"Request up to 3 NFC cards per month for just $5/mo. Free shipping included!"*

**Lines 220-222** — Active member description:
- From: *"You have X cards remaining this month"*
- To: *"You can request X more card(s) this month"* (minor wording tweak for consistency)

### 2. Update Stripe product description via API
Run a one-off script using `STRIPE_SECRET_KEY` to update the Card Club product description. I'll look up the product ID from price `price_1TMM0LDg8DaTuVNZUgZ4GtWJ`, then call `stripe.products.update()` with:
- Description: *"Includes a quota of up to 3 NFC cards per month. Request cards anytime from your TapAway dashboard. Free shipping included."*

No new edge function needed — just a temporary exec script.

## Files Changed
- `src/components/personal/CardsTab.tsx` — update 2 copy strings

