

# Skip Email Verification for Restaurant Trial Signup

## Current Flow
1. Step 1: Fill form → sends OTP email
2. Step 2: Enter OTP code + set password → creates account
3. Step 3: Connect Google
4. Step 4: Finish

## New Flow
1. Step 1: Fill form + set password → creates account instantly
2. Step 2: Connect Google
3. Step 3: Finish

## Changes

### 1. New edge function: `create-trial-account`
Creates a user account via admin API without OTP verification.
- Accepts: `email`, `password`
- Creates user with `email_confirm: true` (auto-confirmed)
- If user already exists, updates password
- Returns `userId`
- Rate limited to prevent abuse

### 2. Modify `src/pages/Onboarding.tsx`
- Add password field to Step 1 form (below shipping address)
- Update `handleStep1Submit` to call `create-trial-account`, sign in with password, then skip directly to Google step
- Remove the `"otp"` view state and all OTP-related UI/logic
- Update `ONBOARDING_STEPS` from `["Your info", "Verify email", "Connect Google", "Finish"]` to `["Your info", "Connect Google", "Finish"]`
- Update step number mapping (3 steps instead of 4)
- Remove `handleVerifyOtp`, `handleResendOtp`, OTP state variables, and the OTP card UI

### 3. Unblock `signInWithPassword` in auth guard
The page-level auth guard in `Onboarding.tsx` (lines 222-245) blocks `signUp` and OTP methods but `signInWithPassword` is not blocked — no change needed there.

### Files
- **New**: `supabase/functions/create-trial-account/index.ts`
- **Modified**: `src/pages/Onboarding.tsx`

