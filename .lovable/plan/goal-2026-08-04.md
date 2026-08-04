## Goal
Make the admin dashboard an effortless command center: fix "(unnamed)" names, allow editing hubs and setting exact trial dates from the print queue, add full sorting to All Accounts, and let every sales-rep row be permanently deleted.

## Verified current state
- Print queue lives at `src/pages/admin/AdminPrintQueue.tsx` (not `PrintQueue.tsx`); it renders `{r.full_name || "(unnamed)"}` and already has a calendar action wired to `ExtendTrialDialog`.
- `ExtendTrialDialog.tsx` only offers +2/+3/+5 presets plus a numeric field — no calendar, and it calls the `admin_extend_trial` RPC (days-based).
- The accounts table is `src/components/admin/AdminUnifiedAccountsTable.tsx`; it already has `sortKey` (`taps | created_at | name`) with asc/desc toggling and falls back to `"(unnamed)"` in two places.
- Reps live in `src/pages/admin/AdminReps.tsx`, reading `rep_applications` and `sales_reps`. The "Delete permanently" button renders only inside `renderRepAccessActions(matchedRep)`, which is reached only for `status === 'approved'` rows with a matched rep, so pending/rejected/unprovisioned rows can't be purged.
- `rep_applications` has SELECT/UPDATE/INSERT policies but **no DELETE policy**, so deleting application rows will fail until a migration adds one.

## 1. Shared display-name helper
Add `src/lib/displayName.ts` exporting `resolveDisplayName({ business_name, full_name, display_name, title, username, slug })`:
- chain: business/full/display name -> title -> humanized slug/username (strip `@`, split on `-`/`_`, title-case each word)
- only returns `"(unnamed)"` when every field is empty.
Use it in `AdminPrintQueue.tsx` and both `"(unnamed)"` sites in `AdminUnifiedAccountsTable.tsx`, and show `@username` as a secondary line under the primary name in the accounts table.

## 2. Print queue: edit hub in place
- Add an "Edit Hub" action per row (pencil button next to the existing actions) opening a new `src/components/admin/EditHubDrawer.tsx` (shadcn `Sheet`).
- Fields: business/full name, username (with the existing approved-username lock respected), profile photo URL upload, social links list, and print/admin notes.
- Saves via `supabase.from('personal_profiles').update(...)` scoped to the row id, then refetches the queue and toasts. Print status is untouched.

## 3. Trial extension calendar
Rework `ExtendTrialDialog.tsx`:
- Two modes sharing one dialog: preset chips `+3 / +5 / +7 / +14` days, and a shadcn `Calendar` date picker for an exact `trial_ends_at` date (past dates disabled).
- Presets compute a concrete target date so the preview always shows the resulting end date.
- Keep the existing `admin_extend_trial` RPC for the preset/day path; for an explicitly picked date, compute the day delta from the current `trial_ends_at` and pass it to the same RPC so no new backend surface is needed.
- Bulk mode keeps day-delta behavior only (a single absolute date across mixed trials would be misleading); the calendar is hidden when multiple targets are selected.

## 4. Accounts table sorting polish
- Keep the existing sort engine; make the three sortable headers (`Account`, `Taps`, `Created`) show an explicit up/down chevron for the active direction instead of the neutral icon, with tooltips ("Oldest first" / "Newest first", "Most taps" / "Least taps", "A-Z" / "Z-A").
- Persist `sortKey`/`sortDir` to `localStorage` so they survive tab switches and reloads.
- Confirm the existing "Dashboard" button opens the personal dashboard in admin view mode (it already passes the admin view param) — no change expected.

## 5. Universal rep deletion
- In `AdminReps.tsx`, move the red "Delete permanently" button out of `renderRepAccessActions` so it renders on **every** application row and every rep row regardless of status.
- Confirmation dialog names the rep/email; keep the typed `DELETE` confirmation for rows that own a real auth account, and use a simple confirm for application-only rows (nothing to cascade).
- Delete path:
  - row with a matched `sales_reps` record -> existing `delete-user-complete` edge function (`deleteSalesRepAccount: true`), then delete the `rep_applications` row.
  - application-only row -> delete the `rep_applications` row directly.
- **Database migration required:** add an admin-only DELETE policy on `public.rep_applications` (mirroring the existing admin update policy) since none exists today.

## Verification
- Full typecheck.
- Playwright pass as admin: print queue shows real names, edit drawer saves, calendar sets an exact trial date, accounts table sorts both directions on all three columns and survives a tab switch, and a rejected test application can be deleted — console clean throughout.

## Technical notes
- All new UI uses the existing Obsidian-dark admin palette (`#0a0e1a` surfaces, `white/5` borders, emerald accents) — no new hardcoded theme colors outside that established admin pattern.
- File paths in the request (`PrintQueue.tsx`, `AdminAccounts.tsx`, `AdminSalesReps.tsx`) don't exist; the real equivalents listed above are used.
