

# Update Venue Pack Business Type Selection Copy

## Change
Update the two-option selector that appears after selecting "Venue Pack" (lines 625-643 in `Onboarding.tsx`) with the new "I have a..." approach:

**Current:**
- Prompt: "What best describes your business?"
- Option 1: 🍽️ "Restaurant / Bar / Cafe"
- Option 2: ✂️ "Barbershop / Salon / Service"

**New:**
- Prompt: removed (the boxes speak for themselves)
- Option 1: 🍽️ **"I serve food or drinks"** — sub-text: "Restaurant, Bar, Cafe, Food Truck"
- Option 2: 🛍️ **"I provide services or retail"** — sub-text: "Salon, Boutique, Gym, Office, & More"

## Implementation
- **File**: `src/pages/Onboarding.tsx` (lines 622-645)
- Update the prompt text and option labels/icons
- Add sub-text below each option label using smaller gray text
- Keep the same `dashboardType` values (`restaurant` / `personal`) and all existing logic

## Files Changed
- `src/pages/Onboarding.tsx`

