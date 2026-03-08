

# Restore Composed Shop Layout + Mobile-First Fixes for Both Sections

## 1. PersonalShopShowcase.tsx — Restore composed/stacked look, higher quality

The user preferred the original composed layout where all three cards overlap with rotations (the "cool stacked look") rather than the separated mobile layout. We'll bring back a single composed layout that works on both mobile and desktop.

**Changes:**
- **Remove the dual layout** (separate mobile/desktop blocks) — use ONE layout for all screens
- Cards overlap with absolute positioning and slight rotations on all sizes, but scaled down on mobile
- Use a wrapper with `scale-[0.85] md:scale-100` so the composed layout fits mobile without clipping
- Increase visual polish: add subtle `backdrop-blur`, glow effects on the revenue card, and refined shadows
- Keep the updated content (Masterclass, $4,280)

## 2. PersonalFeatures.tsx — Mobile-first improvements

Current issues on mobile:
- The side-by-side layout (`flex-col` then `md:flex-row`) works but visuals appear after text on every item — on mobile the visual should come FIRST (above text) since it's more engaging
- Heading is `text-3xl` which is slightly large for small phones
- Spacing could be tighter on mobile

**Changes:**
- Reorder: on mobile, show visual FIRST, then text below. On desktop keep alternating left/right
- Change feature items to `flex-col-reverse md:flex-row` (visual on top on mobile)
- Reduce heading to `text-2xl md:text-4xl`
- Reduce section padding: `py-12 md:py-20`
- Reduce spacing between items: `space-y-10 md:space-y-16`
- Reduce `mb-14` header margin to `mb-10 md:mb-14`

## Files changed
- `src/components/landing/personal/PersonalShopShowcase.tsx` — single composed layout with scale transform for mobile
- `src/components/landing/personal/PersonalFeatures.tsx` — mobile-first reorder and spacing

