# Accounts & Hubs: real usage analytics with Daily / Monthly / All-time

## What's wrong today (verified)

- The Solo (personal hub) tap count queries `personal_analytics` for `event_type = 'tap'`, but that value never exists in the table. Actual values are `profile_visit` (1,668 rows), `link_click` (526) and `contact_save` (9). So every Solo account shows **0 taps**, permanently.
- Legacy Business rows read `analytics_events` with `event_type = 'tap'`, which does exist (810 rows) — those numbers are real.
- The table pulls raw analytics rows into the browser and counts them client-side. The data client caps results at 1,000 rows, so even once the event name is fixed the totals would silently under-count.
- There is no time window at all — the single "Taps" column is lifetime-only.

## What gets built

### 1. Server-side aggregation (new database function)

Add an admin-only `admin_account_engagement(_since timestamptz)` function that returns, in one call, per hub:

- `hub_id`, `kind` (business / solo)
- `taps` — `profile_visit` for Solo hubs, `tap` for Business hubs
- `link_clicks`
- `contact_saves` (Solo only)
- `last_active_at` — timestamp of the most recent event

Aggregating in the database fixes the 1,000-row cap and makes the daily/monthly windows cheap. Passing `null` for `_since` returns all-time.

### 2. Time-range switch in the Accounts & Hubs section

A segmented control above the table: **Today · 30 days · All time**. Changing it refetches the aggregate for that window; the selection persists alongside the existing sort preference.

### 3. New / fixed columns

| Column | Behavior |
| --- | --- |
| Taps | Correct for both hub types, scoped to the selected range, sortable |
| Clicks | Link clicks in range, sortable |
| Last active | Relative time ("2h ago", "12d ago", "—"), sortable |

An "Active" / "Idle" dot next to each account: green when there is at least one tap in the last 7 days, grey otherwise — this is the at-a-glance "is this person actually using their card" signal. Sorting header labels/tooltips update to reflect the active range ("Most taps today", etc.).

### 4. Summary strip

Above the table, four small stat tiles for the selected range: total taps, total clicks, hubs active in range, and hubs with zero taps ever (the churn-risk list). Clicking "hubs with zero taps" filters the table to exactly those accounts.

## Technical notes

- New migration creates the `SECURITY DEFINER` function guarded by the existing `is_admin()` check, with `EXECUTE` granted to `authenticated` only.
- `src/components/admin/AdminUnifiedAccountsTable.tsx` swaps its two raw analytics selects for one RPC call keyed on the selected range; the existing broken-link, kind, status and search filters stay as-is.
- Existing Obsidian-dark admin palette only — no new color values.
- Verification: typecheck, then a Playwright pass as admin confirming non-zero Solo taps, correct range switching, and a clean console.
