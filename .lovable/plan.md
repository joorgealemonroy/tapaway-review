

# Fix: Reborn Wraps Dashboard Routing

## Problem

The `decide()` function in `Dashboard.tsx` (lines 56-83) runs two parallel queries and routes based on results. However, there are two failure modes:

1. **Race condition / fallback to business**: If the personal_profiles query returns no data (RLS issue, timing), the default fallback at line 77-79 sends the user to `DashboardBusiness`, which then queries restaurants, finds nothing, and either redirects to paywall or onboarding.

2. **DashboardBusiness still has its own personal-profile fallback**: At line 440-449, `DashboardBusiness.fetchRestaurant()` does a late `navigate("/dashboard?type=lite")` redirect — causing a full re-render cycle and potential loops.

3. **PersonalDashboard redirects to `/start` on missing profile** (line 208-211), which goes to `/onboarding` — wrong for a user who already has an account.

## Solution

### 1. `src/pages/Dashboard.tsx` — Strengthen the `decide()` fallback

Change the fallback at line 77-79: instead of defaulting to `"business"` when neither account is found, **default to `"lite"`** for users who have no restaurant. Only route to `"business"` if a restaurant actually exists (completed or not). This prevents personal-only users from ever hitting `DashboardBusiness`.

Also add error handling: if the personal_profiles query errors, retry once before giving up.

### 2. `src/pages/Dashboard.tsx` — Remove the redundant personal-profile check in `DashboardBusiness`

Remove lines 440-449 (the `navigate("/dashboard?type=lite")` fallback inside `fetchRestaurant`). The top-level `decide()` already handles this — having it in both places causes redirect loops and flash of wrong UI.

Replace with a simple redirect to `/paywall` since if a user reaches `DashboardBusiness` without a restaurant, they genuinely need to onboard.

### 3. `src/pages/personal/PersonalDashboard.tsx` — Fix the no-profile redirect

Change line 210 from `navigate("/start")` to `navigate("/paywall")` — a user who has no personal profile shouldn't be sent to business onboarding. They should see the paywall to choose an account type.

## Files modified
1. `src/pages/Dashboard.tsx` — Fix decide() fallback logic, remove redundant personal check in DashboardBusiness
2. `src/pages/personal/PersonalDashboard.tsx` — Fix no-profile redirect destination

