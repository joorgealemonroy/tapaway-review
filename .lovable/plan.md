

# Admin "View as User" — Impersonation Mode

## Overview

Add an "impersonate" capability so admins can view any user's dashboard exactly as the user sees it — without logging in as them. This works by passing a query param that tells the dashboard to load a specific profile/restaurant instead of the logged-in user's data.

## Approach

Use a `?admin_view=PROFILE_ID` query parameter on `/personal/dashboard` (and `?admin_view=RESTAURANT_ID` on `/dashboard`). When the admin navigates there, the dashboard detects the param, verifies the user is an admin, and loads that account's data instead.

A prominent banner at the top warns "You are viewing as [username]" with a button to exit back to admin.

## Changes

### 1. `src/pages/personal/PersonalDashboard.tsx` — Personal impersonation

- Read `admin_view` search param (profile ID)
- If present, call `supabase.rpc('is_admin')` to verify admin status
- If admin, load profile + links + blocks by profile ID instead of `auth.getUser().id`
- Store an `isAdminView` flag in state
- Show a sticky banner: "Viewing as @username — [Back to Admin]"
- Disable destructive actions (delete account, billing) in admin view mode
- Skip auth redirect when in admin view

### 2. `src/pages/Dashboard.tsx` — Business impersonation

- Read `admin_view` search param (restaurant ID)
- If present and user is admin, load that restaurant directly by ID
- Show same admin view banner
- Skip auth/paywall redirects in admin view

### 3. `src/pages/admin/AdminPersonalAccounts.tsx` — Add "View Dashboard" button

- Next to the existing edit/view buttons for each account, add an Eye icon button
- On click: `navigate(`/personal/dashboard?admin_view=${account.id}`)`

### 4. `src/pages/Admin.tsx` — Add "View Dashboard" button for restaurants

- In the restaurant list/edit area, add a button to navigate to `/dashboard?admin_view=${restaurant.id}`

### 5. Admin View Banner Component (new) — `src/components/admin/AdminViewBanner.tsx`

Simple reusable banner:
```tsx
// Sticky top bar with yellow/amber background
// "👁 Viewing as [name] — Exit"
// Exit navigates back to the admin page
```

### RLS Consideration

The admin already has super-admin RLS policies (`auth.email() = 'tap@tapaway.co'`) on all public tables, so reading another user's `personal_profiles`, `personal_links`, `personal_blocks`, and `restaurants` data will work without any DB changes.

### Files

| File | Change |
|------|--------|
| `src/components/admin/AdminViewBanner.tsx` | New — reusable impersonation banner |
| `src/pages/personal/PersonalDashboard.tsx` | Add admin_view param handling, load by profile ID |
| `src/pages/Dashboard.tsx` | Add admin_view param handling, load by restaurant ID |
| `src/pages/admin/AdminPersonalAccounts.tsx` | Add "View Dashboard" button per account |
| `src/pages/Admin.tsx` | Add "View Dashboard" button per restaurant |

