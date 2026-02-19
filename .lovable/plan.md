

# Fix Email Sender, Add Password Toggle, and Streamline Card-to-Signup Flow

## Three Issues to Fix

### 1. Email sender showing ugly address

The `EMAIL_FROM` secret is set to just `no-reply@tapaway.co` without a display name. The edge function has a fallback `"TapAway <no-reply@tapaway.co>"` but the secret overrides it with the raw address. Fix: update the `send-custom-otp` edge function to always wrap the `EMAIL_FROM` value with a display name if it doesn't already have one.

**File: `supabase/functions/send-custom-otp/index.ts`**
- Update the `sendEmail` function (line 97) to ensure the `from` field always has the format `TapAway <address>` even if the `EMAIL_FROM` secret is just a bare email address
- Add a helper that checks if `EMAIL_FROM` already contains `<` -- if not, wrap it: `TapAway <${emailFrom}>`

### 2. Password visibility toggle on CardResolver

The password step in `CardResolver.tsx` uses a plain `type="password"` input with no toggle. The `IdentityStep` already has this pattern (eye/eye-off button).

**File: `src/pages/CardResolver.tsx`**
- Add `showPassword` state (boolean, default false)
- Import `Eye` and `EyeOff` from lucide-react
- Wrap the password input in a `relative` div, add an eye toggle button on the right side
- Change input type to `showPassword ? "text" : "password"`

### 3. Don't re-ask for email and password in signup

After CardResolver creates the account (email + OTP + password), the user is signed in and redirected to `/personal/signup?card=XXX`. The IdentityStep then asks for email and password again -- redundant.

**File: `src/pages/CardResolver.tsx`**
- Before navigating to signup, store email and password in `sessionStorage` under keys like `tapaway_card_email` and `tapaway_card_password`

**File: `src/components/personal/signup/IdentityStep.tsx`**
- On mount, check `sessionStorage` for `tapaway_card_email` and `tapaway_card_password`
- If found, pre-fill the email and password fields and clear them from sessionStorage
- Also check if the user is already authenticated (via `supabase.auth.getUser()`) -- if so, pre-fill email from the session and make the email field read-only (they already verified it)

**File: `src/pages/personal/PersonalSignup.tsx`**
- On mount, if `searchParams` has `card` and user is already authenticated, pre-fill the email from the auth session into `onboardingData` so it carries through

## File Changes Summary

| File | Change |
|------|--------|
| `supabase/functions/send-custom-otp/index.ts` | Wrap `EMAIL_FROM` with display name if bare address |
| `src/pages/CardResolver.tsx` | Add password eye toggle; store email/password in sessionStorage before navigating to signup |
| `src/components/personal/signup/IdentityStep.tsx` | Pre-fill email/password from sessionStorage; make email read-only if user is authenticated |
