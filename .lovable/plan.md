

# Replace CardFront with User-Provided Pixel-Perfect Code

## Summary
Replace the `CardFront` component in `src/components/onboarding/CardCustomizer.tsx` (lines 12–75) with the user's exact code. The new version uses custom SVG stars, a larger logo anchor (200×200), custom NFC/QR SVG icons, and refined typography. No changes to classes, font sizes, or SVGs — pasted verbatim.

## Changes to `src/components/onboarding/CardCustomizer.tsx`

### Replace `CardFront` (lines 12–75)
- Remove the Lucide `Star`, `Smartphone`, `Wifi` imports (no longer used by CardFront; `QrCode` still used by CardBack so keep it)
- Replace the entire `CardFront` function with the user's provided code, adapted to TypeScript types
- Keep `CardBack` and `CardCustomizer` unchanged

### Import cleanup
- Remove `Star`, `Smartphone`, `Wifi` from the Lucide import (only `QrCode` remains for CardBack)

## File modified
1. `src/components/onboarding/CardCustomizer.tsx`

