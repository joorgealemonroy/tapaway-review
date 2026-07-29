## 1. Migration & RPCs (`personal_profiles`)

Add columns: `print_status` (check: not_downloaded | downloaded | printed | delivered, default not_downloaded), `print_downloaded_at/_by`, `print_printed_at/_by`, `print_delivered_at/_by`, `print_notes`, `trial_extension_days int default 0`.

Two SECURITY DEFINER RPCs, admin-only via `is_admin()`, both writing to `admin_audit_log`:
- `admin_extend_trial(_profile_id, _days, _reason)` — adds days to `trial_ends_at` (from now() if null) and increments `trial_extension_days`.
- `admin_set_print_status(_profile_id, _status, _notes)` — stamps the matching `_at`/`_by` fields on first transition, updates notes.

## 2. Admin Print Queue — `src/pages/admin/AdminPrintQueue.tsx` at `/admin/print-queue`

- Add `jszip` dependency; register route + sidebar link in `src/pages/Admin.tsx`.
- Query `personal_profiles` where `card_print_pdf_path IS NOT NULL`, joined with rep name.
- Tabs: New / Downloaded / Printed / Delivered / All. Search by business name / slug / rep. Default sort `submitted_for_review_at ASC`.
- Columns: Avatar · Business · Rep · Submitted · Days since submission · Trial ends (red if < 1 day) · Status chip · Notes preview.
- Row actions: Download PDF (auto-calls `admin_set_print_status → 'downloaded'` if currently `not_downloaded`), Mark Printed, Mark Delivered, Extend Trial (opens dialog), overflow menu (Reset status, Edit note).
- Bulk: Download selected as ZIP (JSZip, `{slug}.pdf`), Mark selected as Printed, Extend selected.

## 3. Shared Extend Trial dialog — `src/components/admin/ExtendTrialDialog.tsx`

Tuned for the 5-day trial model. Presets **+2 / +3 / +5**, custom days input, optional reason textarea. Shows current and computed new `trial_ends_at`. Calls `admin_extend_trial` and refetches. Reusable from Print Queue, Approvals, and Accounts table.

## 4. Existing admin surfaces

- `AdminPendingHubApprovals.tsx`: show print status chip; on Approve, compute `delayDays = daysBetween(submitted_for_review_at, now())`; if `>= 1`, silently call `admin_extend_trial(id, delayDays, 'auto: approval delay')` before flipping `is_approved = true`. Toast: `Approved · trial extended by N days to compensate for 5-day trial review time.` Add inline Extend Trial action.
- `AdminUnifiedAccountsTable.tsx`: SELECT the new fields; add a Print column with the status chip and an "Extend Trial" item in the row action menu.

## 5. Rep surface — `src/pages/rep/RepBusinesses.tsx`

Under each hub row:
- If `trial_extension_days > 0`: subtle chip "Trial extended +N days by admin."
- If `print_status === 'delivered'`: prominent green badge "Card Delivered — Follow up now to close!"

Extend the fetch to include `trial_extension_days` and `print_status`.

## 6. Verification

- `tsgo` typecheck clean.
- Manual: submit demo → open Print Queue → Download PDF (status flips to Downloaded, timestamp stamped) → Mark Printed → Mark Delivered → rep row shows green delivery chip.
- Extend trial +3 from dialog → `trial_ends_at` moves, `trial_extension_days` = 3, `admin_audit_log` row present.
- Approve a hub with `submitted_for_review_at` 2 days ago → trial auto-extends by 2 days with the toast copy above.

## Technical notes

- All mutations go through the two RPCs so audit logging is guaranteed and RLS stays as-is (admin-only writes).
- ZIP is built client-side from signed-URL downloads to avoid a new edge function.
- Column defaults + backfill on the new columns via `DEFAULT` at `ADD COLUMN` — existing rows read as `not_downloaded` / `0`.
