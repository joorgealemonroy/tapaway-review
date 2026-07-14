# Admin Cockpit Redesign

Refactor `src/pages/Admin.tsx` from a stacked-section page into a premium sidebar cockpit. Purely a UI reorganization — every existing handler (edit, hub open, view dashboard, toggle sub, repair Google, Yelp debug, delete, promo generate, unified Business Lite table) stays wired to its current function; nothing about data fetching, RLS, webhooks, or routes changes.

## 1. Shell & layout

Rebuild the return of `Admin.tsx` as a two-pane shell:

- Root: `min-h-screen bg-[#0a0e1a] text-foreground flex`.
- Left: fixed `w-60` sidebar, `border-r border-white/5`, obsidian bg, containing:
  - Small TapAway wordmark + "Admin" label at top.
  - Nav list with 5 items, each a button that sets internal `section` state (no route changes):
    1. Overview — `LayoutDashboard`
    2. Accounts & Hubs — `Building2`
    3. Sales Reps — `Users`
    4. Promo Links — `LinkIcon`
    5. System & SMS — `Settings`
  - Active item: `bg-white/5 text-white`, inactive: `text-white/60 hover:text-white hover:bg-white/[0.03]`.
  - Log-out button pinned to bottom.
- Right: main viewport, `flex-1 overflow-y-auto`, top bar with section title + admin email, content padded `px-8 py-6`.
- Mobile (`md:` breakpoint): sidebar collapses to a `Sheet` triggered by a hamburger in the top bar. No route changes.

Section state lives in `useState<'overview'|'accounts'|'reps'|'promo'|'system'>`; content switches via conditional render, existing effects untouched.

## 2. Section contents

**Overview** — small "quick stats" strip (total accounts = restaurants.length, total taps sum, active subs count — derived from existing state, no new queries) as 3 minimal panels (`rounded-xl border border-white/5 bg-white/[0.02] p-4`). No card containers beyond that.

**Accounts & Hubs** — the unified datagrid (see §3).

**Sales Reps** — the existing `NAV_CARDS` grid, but restyled: thin `border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10`, monochrome `text-white/50` icons that go `group-hover:text-primary`, uniform card heights via `min-h-[112px]` and consistent `gap-4`. Same navigate targets.

**Promo Links** — the promo generator refactored into one constrained card (`max-w-2xl rounded-xl border border-white/5 bg-white/[0.02] p-5`). Discount `Select` + "Generate 30-Min Link" button on a single `flex items-end gap-3` row. Generated URL + copy button + expiry render below when present. Same handler `handleGeneratePromo`.

**System & SMS** — links out to VIP SMS subscribers and Comp Settings using the same nav targets already in `NAV_CARDS` for those two, presented as two clean list rows (not blocky icon cards).

## 3. Unified Accounts datagrid

Replaces the current `Tabs` (`business-lite` / `restaurants`).

- Header row above table:
  - Segmented switcher (custom, built from buttons in a `inline-flex rounded-lg bg-white/[0.03] border border-white/5 p-1` container; active segment `bg-white/10 text-white`, inactive `text-white/50`) with three segments: **All Accounts**, **Business (Legacy)**, **Business Lite (Solo)**. Stored in `useState<'all'|'legacy'|'lite'>`.
  - Same row on the right: `Search` input, plan `Select`, status `Select`, and `+ Add Account` button. Filters only show when relevant to the current segment (plan/status filters visible for legacy + all; lite uses the plan filter from the existing `AdminBusinessLiteTable`).
- Body:
  - Segment `legacy` → render the current restaurants table exactly as it exists today, but with the action column refactored per §4.
  - Segment `lite` → render `<AdminBusinessLiteTable />` unchanged (component already handles its own filters; we hide the outer filter row when this segment is active to avoid duplication).
  - Segment `all` → stacked: a "Legacy" subheading + legacy table, then a "Business Lite" subheading + `<AdminBusinessLiteTable />`. Simplest correct interpretation of "unified"; no data merging risk.
- `+ Add Account` button opens a small dropdown (`DropdownMenu`) with two options: "New Business (Legacy)" → `/onboarding`, "New Business Lite" → `/personal/signup`. Uses existing routes, no new flows.

## 4. Row action dropdown

In the legacy restaurants table, replace the 6-button action cell with:

- **Visible primary icons** (two icon buttons only):
  - `Pencil` → calls existing `openEdit(r)`.
  - `ExternalLink` → calls existing `openHub(r)` (opens `/{custom_slug}` in new tab).
- **Secondary menu**: `DropdownMenu` triggered by `MoreVertical` icon button. Items:
  - "View Dashboard" → existing `navigate('/dashboard?admin_view=' + r.id)` handler.
  - "Toggle Subscription" → existing `toggleSub(r)`.
  - "Repair Google Link" → existing `repairGoogleReviewLink(r)`.
  - "Yelp Debug" → existing `setYelpDebugTarget(...)` handler.
  - `DropdownMenuSeparator`.
  - "Delete Account" → existing `startDelete(r)`, styled `text-red-400/80 focus:text-red-400 focus:bg-red-500/10` (muted red, not neon).

All handler functions in `Admin.tsx` stay as-is; only the JSX call sites move.

## 5. Aesthetic tokens (component-local, no global CSS changes)

- Panel: `rounded-xl border border-white/5 bg-white/[0.02]`.
- Divider: `border-white/5`.
- Muted text: `text-white/60`; subtle: `text-white/40`.
- Table header row: `bg-white/[0.02] text-white/50 uppercase tracking-wide text-[11px]`.
- Table rows: `border-b border-white/5 hover:bg-white/[0.02]`.

No changes to `index.css`, `tailwind.config.ts`, or design tokens — Tailwind arbitrary values used inline since this is a single admin surface. Keeps blast radius zero.

## Files touched

- `src/pages/Admin.tsx` — full JSX restructure; imports add `DropdownMenu*`, `Sheet*`, `LayoutDashboard`, `Building2`, `Pencil`, `ExternalLink`, `MoreVertical`. Handlers, effects, state (aside from new `section` and `segment` local state) unchanged.

## Out of scope (confirmed)

- No DB, RLS, edge function, webhook, or route changes.
- No changes to `AdminBusinessLiteTable.tsx` internals (reused as-is).
- No changes to sub-pages (`/admin/reps`, `/admin/commissions`, etc.) — just the entry surface.
- No global theme token changes.
