&nbsp;

# Make rep drafts visible and separated in Admin

## What's wrong today

There are 7 hubs sitting in `draft` (rep-built, not yet submitted) and they appear nowhere in the admin:

- The approval queue only loads hubs with pipeline status `ready_for_review`, so drafts are excluded.
- Accounts & Hubs deliberately hides every rep-built hub that isn't approved yet, so drafts (and in-review hubs) fall through the crack entirely.

Current distribution: 34 approved/in-review trials, 11 active, 7 drafts, 6 awaiting review, 1 other.

## What to build

### 1. Separated queue with tabs

Turn the approval area into three clearly separated buckets:

- **Needs review** — submitted hubs (unchanged behavior, still the default tab).
- **Drafts** — rep hubs still being built, never submitted. Shows rep name, hub name, created date, last edited, and a "nudge/open" action.
- **Changes requested** — hubs sent back to the rep, so nothing gets lost after a rejection.

Each tab shows a count badge so it's obvious at a glance how much work is sitting where.

For each draft row: preview the hub, open it in the dashboard editor as admin, and delete it if it's junk. No approve button — a draft hasn't been submitted yet.

### 2. Accounts & Hubs: stop hiding, start labelling

Instead of silently dropping unapproved rep hubs from the table, keep them in the list with a clear pipeline badge (Draft / In review / Changes requested / Live) and add a status filter so the default view can still be "Live only" with one click to see drafts.

## Technical notes

- `src/components/admin/AdminPendingHubApprovals.tsx`: fetch all three pipeline statuses in one query, group client-side, render as tabs; keep the existing approve / request-changes logic on the review tab only.
- `src/components/admin/AdminUnifiedAccountsTable.tsx`: add `pipeline_status` to the profile select, drop the `is_approved !== true` filter (lines 251-257), add a `pipelineFilter` state defaulting to "live" plus a badge column.
- No database changes needed — `pipeline_status` already exists on `personal_profiles`.
- Styling follows the existing obsidian-dark admin palette.