

# Affiliate Flow Audit -- Bugs Found and Fixes

## Bugs Discovered

### Bug 1: Double Commission for Paid Signups (CRITICAL)

When an affiliate-referred user signs up through the AffiliatePaywall (paid plan with trial):

1. After Stripe checkout, `PersonalSignupComplete.tsx` runs and creates a commission using **free-tier rates** ($3/$5)
2. Later, when the trial converts to active, `stripe-webhook` fires `customer.subscription.updated` and creates a **second** commission using paid-tier rates ($5/$8)

Result: The affiliate gets TWO commissions per referral instead of one.

**Fix**: In `PersonalSignupComplete.tsx`, check the user's `planType` from the saved data. If it's a paid plan (`monthly`/`yearly`), do NOT create an immediate commission -- let the webhook handle it with the correct paid rates. Only create an immediate commission for `free` plan signups.

### Bug 2: Free-Plan Users Cannot Use Affiliate Links (CRITICAL)

In `PersonalSignup.tsx` (line ~180), if `affiliateRef` is set, the component renders `<AffiliatePaywall>` which only offers a paid monthly plan. There is no way for an affiliate-referred user to sign up for a free plan.

**Fix**: Remove the early return that renders `AffiliatePaywall` when an affiliate ref is present. Instead, let referred users go through the normal signup wizard. The referral code is already persisted in `sessionStorage` and handled by both `CheckoutStep` (for paid) and `PersonalSignupComplete` (post-Stripe).

### Bug 3: Free Signup via Normal Wizard Never Logs Referrals (CRITICAL)

When a user picks the free plan in CheckoutStep, account creation happens directly in `CheckoutStep.tsx` (via `verifyOTPAndCreateAccount` or `createProfileDirectly`). Neither of these paths checks `sessionStorage.tapaway_ref` or creates a referral record.

The comment on line 453 says "affiliate referral logging is now handled in PersonalSignupComplete," but free-plan users never reach `PersonalSignupComplete` -- they complete entirely within `CheckoutStep`.

**Fix**: Add affiliate referral logging + free-tier commission creation to the free-plan paths in `CheckoutStep.tsx` (after profile creation in both `verifyOTPAndCreateAccount` and `createProfileDirectly`).

### Bug 4: Existing-Account Affiliate Path Also Missing

The `handleExistingAccountSignIn` flow in `CheckoutStep.tsx` (line 744+) creates a profile but never logs referrals either. Same gap as Bug 3.

**Fix**: Add referral logging after profile creation in `handleExistingAccountSignIn` as well.

### Bug 5: Wrong Rates Used in PersonalSignupComplete

Even after fixing Bug 1 (only creating commissions for free users), the commission code in `PersonalSignupComplete.tsx` always uses `commission_free_base`/`commission_free_bonus`. This happens to be correct once Bug 1 is fixed (since only free users will hit this path), but we should make the intent explicit.

---

## Summary of Changes

### File 1: `src/pages/personal/PersonalSignup.tsx`

Remove the `AffiliatePaywall` early return (around line 180). Let affiliate-referred users go through the normal signup wizard. The `tapaway_ref` is already in sessionStorage and will be picked up downstream.

### File 2: `src/components/personal/signup/CheckoutStep.tsx`

Add referral logging + free-tier commission creation after profile creation in THREE places:
- `verifyOTPAndCreateAccount` (after blocks insert, ~line 450)
- `createProfileDirectly` (after blocks insert, ~line 625)
- `handleExistingAccountSignIn` (after blocks insert, ~line 913)

The logic: Check `sessionStorage.tapaway_ref`. If present, look up the affiliate, insert into `affiliate_referrals`, update `personal_profiles.referred_by`, create a commission using free-tier rates, fire the abuse check, then clear the ref from storage.

### File 3: `src/pages/personal/PersonalSignupComplete.tsx`

Wrap the commission creation (lines 329-362) in a condition: only create a commission if the user's `planType` is `free`. For paid plans, skip -- the `stripe-webhook` handles it when the trial converts.

### File 4: No changes needed to `stripe-webhook/index.ts`

The webhook logic is correct. It properly:
- Checks for `trialing` to `active` transition
- Deduplicates via the `paid_conversion` note check
- Uses paid-tier rates

---

## Technical Details

### Referral logging helper (shared logic for CheckoutStep)

The referral logging code that needs to be added to CheckoutStep is essentially the same block from PersonalSignupComplete, adapted:

```text
1. Read sessionStorage/localStorage "tapaway_ref"
2. If present, look up affiliate by referral_code
3. Insert affiliate_referrals row
4. Update personal_profiles.referred_by
5. If planType is "free":
   - Count affiliate's referrals
   - Read affiliate_settings for free tier rates
   - Insert affiliate_commissions
6. Fire check-affiliate-abuse (non-fatal)
7. Clear tapaway_ref from storage
```

### Testing Plan

After implementation:
1. Sign up with `?ref=tapoxydgo` and pick the **free** plan -- verify referral + $3 commission created
2. Sign up with `?ref=tapoxydgo` and pick a **paid** plan -- verify referral created but NO immediate commission; commission only appears after trial-to-active webhook
3. Check `affiliate_referrals` and `affiliate_commissions` tables to confirm correct data
4. Verify no double commissions exist
