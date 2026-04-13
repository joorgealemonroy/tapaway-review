

# Fix Onboarding: Logo Upload, OAuth Flow, and Plan Specificity

## Changes

### 1. Logo Upload → Base64 Deferred Upload
**File: `src/pages/Onboarding.tsx`**

Replace `handleLogoUpload` (lines 195-212). Instead of uploading to Supabase immediately, convert the file to a Base64 data URL, store it in state (`logoUrl` as data URL) and save to `localStorage` via `saveOnboardingData({ logoUrl: base64String })`. Show the preview using the Base64 string directly.

In `completeSetup` (line 331+), after the user is authenticated, check if `savedLogoUrl` starts with `data:`. If so, convert it back to a `Blob`, upload to the `restaurant-logos` bucket as an authenticated user, then use the resulting public URL for the restaurant record. No storage policy changes needed.

### 2. Post-OAuth Loading Screen
**File: `src/pages/Onboarding.tsx`**

Add `isCompletingSetup` state (default `false`). In the `completeSetup` effect (line 329), set `isCompletingSetup = true` at the top before any async work when we detect a session + saved business name + no `session_id`.

In the render section (line 482), add a check: if `isCompletingSetup` is true, show a full-screen loading state with "Setting up your account..." text. This prevents the user from seeing Step 1 flash after OAuth return.

### 3. Google OAuth
No code changes needed — the `lovable.auth.signInWithOAuth("google")` call is correct. Fix #2 handles the post-return UX.

### 4. $39 Plan Business Type Question
**File: `src/pages/Onboarding.tsx`**

Add `dashboardType` state: `"restaurant" | "personal" | null`.

In Step 1 UI (line 534), after the Venue Pack card is selected, show an inline follow-up:
- **"What best describes your business?"**
  - "Restaurant, Bar, or Cafe" → `setDashboardType("restaurant")`
  - "Barbershop, Salon, or Service" → `setDashboardType("personal")`

The Solo Pro plan auto-sets `dashboardType = "personal"`.

Save `dashboardType` to `localStorage` via `saveOnboardingData`.

In `completeSetup`: if `dashboardType === "personal"`, create a `personal_profiles` record (Business Lite with 15 cards for venue, 3 for solo) instead of a `restaurants` record. If `dashboardType === "restaurant"`, create a `restaurants` record (current behavior).

Update `OnboardingData` interface in `src/lib/onboardingData.ts` to include `dashboardType?: string`.

### 5. Stripe Metadata
**File: `supabase/functions/create-checkout-session/index.ts`**

Accept `dashboardType` in the request body. Pass it through in the Stripe session `metadata` so `verify-checkout` can use it post-payment.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Onboarding.tsx` | Base64 logo, loading screen, business type question, dashboard routing |
| `src/lib/onboardingData.ts` | Add `dashboardType` to interface |
| `supabase/functions/create-checkout-session/index.ts` | Pass `dashboardType` in metadata |

