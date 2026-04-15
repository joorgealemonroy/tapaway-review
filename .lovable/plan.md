

# Add Email Sign-Up Option to B2B Onboarding

## Summary
Add a "Continue with Email" option below the Google/Apple OAuth buttons. The email flow creates the user server-side using the Service Role key (bypassing email confirmation), then proceeds through the same setup pipeline (restaurant creation, magic onboarding, Stripe checkout). After checkout, a magic link email is sent so the user can set a real password later.

## Architecture

```text
User clicks "or continue with email"
  → enters email → clicks "Start My Free Trial"
  → POST /create-email-signup (new edge function)
     ├── Creates user via admin.createUser (auto-confirmed)
     ├── Generates a session via admin.generateLink
     └── Returns { access_token, refresh_token }
  → Client sets session via supabase.auth.setSession()
  → Existing completeSetup useEffect fires
     ├── Creates restaurant record
     ├── Runs magic-onboarding (if Solo Pro)
     ├── Redirects to Stripe checkout
  → After Stripe return, send magic link email for password setup
```

## Changes

### 1. New Edge Function: `create-email-signup`

**File:** `supabase/functions/create-email-signup/index.ts`

- Accepts `{ email, businessName }` (no JWT required — public endpoint)
- Rate-limited (5 requests per IP per hour)
- Uses Service Role `supabase.auth.admin.createUser({ email, email_confirm: true, password: crypto.randomUUID() })` — this auto-confirms the email so the user is never blocked
- If user already exists, falls back to `signInWithPassword` error message prompting login
- Generates a session using `admin.generateLink({ type: 'magiclink', email })` — extracts the token, then uses it to get a valid session
- Actually: simpler approach — after `createUser`, call `supabase.auth.admin.generateLink({ type: 'signup', email })` to get a confirmation link token, then return it for the client to exchange. **Or even simpler**: since `email_confirm: true` is set, the function returns the user ID and a sign-in link
- **Simplest reliable approach**: Create user with `admin.createUser({ email, email_confirm: true, password })` where password is a random UUID. Return `{ userId, tempPassword }` so the client can immediately `signInWithPassword({ email, password: tempPassword })` to get a session. The temp password is single-use effectively since the magic link email will prompt them to set a real one.

### 2. Frontend: `Onboarding.tsx`

**New state:**
- `showEmailInput` (boolean)
- `emailSignupAddress` (string)
- `emailSubmitting` (boolean)

**UI addition** (after the Apple button, before the Back button):
- A smaller "or continue with email" text link with Mail icon
- When clicked, reveals an email input + "Start My Free Trial" button with fade-in animation

**`handleEmailSignup` function:**
1. Validate email format
2. Save onboarding data (same as `handleOAuth`)
3. Call `create-email-signup` edge function
4. Use returned credentials to `supabase.auth.signInWithPassword()` — this sets the session
5. The existing `completeSetup` useEffect handles the rest (restaurant, magic onboarding, Stripe)
6. Note: the `signInWithPassword` call goes through the normal Supabase client (not blocked by auth guard since `signInWithPassword` is not in the blocked list)

**Post-Stripe magic link:** After checkout verification succeeds (around line 155), call `send-magic-link-email` to send the user a password setup link if they signed up via email (detect by checking if `session.user.app_metadata.provider === 'email'`).

### 3. Config

- Add `[functions.create-email-signup]` with `verify_jwt = false` to `supabase/config.toml`

## Files Changed/Created

| File | Action |
|------|--------|
| `supabase/functions/create-email-signup/index.ts` | Create |
| `supabase/config.toml` | Add function config |
| `src/pages/Onboarding.tsx` | Add email UI + handler + post-checkout magic link |

## Security Notes
- The edge function uses the Service Role key server-side only — never exposed to client
- Rate limiting prevents abuse of account creation
- The temp password is a cryptographically random UUID — effectively unguessable
- Magic link email sent post-checkout ensures the user sets a real password
- `email_confirm: true` in `createUser` bypasses confirmation requirement per the user's explicit request

