

# Fetch Shipping Address from Stripe for Pre-fill

## Problem
Users like `sugarbloomcakery` have their shipping address stored on their Stripe customer object (from their original checkout), but no `personal_card_requests` records yet. The Cards tab shows empty address fields because there's nothing in our DB to pre-fill from.

## Solution
Add a new endpoint flow in `create-card-order` that fetches the Stripe customer's shipping address, and call it from the CardsTab on load when no previous card requests exist.

## Changes

### 1. `supabase/functions/create-card-order/index.ts`
Add a new flow: `fetch_address`
- Accepts `profile_id`, looks up `stripe_customer_id`
- Calls `stripe.customers.retrieve(customerId)` 
- Returns `customer.shipping.address` + `customer.shipping.name` (or `customer.address` as fallback)
- No mutation, read-only

### 2. `src/components/personal/CardsTab.tsx`
Update `loadRequests`:
- After loading card requests, if **none exist** AND `stripeCustomerId` is set:
  - Call `create-card-order` with `flow: 'fetch_address'`
  - Use the returned shipping data to pre-fill the address form
  - If address is complete, collapse the form to the compact summary
- This gives users like sugarbloomcakery a fully pre-filled address on first visit

## UX Flow
1. User opens Cards tab for the first time
2. No card requests in DB → component calls `fetch_address`
3. Stripe customer has shipping → address auto-fills and collapses
4. User picks quantity, taps "Confirm Request" — done

## Files Changed
- `supabase/functions/create-card-order/index.ts` — add `fetch_address` flow (~15 lines)
- `src/components/personal/CardsTab.tsx` — add Stripe address fetch fallback (~10 lines in `loadRequests`)

