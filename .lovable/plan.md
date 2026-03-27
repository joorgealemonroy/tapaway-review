

# Redirect All `/personal/*` Routes to Business Equivalents

## Context
TapAway is returning to its B2B roots — NFC cards for businesses. The `/personal` namespace should not be directly accessible. The "Personal Dashboard" is now "Business Lite" (small business), and the restaurant dashboard is "Business Plus". No user should land on any `/personal/*` URL.

## Strategy
Rather than deleting all the personal infrastructure (which existing "Business Lite" users still use), we redirect all `/personal/*` routes to their business equivalents, and ensure no navigation or auth logic sends users to `/personal/*` paths.

## Changes

### 1. `src/App.tsx` — Redirect `/personal` routes
- `/personal` → `/` (landing page)
- `/personal/pricing` → `/`
- `/personal/signup` → `/start` or `/`
- `/personal/signup/complete` → `/`
- `/personal/vibe` → `/`
- `/personal/order` → `/`
- `/personal/dashboard` → `/dashboard` (the unified dashboard will handle routing internally)
- Remove lazy imports for `PersonalSignup`, `VibeSelection`, `PersonalPricing`, `PersonalSignupComplete`
- Keep `PersonalDashboard` import but serve it from `/dashboard` path (via existing dashboard selector logic)

### 2. `src/hooks/useAuth.tsx` — Fix auth redirect
- Change `navigate("/personal/dashboard")` to `navigate("/dashboard")` for personal-profile-only users

### 3. `src/pages/Auth.tsx` — Fix post-login redirect
- Change `"/personal/dashboard"` return to `"/dashboard"`

### 4. `src/pages/PaywallGuard.tsx` — Fix redirect
- Change `navigate("/personal/dashboard")` to `navigate("/dashboard")`

### 5. `src/components/dashboard/DashboardSwitcher.tsx` — Fix switcher target
- Change `/personal/dashboard` to `/dashboard` (the dashboard route should handle showing the right dashboard type)

### 6. `src/pages/personal/PersonalSignup.tsx` — Fix redirect
- Change `navigate("/personal/dashboard")` to `navigate("/dashboard")`

### 7. `src/pages/personal/PersonalSignupComplete.tsx` — Fix all redirects
- Replace all `/personal/dashboard` references with `/dashboard`
- Replace `/auth?redirect=/personal/dashboard` with `/auth?redirect=/dashboard`

### 8. `src/pages/CardResolver.tsx` — Fix card activation redirect
- Change `/personal/dashboard?tab=cards&welcome=true` to `/dashboard?tab=cards&welcome=true`

### 9. `src/pages/admin/AdminPersonalAccounts.tsx` — Fix admin view link
- Change `/personal/dashboard?admin_view=` to `/dashboard?admin_view=`

### 10. `src/lib/subscriptionStatus.ts` — Update allowed paths
- Change `'/personal/dashboard'` to `'/dashboard'` in the paths list

### 11. Edge functions (lower priority, cosmetic)
- `stripe-webhook/index.ts`, `create-connect-account-link/index.ts`, `create-personal-upgrade/index.ts`, `manage-personal-subscription/index.ts` — update `/personal/dashboard` URLs to `/dashboard`

### 12. `src/pages/DashboardSelector.tsx` — Route to `/dashboard` for both types
- Ensure the dashboard selector sends Business Lite users to `/dashboard` instead of `/personal/dashboard`

## What stays
- The `PersonalDashboard` component itself stays (it's the Business Lite dashboard)
- The `/:slug` resolver stays (public profile pages still work)
- `/u/:username` legacy redirect stays
- Admin `/admin/personal-accounts` stays (internal tool)

## Files affected
| File | Change |
|------|--------|
| `src/App.tsx` | Replace personal routes with redirects to `/` or `/dashboard` |
| `src/hooks/useAuth.tsx` | Redirect to `/dashboard` |
| `src/pages/Auth.tsx` | Redirect to `/dashboard` |
| `src/pages/PaywallGuard.tsx` | Redirect to `/dashboard` |
| `src/components/dashboard/DashboardSwitcher.tsx` | Fix switch target |
| `src/pages/personal/PersonalSignup.tsx` | Fix redirect |
| `src/pages/personal/PersonalSignupComplete.tsx` | Fix all redirects |
| `src/pages/CardResolver.tsx` | Fix redirect |
| `src/pages/admin/AdminPersonalAccounts.tsx` | Fix admin link |
| `src/lib/subscriptionStatus.ts` | Update path list |
| `src/pages/DashboardSelector.tsx` | Fix routing |
| 4 edge functions | Update URLs |

