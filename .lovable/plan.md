## Root cause (confirmed)

`oxydgo@gmail.com`'s `rep_applications` row has `status = 'approved'` (reviewed 2026-07-19 06:50), but:
- No row in `auth.users` for that email
- No row in `sales_reps` for that email
- No edge-function logs for `approve-rep-application`

So the app row was flipped to `approved` without the edge function ever succeeding (either an earlier manual/legacy flip, or an old error path). The current edge function then guards at:

```ts
if (application.status !== "pending") {
  throw new Error("Application has already been processed");
}
```

…so clicking Approve again does nothing. The AdminReps UI correctly shows "No rep account" (line 373 of `src/pages/admin/AdminReps.tsx`), but there's no way to recover.

## Fix

### 1. `supabase/functions/approve-rep-application/index.ts` — make it idempotent

Replace the strict `status !== 'pending'` guard with a guard based on **whether a sales_rep already exists** for that email:

- Look up an existing `sales_reps` row by `lower(email)`.
- If one already exists AND `is_active = true` → return early with `{ success: true, alreadyProvisioned: true }`.
- Otherwise proceed with the existing flow (create/find auth user, insert `sales_reps`, insert `user_roles`, upsert setup token, send welcome email, set status = `approved`).

Everything after that guard already uses "check-then-insert" for auth user, sales_reps row, and user_roles, and it deletes old setup tokens before inserting a new one — so a re-run is safe.

### 2. `src/pages/admin/AdminReps.tsx` — add a "Provision account" action

In the approved-but-no-rep branch (currently just static text `"No rep account"` at line 374), render an inline **Provision account** button that calls the same `approve-rep-application` edge function with the application id, then refreshes both `applications` and `reps` lists (same refresh block already in `handleApprove`). Reuse `handleApprove`'s logic — extract a small helper so both entry points share it.

### 3. Immediate recovery for oxydgo@gmail.com

Once (1) and (2) ship, Admin opens `/admin/reps`, finds Oxydgo's row (Approved, "No rep account"), clicks **Provision account**. That will:
- Create the auth user
- Insert the `sales_reps` row + `sales_rep` role
- Generate a fresh 7-day setup token
- Email the setup-password link

No manual DB edits required.

## Technical notes

- The status guard change is the only behavior change to the edge function; success payload stays compatible.
- Keep the `application.status !== 'pending'` case out of the error path — return success with a flag so the UI toast can say "already provisioned" vs "approved" if we want to distinguish later.
- No schema/RLS changes.
- No changes to `handleReject` or the pending-application Approve flow.
