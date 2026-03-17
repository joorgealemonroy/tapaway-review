

# Fix Invisible Links & Add Color Fallbacks

Three changes in `src/pages/personal/PersonalProfilePage.tsx`:

## 1. Safe text color fallback for legacy profiles (line ~1079-1085)

Currently `profileTextColor` can be `null`, falling back to `isDarkBg` logic which works — but when `isDarkBg` misdetects (gradient edge cases), text vanishes. Add a guaranteed fallback:

```ts
const safeTextColor = profileTextColor || (isDarkBg ? '#FFFFFF' : '#1A1A1A');
```

Apply `safeTextColor` to `headingStyle`, `textStyle`, and pass it through to blocks/links so nothing is ever unstyled.

## 2. Button visibility guarantee in `ProfileLink` (lines ~219-276)

Add `border border-black/10 shadow-sm` to both featured and regular link containers so buttons are always distinguishable from background, even when `customColor` matches `bgColor`.

- Featured links (line ~219): add `border border-black/10 shadow-sm` to the className
- Regular links (line ~253): add `border border-black/10 shadow-sm` when `customColor` is set

## 3. Dynamic button text contrast in `ProfileLink`

Currently all custom-colored buttons hardcode `text-white` for labels and icons. Add a contrast check using the existing `isColorDark()` helper:

```ts
const buttonTextColor = customColor && !isColorDark(customColor) ? '#1A1A1A' : '#FFFFFF';
```

Replace all `customColor ? "text-white"` references (lines ~230, 233, 236, 240, 268, 271, 274) with inline `style={{ color: buttonTextColor }}` so both text and icons adapt to light/dark button backgrounds.

## Files Modified
- `src/pages/personal/PersonalProfilePage.tsx` — all changes in one file

