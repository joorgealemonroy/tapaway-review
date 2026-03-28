

# Conditional Loss Protection Sub-headline by Plan

## Change in `src/pages/Onboarding.tsx` (line 348)

Make the sub-headline dynamic based on `selectedPlan`:

- **Solo**: "Don't let missing cards stall your growth. Includes priority replacements, easy to claim anytime in your dashboard."
- **Venue**: "In busy venues, cards tend to walk home with guests. Don't stop growing because a card went missing."

Replace the static `<p>` with a ternary on `selectedPlan`.

### Files modified
- `src/pages/Onboarding.tsx`

