

# Add Directions (Apple Maps) to Business Lite

## Summary
Add a `directions` link type using Apple Maps with `?daddr=` routing parameter. It appears as a white pill on profiles, matching the Google Review styling.

## Changes

### 1. `src/lib/platformLinks.tsx`
- Import `MapPin` from lucide-react
- Add `"directions": "#34A853"` to `PLATFORM_COLORS`
- Add new `directions` entry to `PLATFORM_CONFIGS` after `google_review`:
  - `type: "directions"`, `label: "Directions"`, `icon: MapPin`, `inputType: "url"`
  - `placeholder: "Full address or Apple Maps URL"`
  - `generateUrl`: if starts with `http`, use as-is; otherwise encode into `https://maps.apple.com/?daddr=ENCODED`
  - `extractValue`: pull value from `daddr` param via `new URL(url).searchParams.get("daddr")`, fallback to raw URL
  - `bgColor: "bg-[#34A853]"`
- Add `maps.apple.com` detection to `detectPlatformFromUrl`

### 2. `src/lib/urlValidation.ts`
- Update `directions` regex to: `^https:\/\/maps\.(apple|google)\.com\/?\?` — this allows both `?daddr=` and other query patterns

### 3. `src/components/personal/ProfilePreviewRenderer.tsx`
- Extend the existing `google_review` white-pill default to also apply to `directions` links (change condition from `link.link_type === 'google_review'` to `(link.link_type === 'google_review' || link.link_type === 'directions')`)

### 4. `src/pages/personal/PersonalProfilePage.tsx`
- In the `ProfileLink` component, add a special case: when `link.link_type === 'directions'` and no `pill_color`, default `customColor` to `'#ffffff'` (white pill with dark text), same treatment as `google_review`

### 5. `supabase/functions/create-rep-onboarding/index.ts`
- Add `googlePlaceAddress` to the `createSoloProfile` opts interface
- Pass it through from the request body (already available at line 285)
- After creating the Google Review link, if `googlePlaceAddress` is provided, insert a `directions` link:
  - `link_type: "directions"`, `label: "Directions"`
  - `url: "https://maps.apple.com/?daddr=" + encodeURIComponent(googlePlaceAddress)`
  - `pill_color: "#ffffff"`, `is_featured: true`, `sort_order: 1`

### 6. Database — Sugar Bloom data fix
- Insert a `directions` link for profile `cc06cb55-87ab-4dc7-88f7-073d3bb38d27` with Apple Maps URL using `?daddr=` format and Sugar Bloom's address

## Files Modified

| File | Change |
|------|--------|
| `src/lib/platformLinks.tsx` | Add `directions` platform config, color, detection |
| `src/lib/urlValidation.ts` | Allow `maps.apple.com/?daddr=` |
| `src/components/personal/ProfilePreviewRenderer.tsx` | White-pill default for `directions` |
| `src/pages/personal/PersonalProfilePage.tsx` | White-pill default for `directions` |
| `supabase/functions/create-rep-onboarding/index.ts` | Auto-create directions link for solo plans |
| Database | Insert Sugar Bloom directions link |

