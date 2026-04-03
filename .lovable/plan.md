

# Add Google Review Link & Remove OnlyFans from Platform Links

## What changes

### 1. Add "Google Review" as a new platform link type
Add a new platform config entry in `src/lib/platformLinks.tsx` that lets Small Business users add their Google Review link to their profile. Users will paste either a Google Place ID (e.g. `ChIJ...`) or a full review URL (`https://search.google.com/local/writereview?placeid=...`). The system will normalize the input using the existing `normalizeGooglePlaceId` and `buildGoogleReviewUrl` helpers from `src/lib/google.ts`.

- **New icon**: Add a Google "G" SVG icon component in `platformLinks.tsx`
- **New platform config**: type `"google_review"`, label `"Google Review"`, inputType `"url"`, placeholder showing both formats accepted
- **`generateUrl`**: Uses `normalizeGooglePlaceId` + `buildGoogleReviewUrl` to always produce the canonical review URL
- **`extractValue`**: Stores the raw Place ID
- **Position**: Place it near the top of `PLATFORM_CONFIGS` (after the main social platforms, before payment links) since it's a key business feature
- **Add to `PLATFORM_COLORS`**: Add `google_review: "#4285F4"`
- **Add to `detectPlatformFromUrl`**: Detect `search.google.com/local/writereview`

### 2. Remove OnlyFans
- Remove the `OnlyFansIcon` SVG component from `platformLinks.tsx`
- Remove the `onlyfans` entry from `PLATFORM_CONFIGS`
- Remove `onlyfans` from `PLATFORM_COLORS`
- Remove the `onlyfans` detection line from `detectPlatformFromUrl`

## Files modified
1. `src/lib/platformLinks.tsx` — Add Google Review platform config + icon, remove OnlyFans icon + config + color + detection

