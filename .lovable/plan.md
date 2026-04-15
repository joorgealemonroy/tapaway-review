

# Remove Dashboard Switcher & Selector — Enforce Account Exclusivity

## Summary

Delete `DashboardSwitcher` and `DashboardSelector`, and fix all references so users always route to `/dashboard` (where existing `plan_type` logic handles Lite vs Business).

## Changes

| File | Change |
|------|--------|
| `src/components/dashboard/DashboardSwitcher.tsx` | **Delete** |
| `src/pages/DashboardSelector.tsx` | **Delete** |
| `src/App.tsx` | Remove `DashboardSelector` import + `/select-dashboard` route |
| `src/pages/Auth.tsx` | Line 240: change `"/select-dashboard"` → `"/dashboard"` |
| `src/components/landing/DesktopNav.tsx` | Line 19: change `"/select-dashboard"` → `"/dashboard"` |
| `src/components/landing/MobileNav.tsx` | Line 25: change `"/select-dashboard"` → `"/dashboard"` |
| `src/components/dashboard/DashboardHeader.tsx` | Remove `DashboardSwitcher` import + usage (line 3, 31) |
| `src/pages/Dashboard.tsx` | Remove `DashboardSwitcher` import + usage (line 22, 499) |
| `src/pages/personal/PersonalDashboard.tsx` | Remove `DashboardSwitcher` import + usage (line 31, 592) |

## Routing After Login

All paths now go to `/dashboard`. The existing logic in `Dashboard.tsx` checks `plan_type` and renders the correct dashboard (Lite for `solo`, Business for `venue`). No selector needed.

