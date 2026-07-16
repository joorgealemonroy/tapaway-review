## Unify Access Controls on the Applications Tab

Add the same access-control shortcuts (View as Rep, Revoke / Reactivate, Resend Invite) directly on the **Applications** tab whenever an application already has a matching `sales_reps` account. No database changes.

### What changes in `src/pages/admin/AdminReps.tsx`

1. **Match applications to reps by email.** Build a `repByEmail` map from the already-loaded `reps` array (case-insensitive). No extra query needed.
2. **Update the row's Actions cell** in the Applications table:
   - `status === 'pending'` → keep current **Approve / Reject** buttons (unchanged).
   - `status === 'approved'` **and** a matching rep exists → render the same action cluster used on the Active Reps tab:
     - `View as Rep` → navigates to `/rep?admin_view_rep=<rep.id>`
     - `Revoke` (if `rep.is_active`) or `Reactivate` (if not) → calls existing `handleToggleActive(rep.id, ...)`
     - `Resend Invite` (only when `!rep.agreement_accepted`) → calls existing `handleResendInvite(rep.id, rep.email)`
   - `status === 'approved'` but no rep row found (rare/edge case) → show a small muted "No rep account" hint so it's visible instead of blank.
   - `status === 'rejected'` → leave empty (no change).
3. **Reflect revoked state on the row.** When the matched rep exists and `is_active === false`, apply `opacity-50` to the row and swap the status badge to a neutral `Revoked` badge (mirrors Active Reps styling) so admins instantly see access state without switching tabs.
4. **Confirmation dialog for Revoke/Reactivate.** The Active Reps tab currently uses a plain `handleToggleActive` call; wrap both entry points (Applications and Active Reps) in a shared `AlertDialog` confirmation so accidental clicks don't nuke access. Single shared dialog state in the component — no new files.

### Out of scope

- No schema changes; RLS already allows admin management.
- No changes to Active Reps behavior other than the shared confirm dialog.
- No changes to approve/reject flow itself.

### Files touched

- `src/pages/admin/AdminReps.tsx` (only)

### Technical notes

- Matching uses `email.trim().toLowerCase()` on both sides to avoid case mismatches from Supabase Auth.
- The action cluster is extracted into a small in-file helper (`renderRepAccessActions(rep)`) so Applications and Active Reps render the identical buttons and stay in sync.
- The `AlertDialog` uses shadcn's existing component; state shape: `{ rep: SalesRep; next: boolean } | null`.