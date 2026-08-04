# Fix dotted social handles + optional rep note on submit

## 1. Instagram (and all social) handles with a dot are rejected

Reps entering a handle like `el.chilitos` get "Enter your page name, e.g. yourname" and can't save.

Cause: the guard that blocks domain-only input (`facebook.com/`) treats any `word.word` string as a bare domain, so legitimate handles containing dots are wrongly rejected.

Fix: tighten that check so it only flags input that ends in a real domain suffix (`.com`, `.co`, `.net`, `.org`, `.io`, `.me`, `.tv`, `.gg`, `.app`, country codes) or matches a known platform host. Handles like `el.chilitos`, `j.smith`, `taco.house` then save normally, while `facebook.com` alone is still blocked.

This automatically fixes the same error in the inline preview warning in the link editor, since both use the same helper.

## 2. Optional note when a rep submits a demo

Today the flow is one-way: admins can leave a note, reps cannot.

- Add `rep_note` and `rep_note_at` columns to hub profiles (reps may write these; admin-only fields stay protected by the existing guard).
- "Submit for review" opens a small dialog with an optional message box ("Anything the admin should know? (optional)", 600 char cap) plus Cancel / Submit. Leaving it blank submits exactly as it does today.
- The note is saved with the submission and cleared when a hub is approved.
- The admin approval queue shows the rep's note inline on the pending row so it's visible before approving or requesting changes.

## Technical notes

- `src/lib/platformLinks.tsx`: rewrite `isBareDomainHandle` with a TLD allowlist; add unit-safe fallback so unknown suffixes are treated as handles, not domains.
- `src/components/personal/LinkModal.tsx`: no logic change needed (consumes the helper).
- Migration: `alter table public.personal_profiles add column rep_note text, add column rep_note_at timestamptz;` — no new RLS needed (existing rep update policy covers it); guard trigger untouched.
- `src/pages/personal/PersonalDashboard.tsx`: wrap `handleSubmitForReview` in a dialog, include `rep_note` / `rep_note_at` in the update payload.
- `src/components/admin/AdminPendingHubApprovals.tsx`: select and render `rep_note`; clear it on approve.
