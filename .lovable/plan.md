

# Skip Links Step for Imported Profiles

## Problem
When a user imports their profile, all links are already pre-populated. Forcing them through the "Build your profile" step (step 2) adds unnecessary friction — they should go straight from Identity (step 1) to Checkout (step 3).

## Changes — `src/pages/personal/PersonalSignup.tsx`

1. **Track import state**: Add a `hasImportedProfile` flag, set to `true` when import data is consumed from sessionStorage.

2. **Modify `nextStep`**: When `hasImportedProfile` is true and `currentStep === 1`, skip to step 3 instead of step 2.

3. **Modify `prevStep`**: When `hasImportedProfile` is true and `currentStep === 3`, go back to step 1 instead of step 2.

4. **Update step indicator**: Adjust the total steps or visually indicate that step 2 is skipped (e.g. show 2 dots instead of 3 when imported).

5. **Update step titles**: Map step 1 → "Create your TapAway", step 3 → "Finish your order" (step 2 never shown).

