## Root cause

Rep-created demos live in `personal_profiles` with `user_id` = the rep's own auth user id. When an admin deletes such a demo:

1. `AdminBusinessLiteTable.handleDelete` removes the profile row.
2. It counts remaining profiles for that `user_id`. For a rep with only one demo → 0.
3. Calls `delete-user-complete` with `{ userId: rep.id, isPersonalAccount: true }`.
4. That function calls `auth.admin.deleteUser(rep.id)` — wiping the rep's auth user.
5. `sales_reps.id` FKs `auth.users(id) ON DELETE CASCADE`, so the rep row disappears too. The application row stays `approved` but the UI shows "No rep account".

That is exactly what killed Diego's account, and any other rep whose demo count drops to zero is one delete away from the same fate.

## Three-layer fix

### 1. Server guards in `supabase/functions/delete-user-complete/index.ts`
Add a shared helper `isProtectedRepOrAdmin(userId)` that checks `public.sales_reps` and `public.user_roles.role='admin'`. Before any `auth.admin.deleteUser(...)` call — in all three branches (`deleteAuthUserOnly`, `isPersonalAccount`, restaurant owner cleanup) — call the helper. If protected, skip the auth-user deletion and return `{ success: true, preserved: 'sales_rep' | 'admin' }`. The profile / restaurant row is still removed; only the auth user survives.

Add a new opt-in branch: when the request body contains `deleteSalesRepAccount: true`, allow deleting the rep's `sales_reps` row + auth user. This is the ONLY code path that can remove a rep.

### 2. Client bypass in `src/components/admin/AdminBusinessLiteTable.tsx`
In `handleDelete`, if `deletingAccount.sales_rep_id || deletingAccount.created_by_rep_id` is set, skip the `delete-user-complete` call entirely — the profile row and children are already removed and no auth cleanup is needed.

### 3. Revoke vs Delete separation in `src/pages/admin/AdminReps.tsx`
Keep the current **Revoke** / **Reactivate** buttons (`is_active` toggle only — never touches auth).
Add a new destructive **Delete rep permanently** button behind a typed-confirmation dialog that calls `delete-user-complete` with `{ userId: rep.id, deleteSalesRepAccount: true }`. This is the single sanctioned path to remove a rep entirely.

## Data recovery for Diego
Re-link his two orphaned demos (`c9759931-…` demo-rjcutj, `c419db63-…` demo-dk8kc4) so `user_id`, `sales_rep_id`, `created_by_rep_id` all point to his new auth id `05a4c94b-aa80-4183-8e01-0f7e80ee5433`. Approved by the user — will run as an UPDATE.

## Files touched
- `supabase/functions/delete-user-complete/index.ts` (guards + new `deleteSalesRepAccount` branch)
- `src/components/admin/AdminBusinessLiteTable.tsx` (skip auth deletion for rep demos)
- `src/pages/admin/AdminReps.tsx` (add Delete-permanently action with typed-confirm dialog)
- Data update on `personal_profiles` for Diego's two demos
