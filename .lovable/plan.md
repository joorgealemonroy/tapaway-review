# Live hub link checking + day-by-day taps & clicks

Two additions to the Admin Overview / Hub Health tooling.

## 1. Check that every link on a live hub actually works

Today the health sweep only asks "does this hub load for a logged-out visitor?". It never opens the links inside the hub, so a hub can be green while its Instagram, menu or booking link is dead.

What gets added:

- A new admin-only backend function that, for each live hub, collects every outbound link (Solo hub link tiles and contact website, plus Business hub Google review / Yelp / directions / Instagram / website) and checks each one server-side: follow redirects, short timeout, treat 2xx/3xx as OK, 4xx/5xx or timeout as broken. Browsers can't do this themselves (cross-origin blocks), which is why it runs server-side.
- The existing static rules in `src/lib/brokenLinks.ts` (the `facebook.com/facebook.com` and truncated `/people` signatures) run first, so those are flagged as "malformed" without a network call.
- Results are stored per link so the dashboard can show the last check without re-running the sweep, and a nightly job re-checks everything automatically.

Where it shows up:

- **Overview status band**: a second line under reachability — "X of Y live hubs have a broken link", listing the worst offenders with the hub slug and the failing URL. Green when clean.
- **Hub Health page**: a Links column per hub (e.g. "7 OK · 1 broken") with an expandable list showing each failing URL, its HTTP status, and a direct "Open hub" / "Edit hub" action.
- A "Check links" button next to the existing "Run check" so it can be triggered on demand.

## 2. Taps & clicks broken out by day

Event data is arriving every day (verified: profile visits and link clicks recorded through today), but the Overview only shows one lump total for the selected range, so there is no way to see "is today up to date".

What gets added:

- A new admin-only aggregate that returns one row per calendar day for the last 30/90 days: taps, clicks, contact saves — combining Solo (`profile_visit` / `link_click` / `contact_save`) and Business (`tap` and the click-type events) hubs.
- A daily bar chart on the Overview engagement panel with the range switch (7d / 30d / 90d), plus a "Today so far" tile with the change against the same time yesterday and a "last event received" timestamp so a data outage is obvious at a glance.
- Day boundaries follow the admin's local timezone so "Today" means today, not a UTC day.
- The existing per-hub analytics popup keeps its own chart; both read the same aggregate so the numbers agree.

## Technical notes

- Migration: `admin_engagement_daily(_days int, _tz text)` SECURITY DEFINER, guarded by `is_admin()`, EXECUTE granted to `authenticated`. It builds the date axis with `generate_series` over the requested window and LEFT JOINs event counts onto it, so days with zero events still return a row and the chart shows gaps instead of collapsing them.
- New `hub_link_checks` table (hub id, kind, url, label, status, http_status, checked_at) with `UNIQUE (hub_id, url)` so re-checks upsert cleanly instead of piling up duplicates; GRANTs included, RLS admin-read-only and service-role write.
- Edge function `check-hub-links`: verifies an admin JWT in code, processes links in batches with a concurrency pool and ~8s timeout, HEAD with GET fallback, sends a realistic desktop Chrome `User-Agent` (plus `Accept`/`Accept-Language`) so sites like Instagram and Facebook don't return bot-blocking 4xx, and writes results with the service role. Scheduled nightly via pg_cron + pg_net.
- Frontend: `useAdminOverview.ts` gains the daily series and link-health summary, passing `_tz` from `Intl.DateTimeFormat().resolvedOptions().timeZone` so day buckets match the admin's own clock; `AdminOverview.tsx` gets the chart (Recharts, already in the project) and the broken-link band; `src/pages/admin/AdminHubHealth.tsx` gets the Links column. Obsidian-dark palette only.
- Verification: typecheck, then a Playwright pass as admin confirming the daily chart renders with today's bar, the link sweep completes, and the console is clean.
