
## Goals

1. Admins must never be "locked" into a personal profile at `/dashboard`. Today `/dashboard` picks the first profile whose `user_id`, `sales_rep_id`, or `created_by_rep_id` matches the admin — which is why `tap@tapaway.co` lands on `las-nuevas-islas` (created by admin acting as rep).
2. Admins and Sales Reps must always be able to edit any hub they open (via `?admin_view_personal=` for admins, and via their own rep-linked demos for reps) — no RLS or client gate blocking saves.
3. When a rep creates a demo, the auto-seeded links (Website, Google Review, optional Yelp) should behave the same as image-tile links reps add manually: **half-width tiles with an icon/image**, and freely draggable/reorderable alongside anything the rep adds later.

## What to change

### 1. `/dashboard` — admin never auto-selects a hub

`src/pages/personal/PersonalDashboard.tsx` (`loadData`):
- Detect admin early with `supabase.rpc("is_admin")` before the `.or(user_id.eq…)` query.
- If admin AND no `admin_view_personal` / `admin_view` / `profile_id` in the URL, redirect to `/admin/personal-accounts` (the account picker) instead of loading a profile. The admin then chooses a hub, which opens `/dashboard?admin_view_personal=<id>` and re-enters the existing impersonation branch.
- If admin *does* have a `profile_id` in the URL (legacy links), rewrite it to `admin_view_personal=<id>` so the impersonation branch owns the session and no profile is bound to the admin's own `user_id`.

Also: when admin lands on the impersonation branch, do not touch `trial_ends_at` auto-expiry logic on their behalf (already only runs in the non-admin branch — verify).

### 2. Editing guarantees for admin + rep

- Confirm the impersonation branch already writes with the admin's session (RLS on `personal_profiles`, `personal_links`, `personal_blocks` allows admin via `is_admin()` policies added earlier). Add missing update/insert/delete policies for admins on any of the three tables if a spot-check finds gaps.
- For reps: existing policy allows managing profiles where `sales_rep_id = auth.uid()` OR `created_by_rep_id = auth.uid()`. Extend the same predicate to `personal_links` and `personal_blocks` if not already present so reps can add/edit/reorder links on their demo hubs without RLS errors.
- No client-side gates in `DashboardLinksManager` / `DashboardUnifiedContent` need to change — they already write via the caller's session.

### 3. Auto-seeded rep links = half-width tiles, reorderable

`src/pages/rep/RepDemoCreate.tsx` seed block (around lines 172–197):
- Give every seeded link `grid_size: 'half'` and a `cover_image_url` (icon) so `DashboardUnifiedContent` renders them as tiles, matching the second screenshot.
  - Website: use the site's favicon (`https://www.google.com/s2/favicons?domain=<host>&sz=128`) or leave `link_type: 'custom'` with a website icon asset already used by the tile renderer.
  - Google Review: seed with the Google "G" tile image already used for the full-width row (reuse the same asset URL, or set `link_type: 'google_review'` + `grid_size: 'half'` — the tile renderer picks the Google icon automatically).
  - (If a Yelp URL exists on the place, seed it the same way with `link_type: 'yelp'`.)
- Ensure `sort_order` values remain sequential (0, 1, 2…) so they interleave cleanly with anything the rep adds; the existing drag-to-reorder in `DashboardUnifiedContent` will let the rep move them anywhere.
- Confirm the tile grid pairs consecutive `grid_size: 'half'` items into a 2-column row (existing rule in `DashboardUnifiedContent` line 198), so two seeded halves render side-by-side like the "Visit …" tile in the first screenshot.

### 4. Verification

- Log in as admin → visit `/dashboard` → expect redirect to `/admin/personal-accounts`, not `las-nuevas-islas`.
- From the admin account picker, open a hub → land on `/dashboard?admin_view_personal=<id>` with the amber admin banner; edit hero, add a link, add a block — all saves succeed.
- Log in as a rep → open one of their demos → add/reorder/edit links and blocks — all saves succeed.
- Rep creates a fresh demo via Google Places → dashboard shows the seeded Website + Google Review as **two half-width tiles side by side** (with icons), draggable to any position.

## Technical notes

- Files touched: `src/pages/personal/PersonalDashboard.tsx`, `src/pages/rep/RepDemoCreate.tsx`, plus a small Supabase migration only if RLS spot-check finds a missing admin/rep write policy on `personal_links` or `personal_blocks`.
- No changes to `UsernameResolver`, public routes, or the approval queue.
- The `las-nuevas-islas` hub itself is unchanged; the admin simply stops being auto-routed into it.
