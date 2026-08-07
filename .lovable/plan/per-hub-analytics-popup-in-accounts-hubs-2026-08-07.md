# Per-hub analytics popup in Accounts & Hubs

Add an **Analytics** button on every row of the admin Accounts & Hubs table. Clicking it opens a dialog with that hub's detailed usage — no impersonation, no opening their dashboard, no leaving the admin page.

## What the popup shows

**Header:** hub avatar, name, @slug, type badge (Solo / Business), plan and status, plus a link to open the public hub in a new tab.

**Range switch inside the popup:** 7 days · 30 days · 90 days · All time (independent of the table's range).

**Stat tiles:** taps, link clicks, contact saves, and unique-ish visitors (distinct device/referrer signature) for the selected range, each with the date of last activity.

**Daily activity chart:** taps per day across the selected range (line chart, same Recharts setup already used elsewhere in the app).

**Top links table (Solo hubs):** each link's label, destination URL, click count, and share of total clicks — this is the "are they actually getting value" view.

**Device + referrer breakdown:** mobile vs desktop split (parsed from the stored user agent) and top traffic sources, with "Direct / NFC tap" as its own bucket.

**Recent activity feed:** last 25 events with type, relative time, and label where present.

**Business (legacy) hubs:** those events only carry an event type — no link labels or user agents — so the popup shows tiles, the daily chart, and a breakdown by action (tap, Google click, Yelp click, directions, phone, menu view) instead of the link/device/referrer sections. The popup states plainly that detailed metadata is not recorded for legacy hubs.

**Empty state:** if the hub has never been tapped, the popup says so and shows how long the hub has existed, so it doubles as a churn-check.

## Technical notes

- New `src/components/admin/HubAnalyticsDialog.tsx`, opened from a new icon button in the Actions column of `AdminUnifiedAccountsTable.tsx`. Table state is untouched; the dialog fetches on open only.
- Solo hubs read `personal_analytics` (`profile_visit`, `link_click`, `contact_save`, with `visitor_info.link_label`, `link_url`, `referrer`, `userAgent`); Business hubs read `analytics_events` by `restaurant_id`. Both are already readable by admins under existing policies, so no migration is needed.
- Queries are scoped by hub id + date range and capped explicitly, with exact counts fetched via head-count queries so the tiles stay correct even if the event list is truncated.
- Obsidian-dark admin palette only, reusing the existing chart and dialog primitives. Verification: typecheck plus a Playwright pass as admin opening the dialog on a hub with real taps and one with zero.
