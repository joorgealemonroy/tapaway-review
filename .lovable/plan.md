

# Fix Directions Pill Styling to Match Restaurant Hub

## Problem
The directions pill on Business Lite profiles renders as a white featured card (large, with "Tap to open" subtitle), which looks ugly. The user wants it to match the restaurant hub style: a solid colored, full-width button with centered icon and text.

## Solution
Change the directions link from `is_featured: true` with `pill_color: '#ffffff'` to a regular (non-featured) link with a blue background (`#2563eb`) matching the restaurant hub. This means:

### 1. Database — Fix Sugar Bloom's directions link
Update the existing directions link for Sugar Bloom to:
- `pill_color: '#2563eb'` (blue, matching restaurant hub)
- `is_featured: false` (render as regular pill, not the oversized featured card)

### 2. `supabase/functions/create-rep-onboarding/index.ts`
Change the auto-created directions link defaults:
- `pill_color: '#2563eb'` instead of `'#ffffff'`
- `is_featured: false` instead of `true`
- `sort_order: 2` (below the Google Review featured link)

### 3. `src/components/personal/ProfilePreviewRenderer.tsx`
Remove `directions` from the white-pill special case (revert to just `google_review` check). Directions links will now use their `pill_color` like any other regular link.

### 4. `src/pages/personal/PersonalProfilePage.tsx`
Same — remove `directions` from the `defaultWhitePill` condition. The blue `pill_color` will flow through the normal styling path.

### 5. `src/lib/platformLinks.tsx`
Update the `directions` config `bgColor` from `"bg-[#34A853]"` (green) to `"bg-[#2563eb]"` (blue) and `PLATFORM_COLORS.directions` to `"#2563eb"` so the fallback platform color matches the restaurant hub.

## Result
Directions renders as a solid blue pill with white MapPin icon and white text — matching the restaurant hub's "Get Directions" button style.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/platformLinks.tsx` | Change directions color to `#2563eb` |
| `src/components/personal/ProfilePreviewRenderer.tsx` | Remove `directions` from white-pill special case |
| `src/pages/personal/PersonalProfilePage.tsx` | Remove `directions` from white-pill special case |
| `supabase/functions/create-rep-onboarding/index.ts` | `pill_color: '#2563eb'`, `is_featured: false` |
| Database | Update Sugar Bloom directions link |

