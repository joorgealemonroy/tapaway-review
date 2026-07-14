## Root cause

During my Admin.tsx edit, a search-replace briefly left the file in a broken syntax state. Although the follow-up edit fixed the source (`tsgo` passes clean), Vite's SWC plugin cached the compile error and stopped serving updates. Result: the browser sees the pre-fix bundle, so **none** of the changes I made across `/admin/reps`, `/admin/demo-requests`, `/rep/restaurants`, `/rep/resources`, or `/rep/demo/:id` are visible.

Evidence:
- `src/pages/Admin.tsx` contains the correct code on disk.
- `tsgo --noEmit` returns 0 errors.
- Vite dev-server log is frozen at `22:24:16 [vite] hmr update /src/pages/Admin.tsx` with an SWC `Expression expected` error from that moment — no further recompiles have happened since.

## Fix

1. Restart the Vite dev server so it re-parses `Admin.tsx` from the current (valid) source.
2. Confirm the log resumes with a clean compile.
3. Ask you to hard-refresh the browser (Cmd/Ctrl+Shift+R) to drop the stale bundle.

No code changes are needed — the files are already correct. This is purely a dev-server cache flush.

## After the restart, you should see

- `/admin/reps` → Active Reps tab: "View as Rep" (ghost) + "Revoke" (destructive) buttons, revoked rows `opacity-50` with gray "Revoked" badge.
- `/admin/demo-requests` → Obsidian-dark redesign, "Mark as Shipped" button opens tracking dialog.
- `/rep/restaurants` → "My Pipeline" header, colored pipeline status dropdown per row, PDF button when a PDF is uploaded.
- `/rep/resources` → 3-tile grid (Canva / Gift Drop Script / Demo Hub Guide).
- `/rep/demo/:id` (edit mode) → Print-Ready Card PDF upload card.
- `/admin` (Accounts table) → "Print PDF" item appears in the ⋯ dropdown for any restaurant that has a PDF on file.
