

# Fix: Reborn Wraps Shows Wrong Dashboard (Business Plus Instead of Business Lite)

## Problem
The admin view link for personal accounts (`/dashboard?admin_view=ID`) loads the Business Plus (restaurant) dashboard because `Dashboard.tsx` always queries the `restaurants` table for `admin_view`. Personal accounts like Reborn Wraps exist in `personal_profiles`, not `restaurants`, so they get a "Restaurant not found" error or the wrong UI.

Additionally, the `?type=lite` redirect for regular personal-only users is broken — `Dashboard.tsx` never consumes this param to render `PersonalDashboard`.

## Solution

### 1. `src/pages/Dashboard.tsx` — Conditionally render PersonalDashboard

At the top of the component, check for two conditions that should render the Business Lite (personal) dashboard:
- `?type=lite` search param (regular personal-only users)
- `?admin_view_personal=<profile_id>` search param (admin impersonation of personal accounts)

If either is present, import and render `PersonalDashboard` directly, passing through the search params. This avoids the restaurant query entirely.

### 2. `src/pages/admin/AdminPersonalAccounts.tsx` — Fix admin view link

Change the navigation from:
```
/dashboard?admin_view=${account.id}
```
to:
```
/dashboard?admin_view_personal=${account.id}
```

This ensures `Dashboard.tsx` knows to render the personal dashboard with admin impersonation.

### 3. `src/pages/personal/PersonalDashboard.tsx` — Support `admin_view_personal` param

Update the admin view detection to also check for `admin_view_personal` search param (in addition to existing `admin_view`), so both param names work.

## Files modified
1. `src/pages/Dashboard.tsx` — detect `type=lite` and `admin_view_personal`, render PersonalDashboard
2. `src/pages/admin/AdminPersonalAccounts.tsx` — change admin view link param name
3. `src/pages/personal/PersonalDashboard.tsx` — support `admin_view_personal` param

