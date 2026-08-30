# Phase 1 hardening checks, then Phase 2 admin analytics

## What I verified just now (read-only)

| Check | Current state |
| --- | --- |
| `hub_analytics_summary` search_path | `search_path=public` — **not** `''`, and internal references are unqualified |
| `expire_analytics_ip_hashes` search_path | `search_path=public` — same issue |
| Execute grants on both functions | `anon`, `authenticated`, `service_role` (inherited from PUBLIC) — **anon can execute today** |
| Ownership check | Already internal: uses `auth.uid()` against `personal_profiles.user_id` / `restaurants.owner_id`; the `_hub_id` argument only selects which hub, it never proves ownership |
| Returned columns | `event_name, events, sessions, visitors` counts only — no IP hash, session ID, visitor ID or raw rows |
| Private schema | No `private` schema exists yet |
| Scheduled deletion | `pg_cron` / `pg_net` are **not installed** — nothing runs automatically. Retention is configuration text only |
| Retention config | Present and correct in `analytics_config` (400 / 7 / 90 / 730), Meta master switch off, test mode on |
| `analytics_config` read policy | Readable by `anon` — it exposes only cutover/retention/Meta flags, no data |

So three of your items need real fixes (search_path, grants, scheduling), one is already satisfied (ownership via `auth.uid()`), and one is an improvement (private schema).

## Step 1 — Hardening migration (additive, no drops of data)

1. Create schema `private`, `REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated`. It is not in the Data API exposed schemas, so PostgREST cannot reach it.
2. Create `private.hub_analytics_summary(_hub_id, _since, _until)` — `SECURITY DEFINER`, `SET search_path = ''`, every reference fully schema-qualified (`public.analytics_hits`, `public.personal_profiles`, `public.restaurants`, `public.is_admin()`, `pg_catalog` operators). Ownership resolved internally from `auth.uid()`; if the caller is neither admin nor the owner of `_hub_id`, it returns zero rows. Output stays aggregate-only.
3. Replace the public entry point `public.hub_analytics_summary` with a thin `SECURITY INVOKER`, `SET search_path = ''` wrapper that calls the private function. `REVOKE EXECUTE ... FROM PUBLIC, anon`; `GRANT EXECUTE ... TO authenticated`.
4. Same treatment for `expire_analytics_ip_hashes`: move the body to `private`, `SET search_path = ''`, fully qualified, `REVOKE EXECUTE FROM PUBLIC, anon, authenticated`, grant to `service_role` only.
5. Add `private.enforce_analytics_retention()` — one job that reads `public.analytics_config` and deletes/clears past every declared window: raw hits older than `raw_retention_days`, IP hashes past `ip_hash_retention_days` (plus salt rows), Meta delivery logs past `meta_log_retention_days`, consent records past `consent_retention_days`. Meta/consent branches are written now but skip cleanly until those tables exist in Phases 3–4.

## Step 2 — Scheduling (this is the part configuration alone does not do)

- Enable `pg_cron` in the `extensions` schema and register a daily job (03:15 UTC) calling `private.enforce_analytics_retention()`.
- If `pg_cron` cannot be enabled on this instance, the fallback is a `retention-sweep` edge function invoked daily by an external scheduler; I will tell you explicitly which path was used and, in the fallback case, that the trigger is outside the database.
- Record `last_retention_run_at` on `analytics_config` so the admin UI can show when deletion actually ran, not just what the policy says.

## Step 3 — Security test suite (must all pass before Phase 2 UI work)

Run as real JWTs (`set local role` + `request.jwt.claims`), results reported verbatim:

1. Hub owner A gets aggregates for hub A.
2. Hub owner A calling with hub B's id gets **0 rows** (input manipulation blocked).
3. Authenticated owner B gets nothing for hub A.
4. Signed-in user owning no hub gets nothing.
5. `anon` executing the function raises `permission denied for function`.
6. Result set contains no `ip_hash`, `session_id`, `visitor_id`, or raw event columns — asserted against the function's actual return signature.
7. `authenticated` cannot `SELECT` from `public.analytics_hits` for hubs they don't own, and cannot reach `analytics_ip_salt` or the `private` schema at all.
8. Retention function dry-run on synthetic out-of-window rows, then confirm the cron entry exists in `cron.job`.

## Step 4 — Phase 2: admin analytics

Only after Step 3 passes.

- New admin route `/admin/analytics` with tabs: Overview, Hub Analytics, Traffic Quality, Acquisition, Engagement, Conversions, plus placeholder tabs for Meta Tracking and Privacy & Consent (empty state pointing at Phases 3–4, Meta switch stays off).
- **Cutover logic:** a single admin-only reporting function reads legacy `personal_analytics` / `analytics_events` strictly `< cutover_at` and `analytics_hits` strictly `>= cutover_at`, then sums. No overlapping window, so no double counting. Every tile shows which source(s) fed it.
- Per-hub table: raw views, validated views, unique sessions, returning visitors, suspected bot events, internal/preview events, CTA interactions, top sources, conversion rate, and a date-range comparison. Labels say "events" where the number is events — never "visitors".
- `/rebornwraps` drill-down page reproducing the audit: raw 569 `profile_visit`, 53 crawler-UA events, 22 preview/localhost referrer events, 28 same-device-within-a-minute repeats, ~470–490 legitimate estimate, ~358 session estimate (explicitly labelled an estimate because legacy rows have no session ID), with each filter bucket explained and the post-cutover numbers shown separately as the trustworthy series.
- Mobile-responsive pass on the whole section.

## Not touched in this phase

Meta master switch stays `false`, test mode `true`; no Meta credentials requested or used until the dashboard, consent controls and privacy gating are done. No historical events are deleted or rewritten.
