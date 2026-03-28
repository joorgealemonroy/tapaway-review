

# Polish Plan Selection Cards

## Changes to `src/pages/Onboarding.tsx`

### 1. Update PLAN_DETAILS subtitles
- **Solo Pro**: `"Ideal for individual pros and personal branding."`
- **Venue Pack**: `"Designed for team-based venues and high-traffic locations."`

### 2. Update card text for included cards
- Solo: `"3 Smart NFC Cards included for your wallet and station."`
- Venue: `"15 Smart NFC Cards included for your tables or counters."`
- Decrease font size of this line to `text-xs` (from `text-sm`) so it reads as a bonus

### 3. Add "Best Value" badge to Venue Pack card
- A small pill/badge at the top-right (or top-left) of the Venue card: `"Best Value"` in electric blue bg with white text
- Only shown on the venue card, positioned absolute

### Files modified
- `src/pages/Onboarding.tsx` — Update `PLAN_DETAILS` object and card rendering

