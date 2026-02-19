
# Eliminate Double OTP for Card-Activation Users

## Problem

When a user activates a card via `/c/XXXX`, they go through:
1. Enter email
2. Verify OTP
3. Create password (gets signed in)
4. Navigate to `/personal/signup?card=XXXX`

Then in Step 4 (Checkout), clicking "Create Free Account" sends **another OTP** and asks them to verify again. This is completely redundant — the user is already authenticated.

**Estimated time for a free user right now: ~3-4 minutes with two OTP flows.**
**After fix: ~1.5-2 minutes with one OTP flow.**

## Solution

### File: `src/components/personal/signup/CheckoutStep.tsx`

Modify the checkout flow to detect when the user is already authenticated and skip the OTP entirely:

1. On component mount, check `supabase.auth.getUser()` to see if user is already signed in
2. Store this in a `preAuthed` state variable
3. In `handleGetCard` (for free plans), if `preAuthed` is true:
   - Skip `sendOTP()` entirely
   - Go directly to the account creation logic (upload photo, create profile, create links/blocks, send welcome email)
   - Reuse the existing user session instead of creating a new one

The key change is in the `handleGetCard` function around line 482:

```
if (isFreePlan) {
  if (preAuthed) {
    // User came from card activation, already signed in
    // Skip OTP, go straight to profile creation
    createProfileDirectly();
  } else {
    sendOTP();
  }
}
```

A new `createProfileDirectly()` function will extract the profile-creation logic from `verifyOTPAndCreateAccount` (lines 263-477) into a reusable function that:
- Gets the current user from the session (instead of signing in)
- Uploads profile photo
- Uploads header image
- Creates the personal_profiles row
- Creates links and blocks
- Sends welcome email
- Calls `onComplete()`

### File: `src/pages/CardResolver.tsx`

Add a sessionStorage flag before navigating to signup so the CheckoutStep can reliably detect card-activation users:

```
sessionStorage.setItem("tapaway_card_preauthed", "true");
```

This is set alongside the existing `tapaway_card_email` and `tapaway_card_password` items (around line 210-212).

### No other changes needed

The upgrade prompts are already well-balanced:
- They only appear when the user actively tries to use a Pro feature
- The copy says "Try Pro Free for 7 Days" which is non-aggressive
- The "tap" prefix hint in IdentityStep is a small, unobtrusive link
- Free users can complete the entire flow without ever seeing a paywall

## Technical Details

The `createProfileDirectly` function will be a new async function in CheckoutStep that:

1. Sets `processing = true`, `isLoading = true`, `flowStep = "creating"`
2. Gets user via `supabase.auth.getUser()`
3. Runs the same upload + insert logic currently in lines 263-477 of `verifyOTPAndCreateAccount`
4. Handles errors the same way
5. Cleans up the `tapaway_card_preauthed` flag from sessionStorage

## Files Changed

| File | Change |
|------|--------|
| `src/components/personal/signup/CheckoutStep.tsx` | Add pre-auth detection, skip OTP for authenticated users, extract profile creation into reusable function |
| `src/pages/CardResolver.tsx` | Add `tapaway_card_preauthed` flag to sessionStorage before navigating to signup |
