# Rebuild the Admin Overview into a Live Command Center

## Why it looks frozen today

The Overview tab is fed by a single data load that runs once when the page mounts, and it only reads the legacy `restaurants` table. Confirmed in `src/pages/Admin.tsx`:

- The loader runs in one `useEffect` keyed on admin status only — no refresh, no interval, no refetch when you switch back to Overview.
- Its three tiles (Total Accounts, Active Subscriptions, Total Taps) count rows from `restaurants` only. Solo / personal hubs (`personal_profiles`) are not included at all, so most of the business today is invisible there.
- Taps are counted from `analytics_events` with `event_type = 'tap'`, which is the legacy Business event. Solo hubs record `profile_visit` in `personal_analytics`, so their engagement never shows up.
- The rest of the tab is just a "Quick Access" button grid — no health, no queues, no alerts.

Net effect: numbers look static and low, and nothing tells you whether pages are actually live.

## What the new Overview will show

**Row 1 — Live status band (the "is everything up?" answer)**
- Live hubs count with a health pill: green when the last health sweep found every hub reachable, amber for warnings, red with a count of broken hubs, plus "last checked X min ago" and a "Run check" button.
- Uses the same probe logic the Hub Health page already uses (`get_hub_health` plus public RPC probes), run against a capped sample so it stays fast; a link opens the full Hub Health page.
- App errors in the last 24h (from `client_errors`), red when non-zero, click-through to `/admin/errors`.

**Row 2 — Business KPIs (all hub types, not just legacy)**
- Total hubs = personal profiles + restaurants, split shown underneath (Solo vs Business).
- Active paid subscriptions across both tables, plus trialing count.
- Engagement: taps and clicks for Today / 30d / All time via the existing `admin_account_engagement` RPC, with a small range switch. This is the same source the Accounts & Hubs table uses, so numbers will finally agree between the two screens.
- New hubs created in the last 7 days.

**Row 3 — Action queues (each with a live count badge and a jump link)**
- Hubs pending approval, and hubs sitting in "Changes requested".
- Print & ship queue awaiting print.
- Rep applications pending, demo requests pending, W-9s pending review, payouts awaiting batch.
- Trials expiring in the next 7 days.

**Row 4 — Recent activity**
- Last ~15 events across signups, approvals, submissions, and claims, newest first, each linking to the relevant record.

**Keeping it live**
- Data refreshes automatically every 60 seconds while the Overview tab is visible, pauses when the tab is backgrounded, and refetches immediately when you return to Overview or the browser tab regains focus.
- A manual Refresh button with a "Updated HH:MM:SS" timestamp so it is obvious the data is current.
- Each tile loads independently with its own skeleton, so one slow query never blanks the page.

## Technical notes

- New hook `src/hooks/useAdminOverview.ts` owns all fetching: parallel count queries (`head: true, count: 'exact'` so no rows transfer), the `admin_account_engagement` RPC for taps/clicks, and the queue counts. Exposes `data`, `loading`, `refresh`, `lastUpdatedAt`.
- New component `src/components/admin/AdminOverview.tsx` replaces the inline `renderOverview()` in `src/pages/Admin.tsx`; `Admin.tsx` keeps its existing restaurant loader for the other tabs.
- Health sweep extracted from `AdminHubHealth.tsx` into `src/lib/hubHealthProbe.ts` so both screens share one implementation instead of duplicating the probe.
- Polling via `setInterval` with `ReturnType<typeof setTimeout>` typing, cleared on unmount, gated on `document.visibilityState`.
- Styling stays on the existing Obsidian-dark palette (`Panel`, `bg-white/[0.02]`, `border-white/5`) — no new tokens.
- No database schema changes required; if a queue count needs a cheaper aggregate than a client-side count query, it will be added as a read-only RPC in a migration.
