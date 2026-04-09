
Summary

No — you probably do not need to enter the secret again.

What I found:
- The backend secret is already configured.
- The search request is reaching the backend correctly.
- The failure is coming from Google rejecting the specific API endpoint being used.

Diagnosis

The current `lookup-place-id` function is calling the legacy Google Places Text Search endpoint:
```text
https://maps.googleapis.com/maps/api/place/textsearch/json
```

The backend logs show:
```text
API denied: You’re calling a legacy API, which is not enabled for your project.
```

So the problem is not “missing key”.
It is:
1. the key exists
2. the function runs
3. Google rejects the legacy Places API for this project

Why the UI says “No businesses found”

Right now the function converts `REQUEST_DENIED` into:
```json
{ "error": "Google API request denied", "results": [] }
```
and the frontend mainly treats that like an empty result set, so users see “No businesses found” instead of the real setup/config error.

Plan to fix

1. Update `supabase/functions/lookup-place-id/index.ts`
- Stop using the legacy Text Search endpoint.
- Switch to the Places API (New) `places:searchText` endpoint.
- Return the same frontend shape:
  - `placeId`
  - `name`
  - `formattedAddress`

2. Improve error handling in `lookup-place-id`
- If Google returns config errors, return a clear message instead of pretending there are zero results.
- Examples:
  - Places API (New) not enabled
  - billing not enabled
  - invalid API key

3. Update `src/components/GooglePlacesAutocomplete.tsx`
- If the backend returns a real error, show that error below the field.
- Only show “No businesses found” when the API actually succeeded with zero matches.

4. Keep the existing onboarding persistence flow
- The selected business should still save:
  - `google_place_id`
  - business name
  - address
- `Onboarding.tsx` already has the logic to convert the place ID into:
```text
https://search.google.com/local/writereview?placeid=...
```
and save it to the restaurant record after selection/auth flow.

5. Verify end to end
- Search returns actual businesses
- selecting one fills business name/address
- place ID persists through auth redirect
- restaurant record gets `google_place_id`
- profile gets the generated Google review link

Technical details

Relevant evidence:
- Secret names present:
  - `GOOGLE_PLACES_API_KEY_SERVER`
  - `VITE_GOOGLE_MAPS_API_KEY`
- Current failing function:
  - `supabase/functions/lookup-place-id/index.ts`
- Current frontend component:
  - `src/components/GooglePlacesAutocomplete.tsx`
- Save logic already exists in:
  - `src/pages/Onboarding.tsx`
  - `src/lib/google.ts`

Important note:
- Re-entering the key only helps if the key itself is wrong or restricted.
- Based on the logs, the more likely fix is enabling Places API (New) and/or updating the function to use the new endpoint.
- Since this project already has the secret, the safest implementation is to fix the backend function first rather than re-adding the key blindly.
