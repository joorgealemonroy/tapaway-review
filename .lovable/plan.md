## Problem

When you open `/dashboard` as admin, you land on **Personal Accounts** (`/admin/personal-accounts`) instead of the **Admin Overview** (`/admin`).

Verified cause: `src/pages/Dashboard.tsx` renders the Business Lite dashboard for admins, and `src/pages/personal/PersonalDashboard.tsx` (line 214) explicitly redirects any admin arriving at `/dashboard` without an impersonation target to `/admin/personal-accounts`. That was the old admin entry point before the new Overview page existed.

## Fix

1. In `src/pages/personal/PersonalDashboard.tsx`, change the no-impersonation admin redirect from `/admin/personal-accounts` to `/admin` (Overview), keeping the `?profile_id=` → `?admin_view_personal=` rewrite behavior unchanged so impersonation still works.
2. Leave the "Profile not found" fallback (line 234) pointing at the accounts list — that one is correct, since it happens while browsing a specific hub.
3. Leave `AdminViewBanner` "back" links pointing at `/admin/personal-accounts` so exiting an impersonated hub returns to the list you came from.

## Notes

No database or business-logic changes; this is routing only. After the change, `/dashboard` as admin lands on the Overview with the stats cards and Quick Access panel.
