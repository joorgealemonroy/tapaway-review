

# Affiliate Referral: Route Through Stripe Payment Link

## What's Changing

Currently, affiliate-referred users **bypass Stripe entirely** and get a free 14-day trial. Instead, they should go through a **specific Stripe Payment Link** (`https://buy.stripe.com/dRm8wP7tZ4vpby11AegYU0f`) and then land on `/personal/signup/complete?session_id={CHECKOUT_SESSION_ID}` to finish creating their profile -- same post-payment flow as regular signups.

---

## File Changes

### 1. `src/lib/personalConfig.ts` -- Add affiliate payment link

Add a new constant for the affiliate-specific Stripe link:

```
PERSONAL_AFFILIATE_PAYMENT_LINK = 'https://buy.stripe.com/dRm8wP7tZ4vpby11AegYU0f'
```

Existing monthly/yearly links stay unchanged for regular signups.

### 2. `src/components/personal/signup/CheckoutStep.tsx` -- Remove free bypass

**Current behavior (lines 441-448):** If `tapaway_ref` exists in sessionStorage, skip Stripe and go straight to OTP/free trial creation.

**New behavior:** If `tapaway_ref` exists, redirect to the affiliate Stripe Payment Link (same flow as `handleStripeCheckout` but using the affiliate-specific link). The referral code stays in sessionStorage so `PersonalSignupComplete` can still log the referral after payment.

Changes:
- In `handleGetCard`: Remove the early return that bypasses Stripe for referrals. Instead, referred users go through `handleStripeCheckout`.
- In `handleStripeCheckout`: Detect if there's a `tapaway_ref` in sessionStorage. If yes, use the affiliate payment link instead of the plan-based link.
- In the profile creation section (lines 291-317): Remove the block that sets `subscription_status: 'trialing'` and `trial_ends_at` for referred users, since the payment link handles the plan/pricing. The profile will be created by `PersonalSignupComplete` after Stripe verification, not here.

### 3. `src/pages/personal/PersonalSignupComplete.tsx` -- Log affiliate referral after payment

After profile creation succeeds (around line 252), check for `tapaway_ref` in sessionStorage and log the referral in `affiliate_referrals` table, then clear the key. This ensures the referral is tracked even though they paid.

---

## What stays the same

- `PersonalSignup.tsx` -- still captures `?ref=` and stores in sessionStorage
- `verify-personal-checkout` edge function -- already handles Payment Link sessions
- Regular (non-affiliate) signup flow -- unchanged, uses existing monthly/yearly links
- Affiliate dashboard and admin management -- unchanged
- `referred_by` column on `personal_profiles` -- still populated during profile creation

---

## Important: Stripe Dashboard Configuration

The affiliate payment link (`dRm8wP7tZ4vpby11AegYU0f`) must have its success URL set to:

```
https://tapaway.co/personal/signup/complete?session_id={CHECKOUT_SESSION_ID}
```

This is configured in the Stripe dashboard, not in code.

