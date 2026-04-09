

# Fix Google Places Search — Use Server-Side Search

## Problem
The Google Maps JavaScript API key has **referrer restrictions** that block the Lovable preview domain (`RefererNotAllowedMapError`). The client-side `Autocomplete` widget cannot make requests because the domain isn't whitelisted in the Google Cloud Console. This is why the "This page can't load Google Maps correctly" error appears.

## Solution
Replace the client-side Google Maps Autocomplete widget with a **server-side search** using the existing `lookup-place-id` edge function. This edge function already calls the Google Places Text Search API from the server (no referrer restrictions). We just need to:

1. Turn the component into a debounced text input that calls the edge function as the user types.
2. Show a dropdown of results for the user to pick from.

## Changes

### 1. `supabase/functions/lookup-place-id/index.ts` — Return multiple results
- Currently returns only the first result. Update to return up to 5 results so the user can pick the correct business.
- Return an array: `{ results: [{ placeId, name, formattedAddress }, ...] }`.

### 2. `src/components/GooglePlacesAutocomplete.tsx` — Full rewrite
- **Remove** all Google Maps JavaScript SDK loading (no script tag, no `window.google`).
- Replace with a standard `<input>` that debounces user typing (300ms).
- On each debounced keystroke (min 3 chars), call the `lookup-place-id` edge function via `supabase.functions.invoke`.
- Display results in a styled dropdown list below the input.
- When user clicks a result, call `onPlaceSelected` with `{ placeId, name, address }` and close the dropdown.
- Handle loading state (spinner) and empty results ("No businesses found").
- Style dropdown to match the dark onboarding theme.

### 3. No changes needed to `Onboarding.tsx`
- The `onPlaceSelected` callback interface remains the same `{ placeId, name, address }`, so no upstream changes are required.

## Benefits
- No Google Maps JavaScript API loaded on the client at all — no referrer issues.
- The edge function's server-side API call has no domain restrictions.
- Smaller page bundle (no Maps JS SDK).
- Works on any domain (preview, published, custom).

