# Recorded activity release

The payment invitation frontend was already published. The analytics revision and rep hub editing/preview fixes were published on 2026-11-06 from `07c1633904256c2ef534419cc6da982dcac27b75`.

## Reporting contract

- Filtered reports count recorded `analytics_hits` accepted by the traffic rules. This is not proof of human identity, NFC origin or downstream outcomes.
- Historical reports use the original personal/business activity tables. They are explicitly unfiltered, may overlap the filtered dataset, and must never be added to filtered totals. Session counts are unavailable, not zero.
- Both sources authorize the exact hub kind and ID against the caller, or require admin for global reports. A private client report/export contains only its selected hub.
- Totals aggregate in PostgreSQL. Activity uses `(occurred_at,id)` keyset pagination; hub lists are paginated. Queries and full exports retain the same inclusive start, exclusive end and server snapshot.
- Date labels use America/Los_Angeles. The daily chart includes partial boundary dates. Period session counts are distinct across the range, never sums of daily counts.
- Query identity includes the signed-in user and parent snapshot. Focus/reconnect do not silently replace a frozen report. Refresh and selection changes reset pagination.
- CSV cells are quoted and formula prefixes are neutralized even behind control characters. Exports fail on partial pagination or mismatched hub ownership.

## Mounted surfaces and coverage

`/admin` mounts `AdminOverview` using `admin-billing-summary`; the obsolete `useAdminOverview` hook is unchanged. `/admin/analytics` mounts `AdminAnalytics`, with explicit source selection for rankings, recent activity and private client reports. Restaurant stats mount `AnalyticsOverview`/`CanonicalHubReport`; personal overview and advanced stats mount `CanonicalHubReport`. Both client report kinds offer the historical source. Decorative business engagement is not a traffic report.

Global canonical configuration: cutover `2026-08-30T07:19:04.315478Z`, raw retention 400 days. This is **not** evidence that business tracking began then. Read-only production before publication contained zero canonical business rows and 1,419 original business records (latest `2026-11-06T01:24:53.447712Z`), compared with the earlier audit's 1,413. Forward business wiring is now published; those pre-release counts do not demonstrate post-release traffic. Historical counts are original records, not deduplicated humans; no backfill or merged totals.

## Backend and validation (2026-11-06)

- Supported migration workflow applied pending 0042 plus an identical idempotent 0043 report definition; both SQL hashes are `3e9f3eb675042709815a9ef15040288d6a88a7fc7d914ac40a7faae17dc0df0c`. Existing 0040/0041 remain applied. No manual ledger edits. Generated types refreshed.
- Deployed exactly `track` and `analytics-report`; GET track returned 405 and invalid authenticated report returned 401. Both report RPCs deny anonymous execution, allow authenticated execution, and authorize kind+hub ownership inside a fixed-search-path function.
- `QA_MODULES=/tmp/stats-qa/node_modules npm run test:release`: 28 suites passed, including 12 isolated canonical/historical SQL checks and export safety checks. `npm run security:source`: passed. `npm run security:test`: 11 checks passed. No real provider transactions.
- Browser fixture command `python3 scripts/check-rep-analytics-browser.py`: 320/360/390/1280 widths, source/date changes, activity pagination, full CSV/print, slow/range-switch responses, error/retry and empty states, no overflow; fixture screenshots reviewed. Authenticated production admin reports were read through the actual UI/client with collectors intercepted, without producing analytics.

### Frozen production reconciliation

All reports use exclusive end/as-of `2026-11-06T03:51:00Z`; each start is exactly 7/30/90 days earlier. Independently aggregated SQL and authenticated RPC totals match:

| Source | Days | Recorded events | Hub views | Link actions | Saves | Sessions | Active hubs |
|---|---:|---:|---:|---:|---:|---:|---:|
| Validated | 7 | 144 | 99 | 14 | 0 | 117 | 22 |
| Validated | 30 | 1050 | 311 | 53 | 1 | 545 | 28 |
| Validated | 90 | 3652 | 743 | 243 | 8 | 1857 | 37 |
| Historical / unfiltered | 7 | 60 | 39 | 21 | 0 | Not recorded | 3 |
| Historical / unfiltered | 30 | 81 | 55 | 26 | 0 | Not recorded | 6 |
| Historical / unfiltered | 90 | 1092 | 885 | 206 | 1 | Not recorded | 109 |

Validated website views are 23/589/2401 respectively; excluded rows are 146/920/2503. Sessions include website and hub view sessions, not people. Customer rows were never written; current counts are 145 personal profiles and 14 restaurants, zero invitations.

## Final publication and independent verification (2026-11-06)

- Exact application commit `07c1633904256c2ef534419cc6da982dcac27b75` passed GitHub Actions run `42159805784`: 28 release suites, source/security checks, TypeScript, production build/artifact scan, four-width browser checks and production dependency audit (zero vulnerabilities).
- Published through Lovable deployment `ed640e17-29c6-496e-aebc-5438a790b5c5`. `https://tapaway.co` served the new `index-BFCd6woc.js` bundle and updated personal dashboard/admin analytics/client report chunks. The published source includes the rep preview gate and both report source labels.
- Independent read-only reconciliation at exclusive end `2026-11-06T03:53:44Z` matched direct aggregates to both report RPCs over 7/30/90 days, including activity counts and daily event sums. Authenticated own-hub access, cross-kind/cross-owner denial, non-admin global denial and anonymous denial were verified in rolled-back role-context transactions.
- The affected Deadbeet Coffee draft retains its saved five links and four blocks. Its active assigned rep can read them under RLS; an unrelated identity cannot. A live anonymous browser visit to the explicit rep-preview URL still displays the paused public page. Authorized draft preview and link autosave passed the production-build browser fixtures; no real rep sign-in or customer content mutation was required.
- Rep preview bypasses only the public display gate for an authenticated, active assigned rep (or admin), remains uncached publicly, and does not generate analytics. It does not approve or activate a draft. Existing plan/username addresses are preserved, and NFC destination edits are limited to the current hub.
- One Lovable backend request reported 7.648 credits. No additional AI build prompt was used for publication. Real customer purchases, invitation sends and downstream human/NFC attribution are outside this release verification.
