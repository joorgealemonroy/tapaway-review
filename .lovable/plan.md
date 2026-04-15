

# Premium Design Polish — Dark Base, Glass Buttons, Single-Tile Grid, Footer Fix

## Summary

Four targeted visual upgrades across the three profile rendering files: `ProHubTemplate.tsx` (onboarding preview), `PersonalProfilePage.tsx` (live public profile), and `ProfilePreviewRenderer.tsx` (dashboard preview).

## Changes

### 1. Premium Dark Base + Brand Glow (all 3 files)

Instead of using `backgroundColor` (scraped brand color) as a flat fill, force `bg-slate-950` (#020617) as the base. The brand color becomes a soft radial gradient glow behind the top profile section only.

```
background: #020617;
// Top glow overlay:
background: radial-gradient(ellipse at top center, {brandColor}30 0%, transparent 60%);
```

**Affected**: `ProHubTemplate` (line 81 bgColor), `PersonalProfilePage` (line 1162–1170 bgStyle), `ProfilePreviewRenderer` (line 109–110 backgroundColor). Only applies when background is a flat hex (not user-set gradient/custom bg_style).

### 2. Glassmorphism Standard Link Buttons (all 3 files)

Replace per-link `pill_color` solid backgrounds with a uniform frosted glass container. Keep platform icons in brand color for recognition.

- Container: `bg-white/10 backdrop-blur-md border border-white/10 rounded-xl`
- Text: `text-white`
- Icon container: platform brand color (existing `config.bgColor`)
- Google Review exception: keep white bg for contrast

**Affected files/lines**:
- `ProHubTemplate` lines 173–202 (standard links section)
- `PersonalProfilePage` ProfileLink component lines 257–287 (regular links) and 222–255 (featured links)
- `ProfilePreviewRenderer` lines 480–521 (renderLink regular pills) and 460–478 (featured)

### 3. Single-Tile Grid → Full Width (all 3 files)

When a `grid-group` contains only 1 item, render it as `col-span-2` (full width, landscape aspect) instead of a lonely half-width square.

**Affected**:
- `PersonalProfilePage` line 1446: `grid grid-cols-2` → check `item.links.length === 1`, if so render with `col-span-2` class
- `ProfilePreviewRenderer` line 892: same logic
- `ProHubTemplate` lines 101–165: already handles 1 vs 2 tiles separately — verify aspect-video is used

### 4. Footer Contrast Fix (PersonalProfilePage + ProHubTemplate)

- `PersonalProfilePage` line 1527: change opacity class to always use `text-white/60` and `border-white/20` (dark base guarantees readability)
- `ProHubTemplate` line 206: change `text-white/20` to `text-white/50`

## Files Changed

| File | Changes |
|------|---------|
| `src/components/personal/ProHubTemplate.tsx` | Dark base + brand glow, glass buttons, footer contrast |
| `src/pages/personal/PersonalProfilePage.tsx` | Dark base + brand glow, glass regular/featured links, single-tile grid fix, footer contrast |
| `src/components/personal/ProfilePreviewRenderer.tsx` | Dark base + brand glow, glass link styling, single-tile grid fix |

## Important Note

These glass/dark overrides only apply to profiles using the **default black/dark background**. Profiles with user-customized gradients or `bg_style` continue to use their custom settings unchanged — the dark base is a smarter default, not a forced override.

