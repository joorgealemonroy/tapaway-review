
# Fix Card Activation Flow: Password Toggle, Pre-fill, Email Sender, and Restart

## Issues Found

1. **No password visibility toggle** on the CardResolver page (password step has a plain input with no eye icon)
2. **No data bridging** between card activation and signup -- email and password are not carried over to the signup form
3. **Email sender address** may show raw system address if `EMAIL_FROM` secret doesn't include a display name
4. **No restart option** -- users can't go back from the password step to start over

## Changes

### 1. `src/pages/CardResolver.tsx`

**Password eye toggle:**
- Add `showPassword` state
- Import `Eye`, `EyeOff` from lucide-react
- Wrap password input in a relative div with an eye toggle button (same pattern as IdentityStep)

**Store credentials before navigating to signup:**
- Before every `navigate('/personal/signup?card=...')` call, save email and password to `sessionStorage`:
  ```
  sessionStorage.setItem("tapaway_card_email", email)
  sessionStorage.setItem("tapaway_card_password", password)
  ```

**Add restart / back button:**
- On the password step, add a "Start over" link below the submit button that resets state (email, otp, password) and goes back to step "email"

### 2. `src/components/personal/signup/IdentityStep.tsx`

**Pre-fill from sessionStorage:**
- On mount, check for `tapaway_card_email` and `tapaway_card_password` in sessionStorage
- If found, call `updateFormData({ email, password })` and clear them from sessionStorage
- Also check `supabase.auth.getUser()` -- if user is already authenticated, pre-fill email from the session and make the email field read-only with a lock icon and helper text ("Verified via card activation")

### 3. `supabase/functions/send-custom-otp/index.ts`

**Fix email sender display name:**
- On line 97, after reading `EMAIL_FROM`, check if it already contains `<`. If not, wrap it:
  ```
  const raw = Deno.env.get("EMAIL_FROM") || "no-reply@tapaway.co";
  const fromEmail = raw.includes("<") ? raw : `TapAway <${raw}>`;
  ```
- Apply the same fix on line 197 where it's read again for logging

### 4. No new files needed

## Summary Table

| File | What Changes |
|------|-------------|
| `src/pages/CardResolver.tsx` | Add password eye toggle, sessionStorage bridge, restart button |
| `src/components/personal/signup/IdentityStep.tsx` | Read sessionStorage on mount, pre-fill email/password, read-only email if authenticated |
| `supabase/functions/send-custom-otp/index.ts` | Wrap bare EMAIL_FROM with display name |
