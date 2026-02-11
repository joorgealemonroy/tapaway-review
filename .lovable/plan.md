

# Fix: Auto-Login After Stripe (Users Already Have a Password)

## The Problem

Users enter their password on the signup form BEFORE going to Stripe. When they return, the code tries to set the password via `set-user-password`, but it fails because the edge function doesn't set `must_set_password: true` on new users. And the current code only attempts sign-in IF set-password succeeds (line 110 conditional). So sign-in never happens.

## Fix 1: Add `must_set_password` flag to new users

**File: `supabase/functions/verify-personal-checkout/index.ts`** (line ~124)

Add `must_set_password: true` to user_metadata when creating new users so `set-user-password` accepts the request.

## Fix 2: Always try sign-in regardless of set-password result

**File: `src/pages/personal/PersonalSignupComplete.tsx`** (lines 94-129)

Change the logic so `signInWithPassword` is attempted even if `set-user-password` fails. This handles:
- New users: set-password succeeds, then sign-in succeeds
- Existing users: set-password fails (already has password), sign-in succeeds with their existing password

```
// Try setting password (non-fatal if it fails)
try {
  await supabase.functions.invoke("set-user-password", { body: { ... } });
} catch { /* OK */ }

// Always try to sign in
const { error } = await supabase.auth.signInWithPassword({
  email: data.email,
  password: savedPassword,
});
if (!error) signedIn = true;
```

## Fix 3: Remove dead-end fallback screens

**File: `src/pages/personal/PersonalSignupComplete.tsx`**

- `no_data` state (lines 401-437): Auto-redirect to `/auth?redirect=/personal/dashboard` with a toast instead of showing buttons
- `success` state when not signed in (line 439): Same auto-redirect instead of showing SuccessScreen

No user should ever see an intermediate page with buttons.

## Fix 4: Default headerType to "banner" in AffiliatePaywall

**File: `src/components/personal/signup/AffiliatePaywall.tsx`** (line 81)

Change `headerType: "color"` to `headerType: "banner"`.

## Files

| File | Change |
|------|--------|
| `supabase/functions/verify-personal-checkout/index.ts` | Add `must_set_password: true` to new user metadata |
| `src/pages/personal/PersonalSignupComplete.tsx` | Always attempt sign-in; replace fallback screens with auto-redirects |
| `src/components/personal/signup/AffiliatePaywall.tsx` | Default headerType to "banner" |

## Expected Result

Stripe return -> verify checkout (user created with flag) -> set password (succeeds) -> sign in (succeeds) -> redirect to `/personal/dashboard?welcome=true` -> confetti + toast. No intermediate screens ever shown.

