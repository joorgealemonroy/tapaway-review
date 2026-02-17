

# Update Pro Pricing Display

## File: `src/pages/personal/PersonalPricing.tsx`

Change the yearly price presentation from "$75/year" to "$6.25/month" with a subtle "Billed annually $75" note underneath -- this anchors on the lower monthly equivalent, which feels more affordable.

### Changes

1. **Price display for yearly**: Change `$75` / `/year` to `$6.25` / `/month`
2. **Replace the "That's only $6.25/mo" line** with `Billed annually $75` in the same `text-xs text-primary` style
3. Monthly price stays as-is (`$10/month`)

