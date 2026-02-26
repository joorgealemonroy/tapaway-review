

# Add Back Button to Personal Pricing Page

## What Changes
Add a back arrow button at the top of the `/personal/pricing` page that navigates back to the home page (`/`).

## Technical Details

### File: `src/pages/personal/PersonalPricing.tsx`

- Import `ArrowLeft` from lucide-react
- Add a back button at the top of the page content (inside the `max-w-sm` container, before the Hero section)
- The button navigates to `/` using `navigate("/")`
- Styled as a subtle icon button (ghost style) positioned at the top-left, consistent with other back buttons in the app

