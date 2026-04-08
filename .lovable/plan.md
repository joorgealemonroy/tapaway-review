

# Add Stripe Checkout After OAuth in Onboarding

## Summary
After the user signs in via OAuth ("Start My Free Trial"), redirect them to Stripe Checkout to put a card on file. Once Stripe confirms payment/trial setup, redirect back to complete onboarding and land on the dashboard.

## Current Flow
OAuth → Create restaurant in DB → Show success screen → Dashboard

## New Flow
OAuth → Create restaurant in DB → Redirect to Stripe Checkout (card on file, $0 trial) → Stripe redirects back to `/onboarding?session_id=...` → Verify checkout & update restaurant with Stripe IDs → Navigate to dashboard

## Changes

### 1. `src/pages/Onboarding.tsx`
- In the post-OAuth `completeSetup` function (around line 177–286), after creating the restaurant record and before showing success:
  - Call `create-checkout-session` edge function with user email, userId, restaurantId, planType, and hasProtection
  - Redirect the browser to the returned Stripe checkout URL (`window.location.href = url`)
- Add handling for returning from Stripe: detect `session_id` in URL search params
  - When `session_id` is present, call `verify-checkout` to confirm payment and update restaurant with Stripe customer/subscription IDs
  - Then mark onboarding complete, show success, and navigate to dashboard
- Remove the current "immediate success" flow that skips Stripe entirely

### 2. `supabase/functions/create-checkout-session/index.ts`
- Update `success_url` to include the restaurant ID so verify-checkout can link them
- Ensure trial days match the plan selection (already does: solo=14, venue=21)
- Keep the existing `TRIAL_PRICE_ID` — this already creates a $0 trial with card required

### 3. No new edge functions needed
- `create-checkout-session` already handles trial creation with card on file
- `verify-checkout` already handles verifying the session and updating the restaurant record

## Technical Notes
- The Stripe checkout page collects the card and shipping address, so the shipping address field in step 3 could become optional (Stripe collects it)
- `verify-checkout` already creates fulfillment orders from Stripe shipping details
- The `payment_status` check in verify-checkout may need to also accept `'no_payment_required'` since trials with $0 due may return that status

