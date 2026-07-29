# Fix Rep Demo Hub PDF Upload & Admin Download

## Root cause

Reps upload the print PDF from **My Businesses** into `card-print-files/{personal_profiles.id}/…`, but the current storage RLS policy only allows access when the folder id matches a row in `public.restaurants`. Rep demo hubs live in `public.personal_profiles`, so every rep upload is blocked by RLS and the code shows a generic "Upload failed" toast. Admin `createSignedUrl` fails for the same reason, which is why there's no working download either.

## Changes

### 1. Migration — extend `card-print-files` storage policies

Drop the four existing `card-print-files` policies on `storage.objects` and recreate SELECT / INSERT / UPDATE / DELETE so the folder id can match EITHER:
- a `restaurants` row where `created_by = auth.uid()` (existing behavior), OR
- a `personal_profiles` row where `user_id = auth.uid()` OR `created_by_rep_id = auth.uid()` (new — covers rep-created demos and hub owner), OR
- `public.is_admin()` (admin universal access).

### 2. `src/pages/rep/RepBusinesses.tsx` — upload/download UX

- `uploadPdf`: surface real error (`e.message`) in toast + `console.error`; in `finally`, reset the `<input type="file">` value so re-selecting the same file re-triggers the change event.
- Replace `openPrintPdf` (which does `window.open(signedUrl)`) with a blob download flow: `supabase.storage.from('card-print-files').download(path)` → object URL → hidden `<a download="print-{slug}.pdf">` → click → revoke.
- Keep a small "Open in tab" secondary action using the signed URL for admins/reps who want an in-browser preview.

### 3. `src/components/admin/AdminPendingHubApprovals.tsx`

- Replace `openPdf` popup flow with the same blob download helper. The existing "PDF" button becomes "Download PDF".

### 4. `src/components/admin/AdminUnifiedAccountsTable.tsx`

- Extend the `personal_profiles` query to include `card_print_pdf_path`.
- Add a "PDF" download button in the row action group (Solo rows only) that uses the blob download helper. Shown only when `card_print_pdf_path` is present.

### 5. Verification

- Typecheck (`tsgo`) passes cleanly.
- Manually: as rep, upload a PDF on a demo hub, replace it, and re-select the same file twice; confirm success toast and real error surfacing.
- As admin: from the Pending Approvals card and the Unified Accounts table, click Download PDF and confirm the file lands in Downloads.

## Out of scope

- W-9 flow (`rep-tax-docs` bucket) — separate bucket with different policies, not affected.
- No changes to profile schema or upload paths.
