

# Concierge Onboarding: Combine Promo Token + Rep Mode

## Problem
When an admin uses a `?promo_token=XYZ` link, Step 3 still shows Google/Apple OAuth buttons. Admins need to enter a client's email instead, just like Rep Mode already does.

## Changes

### 1. `src/pages/Onboarding.tsx` — UI: Show email input when promo token is present

**Line 732 condition change**: Currently `isRepMode && authUser` gates the email input. Change to:

```
(isRepMode && authUser) || !!promoTokenParam
```

This makes the promo token flow reuse the same "Owner's Email" input UI that Rep Mode uses, hiding OAuth buttons.

**`handleRepCheckout` update**: When `promoTokenParam` is present but no auth session exists (admin isn't logged in as a rep), the function needs to call `create-rep-onboarding` **without** requiring auth. Add the `promoToken` param to the request body. If no auth session, invoke without the Authorization header (the edge function will validate the promo token as the authorization mechanism instead).

**Handle success redirect for free promos**: If the response has `{ success: true }` (no Stripe URL), redirect to `/rep-checkout-success` instead of expecting a checkout URL.

### 2. `supabase/functions/create-rep-onboarding/index.ts` — Accept promo tokens

**Auth bypass**: If `promoToken` is provided in the body, skip the rep authentication check. Instead, validate the promo token via the same logic as `validate-promo-token` (query `promo_tokens` table, check `is_used`, `expires_at`).

**Free token flow** (`discount_type === 'free'`):
- Create client via `admin.auth.admin.inviteUserByEmail`
- Create restaurant record with `subscription_status: 'active'` (no trial)
- Mark `onboarding_completed: true`
- Mark promo token as `is_used = true`, set `used_by_user_id`
- Call `finalize-onboarding`
- Return `{ success: true, restaurantId, clientUserId }` (no Stripe URL)

**50% off token flow** (`discount_type === '50_off'`):
- Create client and restaurant as normal (trialing)
- Create Stripe checkout session with a 50% coupon applied
- Do NOT mark token as used yet (deferred burn via webhook)
- Store `promoToken` in Stripe session metadata
- Return `{ url: session.url }` as usual

### 3. Stripe coupon for 50% off

In the edge function, find or create a Stripe coupon (`percent_off: 50`, metadata `tapaway_promo: 50_off`) and pass it as `discounts` on the checkout session.

## Files

| File | Change |
|------|--------|
| `src/pages/Onboarding.tsx` | Show email input when `promoTokenParam` is present; handle no-URL success response; allow unauthenticated invocation with promo token |
| `supabase/functions/create-rep-onboarding/index.ts` | Accept optional `promoToken`; bypass rep auth when valid token provided; handle free (instant activate) and 50_off (coupon checkout) flows |

