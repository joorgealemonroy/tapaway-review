# Corrected hardening architecture, then Phase 2 admin analytics

You are right — the invoker wrapper was contradictory. Dropping it. The edge-function architecture below is what will be built.

## Verified current state (read-only, just checked)

| Check | State |
| --- | --- |
| `hub_analytics_summary` | SECURITY DEFINER, `search_path=public`, executable by `anon` |
| `expire_analytics_ip_hashes` | SECURITY DEFINER, `search_path=public`, executable by `anon` |
| `public.is_admin()` | SECURITY DEFINER, `search_path=public`, executable by `anon` — needs the same fix |
| `public.has_role()` | SECURITY DEFINER, `search_path=public`, executable by `anon` — same, it is what `is_admin` calls |
| `analytics_hits` policies | one admin-only SELECT policy; no owner policy — owners already cannot read raw rows |
| Ownership derivation | already internal via `auth.uid()`; `_hub_id` only selects, never authorizes |
| pg_cron / pg_net | **not installed** — no retention job runs today |
| Retention config | 400 / 7 / 90 / 730 present; Meta master switch off, test mode on |

## Execution chain (explicit grants)

```text
browser (dashboard)
  -> POST /functions/v1/analytics-report   [Authorization: Bearer <user JWT>]
       edge function verifies JWT via auth.getUser(); caller id comes from the token only
       edge function checks admin OR ownership with the service-role client
       edge function calls private.hub_analytics_summary(...) as service_role
  <- aggregate JSON only
```

Grants applied:

- `CREATE SCHEMA private;` `REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;` `GRANT USAGE ON SCHEMA private TO service_role;`
- `private.hub_analytics_summary(...)`: SECURITY DEFINER, `SET search_path = ''`, fully schema-qualified. `REVOKE EXECUTE FROM PUBLIC, anon, authenticated;` `GRANT EXECUTE TO service_role;`
- `public.hub_analytics_summary(...)`: **removed** (no replacement wrapper). Nothing in the app calls it; the dashboard will call the edge function. This is the one non-additive change to a Phase 1 object — no data is affected. I will ask before running it if you would rather keep it revoked-but-present; my recommendation is removal so there is no reachable path at all.
- `public.is_admin()` and `public.has_role()`: recreated with `SET search_path = ''` and fully qualified references (`public.user_roles`, `auth.users`). Execute revoked from `PUBLIC`/`anon`, granted to `authenticated` and `service_role` — `authenticated` must keep it because dozens of existing RLS policies call `is_admin()` inline.
- `private.expire_analytics_ip_hashes()` / `private.enforce_analytics_retention()`: SECURITY DEFINER, `search_path = ''`, execute to `service_role` only. The public `expire_analytics_ip_hashes()` is revoked from `anon`/`authenticated`.
- `analytics_hits`: no owner SELECT policy is added; the existing admin SELECT policy stays for explicit debugging only. Owners get aggregate-only through the edge function. The admin dashboard also reads through the edge function, not the raw table.

## Retention job

- `private.enforce_analytics_retention()` reads `public.analytics_config`, then for each target uses `to_regclass('public.<table>')` and only executes that branch when the table exists — Meta and consent branches no-op cleanly until Phases 3–4 create them. Each branch runs in its own exception-guarded block so one failure cannot abort the others.
- `analytics_config.last_retention_run_at` (new nullable column) is written **only after every applicable branch has completed without error**; a partial run leaves the old timestamp and records the failure.
- Enable `pg_cron` in `extensions` and schedule a daily 03:15 UTC job calling the function. If the extension cannot be enabled here, the fallback is a `retention-sweep` edge function on a daily schedule — I will state clearly which path was used.

## Tests (all must pass before Phase 2 UI work)

**Database-level (simulated claims — kept, but labelled as simulated):**
1. Owner A gets aggregates for hub A. 2. Owner A passing hub B's id gets 0 rows. 3. Owner B gets nothing for hub A. 4. User with no hub gets nothing. 5. `anon` and `authenticated` both get `permission denied` on `private.hub_analytics_summary`. 6. `authenticated` gets 0 rows / denied on `analytics_hits`, `analytics_ip_salt`, and `private` schema objects — including for hubs they own. 7. Return signature contains no `ip_hash`, `session_id`, `visitor_id` or raw event columns. 8. Retention function against synthetic out-of-window rows, plus a `cron.job` entry check.

**Real end-to-end HTTP against `analytics-report` with genuine JWTs:**
1. Correct owner → 200 with their aggregates. 2. Different owner → 403. 3. User with no hub → 403/empty authorized result. 4. No token → 401. 5. Manipulated `hubId` → 403, never another business's data. 6. Direct browser attempt at the private function and at raw tables → denied.

## Phase 2 (after tests pass)

- `/admin/analytics` with tabs: Overview, Hub Analytics, Traffic Quality, Acquisition, Engagement, Conversions, plus disabled Meta Tracking and Privacy & Consent placeholders (master switch stays off).
- **Session labelling is strict:** legacy period → "Estimated sessions"; post-cutover → "Verified sessions"; a range spanning `cutover_at` → "Estimated total sessions" with the methodology shown inline. Never presented as one exact number.
- Post-cutover session counts are `count(distinct session_id)` computed across the whole requested range. Daily uniques are never summed into a range total.
- Per-hub table: raw events, validated events, verified sessions, returning visitors, suspected bot events, internal/preview events, CTA interactions, sources, conversion rate, date-range comparison. Anything that counts events is labelled "events".
- `/rebornwraps` drill-down: the audit figures (569 raw `profile_visit`, 53 crawler-UA, 22 preview/localhost, 28 same-device-within-a-minute, ~470–490 legitimate, ~358 sessions) shown as a **frozen legacy estimate** with its own header and date range, and validated post-cutover traffic displayed separately from 2026-08-30 07:19:04 UTC onward.
- Mobile-responsive pass on the whole section.

## Untouched

No Meta credentials requested or used; master switch stays off. No historical events deleted or rewritten.
