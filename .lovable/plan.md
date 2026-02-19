

# Fix Card Activation Page: Better UI + Fix New User OTP Flow

## Problems Identified

### Problem 1: Non-2xx error for new users
When a new user verifies their OTP code, the `verify-custom-otp` edge function is called **without a password** (since the frontend doesn't know yet if they're new). The edge function finds no existing account and returns a **400 error** ("Password is required to create your account"). The frontend treats this as a failure and shows an error toast instead of transitioning to the password step.

### Problem 2: OTP re-verification fails after password entry
After the user enters a password and the frontend re-calls `verify-custom-otp` with the same OTP code, the OTP has already been marked as `verified_at != null` from the first call attempt. The query filters for `is("verified_at", null)`, so the second call returns "Invalid or expired code."

### Problem 3: Activation page UI is too basic
The page uses a plain white background with a generic credit card icon. For a first impression, it needs to feel premium and branded.

---

## Solution

### 1. Fix `verify-custom-otp` edge function

Change the new-user-without-password case from a **400 error** to a **200 success** response with a flag:

```
// Instead of returning status 400...
// Return: { success: true, isNewUser: true, needsPassword: true }
```

This way the frontend can gracefully transition to the password step.

Also: do NOT mark the OTP as verified until the flow is fully complete (user has provided password and account is created). Move the `verified_at` update to after successful account creation/login, so the second call with password can still find the OTP record.

### 2. Fix `CardResolver.tsx` frontend flow

- On first OTP verify response: if `needsPassword: true`, transition to password step (no error)
- On password submit: re-call `verify-custom-otp` with email + code + password (OTP still valid since we delayed marking it verified)
- Remove the `isNewUser` state hack -- use the response flag instead

### 3. Redesign the activation page UI

Make it premium and Apple-style:
- Use the actual TapAway card image (`/tapaway-personal-front.png`) instead of a generic icon
- Add a subtle gradient background (teal to white)
- Animate the card with a slight float/glow effect using framer-motion
- Add a "3 steps" indicator (Email, Verify, Done) to show progress
- Larger, bolder typography
- Trust signals: "Takes 30 seconds" subtitle
- Smooth step transitions with framer-motion AnimatePresence

---

## File Changes

### `supabase/functions/verify-custom-otp/index.ts`
- Move the `verified_at` update from before user lookup to after successful account creation/login
- Change the new-user-without-password path from 400 error to 200 with `{ success: true, isNewUser: true, needsPassword: true }`
- Keep all other logic unchanged

### `src/pages/CardResolver.tsx`
- Redesign UI: gradient background, real card image, step progress indicator, framer-motion animations
- Fix flow: handle `needsPassword` response correctly, remove `isNewUser` state variable
- Add "Takes 30 seconds" subtitle and step labels
- Animate between steps with AnimatePresence

No other files need changes.
