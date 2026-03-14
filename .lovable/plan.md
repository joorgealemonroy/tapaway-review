

# Add Seller Fee & Pricing Section to Shop Tab

## Overview

Add three features to the PersonalShopTab: a $5 minimum price enforcement with tooltip, an "Earnings Breakdown" info section, and a Seller FAQ accordion. The tone throughout emphasizes TapAway's 0% commission as a positive, and frames the $5 minimum as helping sellers keep more — never discouraging.

## Changes — `src/components/personal/PersonalShopTab.tsx`

### 1. Enforce $5 Minimum on Price Input

- Change the `min` attribute from `"0.50"` to `"5.00"` on the price input (line 746)
- Add validation in `handleSaveProduct` to reject prices below $5.00
- Add an info tooltip next to the Price label: "Why $5 minimum? So you keep a bigger share after standard card processing fees."

### 2. Dynamic Earnings Preview

Below the price input, show a dynamic calculation when a price is entered:

```
At $X.XX, you keep ~$Y.YY (ZZ% of the sale)
```

Formula: `kept = price - (price * 0.029 + 0.30)`, percentage = `kept / price * 100`

Only shows when price >= $5. Uses a green/positive color to feel encouraging.

### 3. "Your Earnings Breakdown" Card

Add a new `Card` component between the shop toggle and the sales summary (after line 626). Contains:

- **Title**: "Your Earnings Breakdown"
- **Three line items**:
  - TapAway Commission: **0% — Always free to sell** (green checkmark)
  - Card Processing: ~2.9% + $0.30 (muted, labeled "Industry standard · Stripe")
  - You Keep: ~91–97% depending on price
- **Earnings table** showing examples: $5 → $4.55 (~91%), $15 → $14.27 (~95%), $50 → $48.25 (~96.5%)
- Wrapped in a `Collapsible` so it's not overwhelming — collapsed by default with a "See earnings breakdown" trigger

### 4. Seller FAQ Accordion

Add a collapsible "Seller FAQ" section after the earnings breakdown. Three Q&As:

1. **"How do payouts work?"** — Explains 0% commission, Stripe handles processing, money goes direct to seller.
2. **"Why is there a $5 minimum?"** — Explains the fixed $0.30 fee math: on $1 it's 30%, on $10 it's 3%. Frames the minimum as protecting seller profits.
3. **"What about Tap to Pay fees?"** — Brief mention that Stripe charges an additional ~$0.10 terminal fee for in-person tap payments, separate from online sales.

### Tone

- Lead with "0% commission" — TapAway takes nothing
- Frame the $5 minimum as pro-seller, not restrictive
- Processing fees are "industry standard" — not TapAway's fault
- Dynamic earnings text uses encouraging language ("you keep")

## Files Modified

- `src/components/personal/PersonalShopTab.tsx` — all changes in this single file (imports for Tooltip, Accordion; new sub-components; price validation update)

