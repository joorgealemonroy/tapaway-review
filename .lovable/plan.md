

# Fix Colored Logos & Apply Bloom Theme to @justelaysia

## Problem Diagnosis

Two issues found after inspecting the profile data and code:

1. **Bug: "glass" button_theme breaks link rendering** — The `ProfileLink` component uses `button_theme` as `accentColor`. For this profile, `button_theme` is `"glass"` (not a hex color), which gets used as `backgroundColor: "glass"` — invalid CSS. This makes buttons invisible (no background) and strips platform brand colors from icons.

2. **Theme mismatch** — The profile has a plain white background (`#ffffff`) instead of the Bloom vibe aesthetic.

## Plan

### 1. Code Fix: Validate `customColor` in ProfileLink (~line 117)

Add a hex-color check so non-color values like `"glass"` fall through to platform defaults:

```ts
// Only use accentColor if it's a valid hex color
const isValidHex = (c: string | null | undefined) => c ? /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(c) : false;
const validAccent = isValidHex(accentColor) ? accentColor : null;
const customColor = (link.pill_color && link.pill_color !== "#000000") 
  ? link.pill_color 
  : (validAccent || null);
```

This ensures that when there's no valid custom color, links fall back to their platform brand colors (Instagram gradient, CashApp green, PayPal blue, etc.) with white icon text — the "colored logos" the user wants.

### 2. Database Update: Apply Bloom vibe to @justelaysia's profile

Update the profile with Bloom theme values from `vibeTemplates.ts`:

- `background_color` → `#FFF9F8`
- `header_color` → `#FDE2E4`
- `bg_style` → `linear-gradient(180deg, #FDE2E4 0%, #FFF9F8 30%)`
- `text_color` → `#5C3D4E` (Bloom text color)
- `button_theme` → `#FF8FAB` (Bloom accent, now a valid hex)

### Files Modified
- `src/pages/personal/PersonalProfilePage.tsx` — hex validation for `customColor` (~3 lines changed)
- Database migration — UPDATE `personal_profiles` for username `justelaysia`

