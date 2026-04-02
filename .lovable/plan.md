

# Fix Dashboard Routing & Add Account Type Selection in Admin

## Problem

There are two interrelated issues:

1. **Dashboard routing**: When a personal-only user (like Reborn Wraps) hits `/dashboard`, the `DashboardBusiness` component runs, queries the `restaurants` table, finds nothing, and then does a late redirect to `/dashboard?type=lite`. This causes a flash of the wrong dashboard. The same issue affects admin impersonation — `admin_view` always queries restaurants.

2. **Admin account creation**: The admin create modal only creates Small Business (personal_profiles) accounts. There's no option to create a Bigger Business (restaurant) account from the same flow.

## Solution

### Part 1: Fix Dashboard routing for personal-only users

**`src/pages/Dashboard.tsx`** — Change the `DashboardBusiness` component's `fetchRestaurant` logic. Instead of querying restaurants first and only falling back to personal profiles at line 383, **check for personal profile in parallel with restaurants** at the start. If user has only a personal profile (no completed restaurant), immediately redirect to `?type=lite` before any Business Plus UI renders.

Better yet: move the personal-profile check **into the top-level `Dashboard` wrapper** (lines 52-68). Before rendering `DashboardBusiness`, check if the user has a restaurant at all. If not, render `PersonalDashboard` directly — no redirect needed.

**`src/hooks/useAuth.tsx`** — When a personal-only user signs in (line 124), navigate to `/dashboard?type=lite` instead of `/dashboard` so the lite view loads immediately.

**`src/pages/DashboardSelector.tsx`** — When user clicks "Small Business Dashboard" (line 107), navigate to `/dashboard?type=lite` instead of `/dashboard`.

**`src/components/dashboard/DashboardSwitcher.tsx`** — When switching from Business to Small Business, navigate to `/dashboard?type=lite`. When switching from Small Business to Business, navigate to `/dashboard` (no param).

**`src/pages/PaywallGuard.tsx`** — When redirecting personal users away from paywall (line 78), use `/dashboard?type=lite`.

### Part 2: Add "Bigger Business" option to admin create modal

**`src/pages/admin/AdminPersonalAccounts.tsx`** — Add an "Account Type" selector at the top of the create form with two options: "Small Business" (personal_profiles) and "Bigger Business" (restaurants). When "Bigger Business" is selected, show a simplified form (business name, email, password) and call `create-legacy-client-account` instead of `create-personal-account`. Update the page title/description to be account-type-aware.

**`src/pages/Admin.tsx`** — The existing legacy client creation form on the main admin page can remain as-is for backward compatibility.

## Files modified
1. `src/pages/Dashboard.tsx` — Early personal-profile detection in wrapper
2. `src/hooks/useAuth.tsx` — Route personal-only users to `?type=lite`
3. `src/pages/DashboardSelector.tsx` — Small Business button uses `?type=lite`
4. `src/components/dashboard/DashboardSwitcher.tsx` — Correct switch targets
5. `src/pages/PaywallGuard.tsx` — Personal redirect uses `?type=lite`
6. `src/pages/admin/AdminPersonalAccounts.tsx` — Add account type toggle in create modal

