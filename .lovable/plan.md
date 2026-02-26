

# Add Google & Apple OAuth to Login Page

## Verification of Signup OAuth

The signup page (`/personal/signup`) already has working Google and Apple OAuth buttons. The `IdentityStep` correctly:
- Shows OAuth buttons at the top with a divider
- Detects OAuth session on return and pre-fills name/email
- Hides password field for OAuth users
- `CheckoutStep` skips OTP for `isOAuthUser` via `createProfileDirectly()`

The console logs show "Sign in was cancelled" errors which are expected — those fire when the OAuth popup is closed without completing (normal behavior during testing in the preview iframe).

## Plan: Add OAuth to Auth.tsx Login Page

### Changes to `src/pages/Auth.tsx`

Add Google and Apple OAuth buttons to the **standard login form** (mode === `"login"`), placed between the title and the email/password fields:

1. **Import** `lovable` from `@/integrations/lovable/index` and add `Loader2` (already imported)
2. **Add state**: `oauthLoading` boolean
3. **Add `handleOAuth` function** — same pattern as `IdentityStep`:
   ```typescript
   const handleOAuth = async (provider: "google" | "apple") => {
     setOauthLoading(true);
     try {
       const { error } = await lovable.auth.signInWithOAuth(provider, {
         redirect_uri: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectTo)}`,
       });
       if (error) {
         setError("Sign-in failed. Please try again.");
       }
     } catch {
       setError("Sign-in failed. Please try again.");
     } finally {
       setOauthLoading(false);
     }
   };
   ```
4. **Add `useEffect` to detect OAuth return** — On mount, check `supabase.auth.getUser()`. If a session exists and user arrived via OAuth (not post-checkout mode), run `determineRedirectDestination()` and navigate immediately. This handles the case where a user taps "Continue with Google", authenticates, and returns to `/auth`.
5. **Render OAuth buttons** inside the `mode === "login"` form block, before the email field:
   - "Continue with Google" button (outlined, full-width, Google SVG icon)
   - "Continue with Apple" button (black bg, full-width, Apple SVG icon)
   - Divider: "or sign in with email"

6. **Only show OAuth in standard login mode** — Not in `post-checkout-signup`, `post-checkout-login`, or `forgot` modes (those have specific email-locked flows).

### UI Layout (login mode only)
```text
┌──────────────────────────────┐
│         Welcome back         │
│  Log in to your TapAway...   │
├──────────────────────────────┤
│  [G] Continue with Google    │
│  [] Continue with Apple     │
│      ── or sign in with email ──
├──────────────────────────────┤
│  Email        [you@...]      │
│  Password     [••••••••]     │
│  □ Remember me  Forgot pw?   │
│  [        Sign in          ] │
│  [    Create an account    ] │
└──────────────────────────────┘
```

### Redirect Preservation
The `redirect_uri` includes the current `redirect` query param so that after OAuth completes, the user lands back on `/auth?redirect=...` and the `useEffect` auto-redirects them to the correct destination (admin, rep, personal dashboard, etc.) using the existing `determineRedirectDestination()` logic.

## Files Modified
- `src/pages/Auth.tsx` — Add OAuth buttons, session detection on mount, and auto-redirect for OAuth returns

