

# Fix: Unreadable Text on Light Backgrounds (Gradients + Solid Colors)

## Root Cause

Line 859 of `PersonalProfilePage.tsx`:
```
const isDarkBg = hasBanner || isGradientBg || isColorDark(bgColor);
```

All gradients are treated as dark (`isGradientBg` = always dark text = white). Light gradients like "Warm" (`#fdfcfb → #e2d1c3`) or "Sky" (`#e0eafc → #cfdef3`) get white text on a near-white background, making everything unreadable.

The same `getBaseColorFromGradient` helper already extracts a color from gradients but is only used for the fade — never for the darkness check.

## Fix

**File**: `src/pages/personal/PersonalProfilePage.tsx`

1. Change the `isDarkBg` calculation to also check gradient luminance instead of assuming all gradients are dark:
   - Extract the dominant (last) color from the gradient using the existing `getBaseColorFromGradient` helper
   - Run `isColorDark()` on that extracted color
   - Replace `isGradientBg` in the condition with `(isGradientBg && isColorDark(getBaseColorFromGradient(bgColor)))`

2. Apply the same fix to the `docBgColor` early-return block (lines 710-717) — this affects the document background color set via `useAppBackground`, ensuring the browser chrome also matches.

3. In the `ProfilePreviewRenderer.tsx` (dashboard preview), apply the same logic so the preview matches the live profile.

**Result**: Light gradients get dark text, dark gradients keep white text, solid colors work as before.

### Files to modify (2):
- `src/pages/personal/PersonalProfilePage.tsx` — fix `isDarkBg` gradient check
- `src/components/personal/ProfilePreviewRenderer.tsx` — same fix for dashboard preview consistency

