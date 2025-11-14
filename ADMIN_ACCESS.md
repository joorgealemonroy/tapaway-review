# Admin Access Documentation

## Overview

This document explains how admin access is controlled in the TapAway dashboard and how to manage admin users.

## How Admin Access is Determined

Admin access is checked using the `useAdminAccess` hook, which evaluates two conditions:

1. **Email-based access**: If the user's email is in the `ADMIN_EMAILS` array
2. **Metadata-based access**: If the user's `app_metadata.role` is set to `"admin"`

```typescript
const ADMIN_EMAILS = ["tap@tapaway.co"];

const isAdminUser =
  ADMIN_EMAILS.includes(user.email ?? "") ||
  user.app_metadata?.role === "admin";
```

## Current Admins

- `tap@tapaway.co` (hardcoded in ADMIN_EMAILS)

## Adding New Admins

There are two ways to grant admin access:

### Method 1: Add Email to ADMIN_EMAILS (Simplest)

1. Open `src/hooks/useAdminAccess.tsx`
2. Add the new admin email to the `ADMIN_EMAILS` array:
   ```typescript
   const ADMIN_EMAILS = ["tap@tapaway.co", "newemail@example.com"];
   ```
3. Commit and deploy the change

### Method 2: Set app_metadata in Supabase (More Scalable)

1. Open Supabase SQL Editor (or use the Supabase dashboard)
2. Run this query to make a user an admin:
   ```sql
   UPDATE auth.users
   SET raw_app_meta_data = 
     jsonb_set(
       COALESCE(raw_app_meta_data, '{}'::jsonb),
       '{role}',
       '"admin"'
     )
   WHERE email = 'newemail@example.com';
   ```
3. The user will have admin access on their next login

## Admin Portal Features

When logged in as an admin, users can access the `/admin` route which includes:

- **Global Metrics**: View aggregate analytics across all restaurants
- **All Clients**: Browse and search all restaurant accounts
- **Hub Preflight**: Test and verify review hub configurations before DNS changes

## Access Denied Behavior

When a non-admin user attempts to access `/admin`:

1. They see a clear "Admin Access Required" message
2. A "Return to Dashboard" button redirects them to their normal dashboard
3. No error toast is shown (user-friendly experience)

## Security Notes

- Admin access is checked on every route render via the `useAdminAccess` hook
- The hook uses client-side checks for UX, but all admin-only database operations still require proper RLS policies
- The `ADMIN_EMAILS` array provides a simple, hardcoded fallback for guaranteed access
- The `app_metadata.role` method is more scalable for multiple admins without code changes

## Troubleshooting

### "Stuck on loading spinner"
- Fixed in current implementation - the hook properly handles auth loading states
- If user is not logged in, they're redirected to `/auth`
- If logged in but not admin, they see the "Access Required" page

### "Can't access admin even with correct email"
- Verify the email in `ADMIN_EMAILS` exactly matches the user's login email
- Check that the user is actually logged in (not just on the auth page)
- Clear browser cache and localStorage, then log in again

### "Want to add admin without code deploy"
- Use Method 2 (app_metadata) to add admins directly in Supabase
- This doesn't require a code change or redeploy
