

# Remove Card Customizer from Onboarding

## What changes
Remove the card headline/sub-headline customization step (Step 3 — the card preview with editable text fields) from the onboarding flow.

## Files modified
1. **`src/pages/Onboarding.tsx`** (or `src/pages/OnboardingNew.tsx`, whichever is active) — Remove the card customizer step, adjust step numbering/progression so the flow skips directly past it.

I need to check which onboarding page is active and how steps are structured.
