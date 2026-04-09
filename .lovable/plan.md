

# Replace Business Name Field with Google Places Search

## What changes
Remove the manual "Business Name" text input on Step 3 and replace it with the Google Places search as the primary input. When a user selects a business from Google, the business name, address, and place ID are all captured automatically. The shipping address field becomes a simple editable text input pre-filled from the selected place.

## Why the current search doesn't work
The component uses `PlaceAutocompleteElement` (the new Google Maps web component), which has known issues with rendering inside dark-themed containers and receiving focus/input. The fix is to switch to the classic `google.maps.places.Autocomplete` widget attached to a standard `<input>` element, which is more reliable and styleable.

## Changes

### 1. `src/components/GooglePlacesAutocomplete.tsx` — Rewrite to use classic Autocomplete
- Replace `PlaceAutocompleteElement` web component with `new google.maps.places.Autocomplete(inputElement, options)` attached to a standard `<input>`.
- Use `types: ["establishment"]`, `componentRestrictions: { country: "us" }`.
- On `place_changed` event, extract `place.place_id`, `place.name`, and `place.formatted_address`.
- Style the input with Tailwind to match the dark onboarding theme (passed via className prop).
- Add a `placeholder` prop for customization.

### 2. `src/pages/Onboarding.tsx` — Remove business name input, use Google Places as primary
- **Remove** the "Business Name" `<Input>` field (lines 500–509).
- **Move** GooglePlacesAutocomplete up to where the business name field was, with label "Search Your Business on Google".
- When a place is selected, auto-set `businessName` from the place name and `shippingAddress` from the place address.
- **Add** a simple editable "Shipping Address" text input below, pre-filled from the selected place address (user can override).
- **Update** `handleOAuth` validation: check that a Google place has been selected (instead of checking `businessName.trim()`).
- **Save** Google Place data (`googlePlaceId`, `googlePlaceName`, `googlePlaceAddress`) to localStorage before OAuth redirect.
- **Restore** Google Place data in `completeSetup` from `savedData` if React state is null after redirect.

### 3. `src/lib/onboardingData.ts` — Add Google Place fields
- Add `googlePlaceId`, `googlePlaceName`, `googlePlaceAddress` to the `OnboardingData` interface and defaults.

## Flow after fix
1. User types business name in Google Places search → dropdown appears with matching businesses
2. User selects their business → name, address, and place ID are captured
3. Shipping address auto-fills from the selected place (editable)
4. All data saved to localStorage before OAuth redirect
5. After OAuth, `completeSetup` restores place data, saves `google_place_id` and `google_review_url` to the restaurant record

