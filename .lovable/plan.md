

# Fix Hero Section Mobile Layout

## Problem
On mobile, the hero text is center-aligned. The user wants it left-aligned with large, bold text matching the uploaded screenshot.

## Changes

### `src/components/landing/HeroSection.tsx`
1. Change `text-center lg:text-left` → `text-left` on the copy container (line 39)
2. Change `justify-center lg:justify-start` → `justify-start` on the CTA row (line 70)
3. Change `mx-auto lg:mx-0` → remove `mx-auto` on the subheadline max-width constraint (line 63)
4. Bump mobile font size from `text-3xl` to `text-4xl` for a bolder feel matching the screenshot (line 57)
5. Hide the 3D card + city ticker on mobile (`hidden lg:block` on the right column) to keep the layout clean like the screenshot

| Line | Change |
|------|--------|
| 39 | `text-left` instead of `text-center lg:text-left` |
| 57 | `text-4xl sm:text-5xl` instead of `text-3xl sm:text-4xl` |
| 63 | Remove `mx-auto` |
| 70 | `justify-start` instead of `justify-center lg:justify-start` |
| 98 | Add `hidden lg:block` to right column |

