## Plan: Direct Google Review Popup URL in Rep Demo Creation

### What we’re changing
In `src/pages/rep/RepDemoCreate.tsx`, when a sales rep creates a demo hub from a Google Places result, the auto-generated “Leave us a 5-Star Review” link currently uses `place.googleMapsUri`. We’ll switch it to the direct review popup URL.

### Implementation
1. Import `buildGoogleReviewUrl` from `src/lib/google.ts` into `RepDemoCreate.tsx`.
2. In the link-seeding block for `link_type: 'google_review'`, set the URL to:
   - `buildGoogleReviewUrl(place.placeId)` when `place.placeId` exists.
   - `place.googleMapsUri` as a fallback if `placeId` is missing.
3. Keep the existing `link_type`, label, sort order, and active flag unchanged.

### Files to edit
- `src/pages/rep/RepDemoCreate.tsx`

### Verification
- Type-check the project to ensure the import and usage are valid.
- Confirm the generated URL matches `https://search.google.com/local/writereview?placeid=<placeId>`.

No database or edge-function changes are required; `placeId` is already returned by `GooglePlacesAutocomplete` and passed into `handlePlaceSelected`.