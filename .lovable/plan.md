# Back button on signup, with nothing lost

Right now the second signup screen only has a faint "← Back" line at the very bottom, and if someone goes back to change how many cards they want, some of what they typed (their Google business, website, whether they chose "Not on Google yet") is not remembered when they return.

## What changes

1. **Clear back button at the top of the business-info screen**
   - Add a visible "← Back" control in the header area of step 2, next to the progress dots, tappable on mobile.
   - Keep the existing bottom back link so either works.

2. **Nothing typed is lost**
   - Everything entered on the business-info screen is saved as it is typed: business name, selected Google business (name, address, place ID), "Not on Google yet" choice, website, phone, logo.
   - Coming back to that screen restores all of it, including the Google business shown as selected with its green check, and the manual-entry mode if that was chosen.

3. **Plan choice stays intact**
   - Going back shows the previously chosen card quantity and billing cycle already selected (already the case, kept working).

## Technical notes

- `src/lib/onboardingData.ts`: add `notOnGoogle` and `websiteUrl` to `OnboardingData` so the manual-entry path persists.
- `src/pages/Onboarding.tsx`:
  - Persist on change (debounced for text inputs) via `saveOnboardingData` for `businessName`, `websiteUrl`, `phone`, `notOnGoogle`, and Google place fields (`googlePlaceId`, `googlePlaceName`, `googlePlaceAddress`); clear place fields when switching to manual entry.
  - Extend the existing restore effect to hydrate `websiteUrl`, `notOnGoogle`, `selectedGooglePlace`, and `logoUrl` from saved data.
  - Add the header back control that calls the existing `goTo("plan", -1)`; no changes to step flow, checkout, pricing, analytics, or attribution.
