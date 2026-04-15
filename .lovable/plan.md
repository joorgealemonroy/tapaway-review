

# Pre-fill Shipping Address for Frictionless Card Requests

## Problem
The Cards tab currently shows empty address fields. Users have to manually type their shipping info every time, even though we already have their name on the profile and potentially their address from previous card requests or Stripe.

## Changes

### 1. `src/components/personal/CardsTab.tsx`
- **Add `fullName` prop** (passed from dashboard) to seed `address.name` immediately
- **Fetch all shipping fields** from the last card request (the current query only selects `shipping_city` and `shipping_state` — expand to include `shipping_name, shipping_address_line1, shipping_address_line2, shipping_postal_code`)
- **Pre-fill on load**: If a previous request exists, populate all address fields. If no previous request, use `fullName` for the name field
- **Collapse the address form by default** when all required fields are filled. Show a compact summary line (e.g. "John Doe · 123 Main St, Salem OR 97301") with an "Edit" link. This way Card Club members just pick quantity and tap "Confirm Request"
- **Rename CTA** from "Request Cards (Free)" → "Confirm Request" for a cleaner feel

### 2. `src/pages/personal/PersonalDashboard.tsx`
- Pass `fullName={profile.full_name}` as an additional prop to `<CardsTab>`

### 3. `supabase/functions/create-card-order/index.ts`
- No changes needed — it already accepts and stores shipping from the request body

## UX Flow After Changes
1. User opens Cards tab
2. Address is pre-filled from their last order (or their profile name + empty fields if first time)
3. If address is complete: they see a compact summary, pick quantity, tap "Confirm Request" — done
4. If address is incomplete: form is expanded for them to fill in, then collapses on next visit

## Files Changed
- `src/components/personal/CardsTab.tsx` — expand query, add collapsible address, add `fullName` prop
- `src/pages/personal/PersonalDashboard.tsx` — pass `fullName` prop

