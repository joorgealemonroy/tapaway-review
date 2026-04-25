## Problem

When deleting test restaurants (created with `+#` email aliases), the admin panel shows the warning:

> "Restaurant deleted but could not remove auth user"

### Root cause

Edge function logs show the actual error is:

```
AuthApiError: User not found (status 404, code user_not_found)
```

The restaurant's `owner_id` points to an auth user that no longer exists (already deleted in a previous run, or the row was orphaned). The current code treats *any* `deleteUser` error as a warning, including the harmless "already gone" case — so admins see a scary message even though everything worked correctly.

A secondary contributor: when several test restaurants were seeded sharing one auth user, deleting the second one finds the auth user already gone from the first delete.

## Fix

Update `supabase/functions/delete-user-complete/index.ts` so that a `user_not_found` (404) response from `auth.admin.deleteUser` is treated as **success**, not a warning. Keep the warning behavior only for genuine failures.

### Specific changes

1. **Restaurant deletion path** (around line 246): after `deleteUser`, check `deleteUserError.status === 404` or `code === 'user_not_found'`. If so, log "auth user already removed" and return `{ success: true }` with no warning.

2. **Personal account deletion path** (around line 145): same treatment.

3. **Orphan auth user path** (around line 97): same — 404 means the orphan is already gone, return success.

4. Pre-check (optional, cleaner): before attempting `deleteUser`, call `auth.admin.getUserById(ownerId)`. If it returns no user, skip the delete entirely and return success. This avoids the error log noise.

### Optional cleanup

Add a one-time admin utility (or just a SQL note for the user) to identify orphan auth users left over from prior failed deletions — but only if the user wants this; not required for the fix.

## Files to change

- `supabase/functions/delete-user-complete/index.ts` — three small edits to handle 404 as success.

No DB migrations, no schema changes, no new endpoints.
