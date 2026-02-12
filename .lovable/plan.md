

# Fix Google Business step: eliminate duplicate address entry and add search fallback

## Problems identified

1. **Duplicate data entry**: Step 1 collects business name, city, and state. Then Step 3 ("Connect Google") presents an empty Google search field, forcing the user to type their business info again.

2. **Google Autocomplete not working**: The `PlaceAutocompleteElement` widget (newer Google Maps JS API) can fail silently on certain devices/browsers. When it does, the user is completely stuck with no way forward.

## Solution

### 1. Pre-fill the Google search with Step 1 data

Pass `defaultValue` to `GooglePlacesAutocomplete` using the business name and city already collected in Step 1. This way the autocomplete dropdown should appear immediately or with minimal typing.

**File: `src/pages/Onboarding.tsx` (line ~1059-1062)**

Change `defaultValue=""` to use `formData.businessName + " " + formData.city + " " + formData.state`.

### 2. Add a "Search manually" fallback button

When the Google autocomplete widget fails or returns no results, show a fallback button that calls the existing `lookup-place-id` edge function (server-side Google Places Text Search). This gives users a way to find their business even when the client-side widget breaks.

**File: `src/pages/Onboarding.tsx` (Google step, lines ~1058-1067)**

Add a fallback section below the autocomplete:
- A text link: "Can't find your business? Search manually"
- On click, call the `lookup-place-id` edge function with the business name + city + state
- If a result is found, auto-populate `selectedGooglePlace` and show the green "Connected" confirmation
- If not found, show an error message

### 3. Handle autocomplete widget load failures gracefully

**File: `src/components/GooglePlacesAutocomplete.tsx`**

When the component renders an error state ("Google Places library not fully loaded", "Failed to load Google Maps", etc.), also expose a callback or render a manual-search prompt so the parent can offer the fallback.

## Technical details

| File | Change |
|------|--------|
| `src/pages/Onboarding.tsx` | Pre-fill `defaultValue` with business name + city + state from Step 1; add manual search fallback calling `lookup-place-id` edge function |
| `src/components/GooglePlacesAutocomplete.tsx` | Add optional `onError` callback prop so parent knows when widget fails; render fallback UI hint on error |

### Fallback search flow

1. User clicks "Can't find your business? Search manually"
2. System calls `lookup-place-id` edge function with `address: "Las Islas Marias Fontana CA"`
3. Edge function returns `{ placeId, name, formattedAddress }`
4. `selectedGooglePlace` is set automatically, green confirmation appears
5. User clicks "Continue" as normal

This ensures no user gets stuck on this step regardless of whether the Google Maps JS widget loads correctly.

