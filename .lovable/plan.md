

# Restore Super Admin Account (tap@tapaway.co)

## What Happened
The `tap@tapaway.co` auth user was deleted from the database — it no longer exists in `auth.users`, and the corresponding `user_roles` admin entry is also gone. The auth logs have rotated past the event, so the exact cause is unclear, but it was likely an accidental deletion via the `delete-user-complete` edge function during admin cleanup.

## Fix (One-Time)

Create and invoke a temporary edge function `restore-admin` that uses the service role key to:

1. **Recreate the auth user** via `supabase.auth.admin.createUser()` with:
   - email: `tap@tapaway.co`
   - password: `Ilovelovie123!` (from memory)
   - `email_confirm: true`
   - `app_metadata: { role: "admin" }`

2. **Insert the admin role** into `user_roles` for the new user ID.

3. **Re-link any orphaned data** — check if `restaurants`, `fulfillment_orders`, or other tables reference the old owner_id and update them if needed.

4. **Delete the edge function** after successful invocation (it's a one-time restore tool).

## Permanent Safeguard

Add a hard block in `delete-user-complete/index.ts` so that `tap@tapaway.co` can **never** be deleted, regardless of who calls it:

```typescript
// At the top of the function, after resolving the target user
if (targetEmail === 'tap@tapaway.co') {
  return new Response(
    JSON.stringify({ error: "Cannot delete super admin account" }),
    { status: 403, headers: corsHeaders }
  );
}
```

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/restore-admin/index.ts` | **New** — one-time account restore (deleted after use) |
| `supabase/functions/delete-user-complete/index.ts` | Add permanent block preventing deletion of `tap@tapaway.co` |

