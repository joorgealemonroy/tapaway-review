## 1. Migration — reviewer notes + new pipeline status

`personal_profiles`:
- Add `review_note text` and `review_note_at timestamptz`.
- Drop and re-add `personal_profiles_pipeline_status_check` to include `'changes_requested'` alongside the existing statuses (`draft`, `ready_for_review`, `card_ready`, `delivered`, `converted`, `inactive`).

No GRANT/RLS changes — new columns inherit the table's existing policies.

## 2. Compact approvals queue with "Request Changes"

`src/components/admin/AdminPendingHubApprovals.tsx`

- Replace the 6-column table with a stacked list of dense cards. Each card:
  - Left: business name + `@username`, rep name, submitted date.
  - Right (tight button row): **Preview**, **PDF** (if present), **Request Changes**, **Approve**.
- "Request Changes" opens an inline textarea (shadcn Dialog). On Send:
  - Update the profile: `review_note = <text>`, `review_note_at = now()`, `pipeline_status = 'changes_requested'`, `submitted_for_review_at = null`.
  - Toast confirmation, remove row from queue.
- Approve flow unchanged (award-demo-commission edge fn still fires).

`src/pages/personal/PersonalDashboard.tsx`

- When the active profile's `pipeline_status === 'changes_requested'`, render an amber banner above the existing draft/submit banner showing "Admin requested changes" and the `review_note`. Include a "Mark ready and resubmit" button that clears the note and sets `pipeline_status = 'ready_for_review'` + `submitted_for_review_at = now()` (mirrors current submit path).

## 3. Unified Accounts table

`src/pages/Admin.tsx` — replace the current `renderAccounts` split (Legacy table + Lite table stacked, plus a 3-way segment control) with a single unified table.

- **Data union**: build one array of rows shaped as `{ id, name, kind: 'legacy' | 'lite', owner_email, plan, status, taps, created_at, slug }`.
  - Legacy: from already-loaded `restaurants` (taps already aggregated).
  - Lite: fetch `personal_profiles` **excluding** rows where `created_by_rep_id is not null AND is_approved = false` (rep demos live only in the pending queue).
  - Lite taps: one batched `personal_analytics` query filtered by `event_type = 'tap'` and the loaded `profile_id` list; reduce client-side into a `Record<profileId, number>`.
- **Columns**: Business · Kind (badge: Legacy / Lite) · Plan · Status · Taps · Created · Actions. Drops the broken Locations column and the Owner/Email/Slug columns get consolidated under Business.
- **Sorting**: default Taps desc. Click Taps / Created / Name headers to toggle asc/desc.
- **Filter row (single line)**: search (name + slug + email), Kind (All / Legacy / Lite), Plan, Status. Replaces the current segment tabs.
- **Actions**: reuse existing per-kind actions (open hub, edit, delete) via a dropdown so the row height stays compact.
- Delete `renderLegacyTable`'s standalone renders and inline the row rendering into the unified table. `AdminBusinessLiteTable` becomes unused inside Admin.tsx — leave the file in place (still linked from `/admin/personal-accounts` full manager button) but stop rendering it in the Accounts tab.

## Technical notes

- All work is admin-only pages; RLS on `personal_profiles` and `personal_analytics` already permits admin reads.
- No changes to public hub routing, rep pricing, commission engine, or the `award-demo-commission` edge function.
- Typecheck runs automatically after edits.

## Files touched

- Migration (new).
- `src/components/admin/AdminPendingHubApprovals.tsx` — compact cards + Request Changes dialog.
- `src/pages/personal/PersonalDashboard.tsx` — changes-requested banner + resubmit action.
- `src/pages/Admin.tsx` — unified Accounts table (union, taps sort, filters, dropped Locations).
