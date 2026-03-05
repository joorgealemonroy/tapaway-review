

# Remove Duplicate "Activate My Card" Button

The current `CardOnboarding.tsx` has both a "Mid CTA" (section 5) and a "Bottom CTA" (section 6), each rendering an `<ActivateButton />`. This creates two consecutive activate buttons with nothing meaningful between them.

## Fix
In `src/components/card/CardOnboarding.tsx`, remove the "Mid CTA" section (lines ~167-174) so only one final activate button remains at the bottom of the page.

