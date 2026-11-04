# Recorded activity release

The payment invitation frontend is published. The analytics revision is not yet published.

## Reporting contract

- Filtered reports count recorded `analytics_hits` accepted by the traffic rules. This is not proof of human identity, NFC origin or downstream outcomes.
- Historical reports use the original personal/business activity tables. They are explicitly unfiltered, may overlap the filtered dataset, and must never be added to filtered totals. Session counts are unavailable, not zero.
- Both sources authorize the exact hub kind and ID against the caller, or require admin for global reports. A private client report/export contains only its selected hub.
- Totals aggregate in PostgreSQL. Activity uses `(occurred_at,id)` keyset pagination; hub lists are paginated. Queries and full exports retain the same inclusive start, exclusive end and server snapshot.
- Date labels use America/Los_Angeles. The daily chart includes partial boundary dates. Period session counts are distinct across the range, never sums of daily counts.
- Query identity includes the signed-in user and parent snapshot. Focus/reconnect do not silently replace a frozen report. Refresh and selection changes reset pagination.
- CSV cells are quoted and formula prefixes are neutralized even behind control characters. Exports fail on partial pagination or mismatched hub ownership.

## Remaining rollout work

Lovable stopped after the first source revision because the workspace exhausted its credits. A direct repository follow-up addresses history, cache identity, export safety and the failed security test fixture.

Before frontend publication:

1. Complete the exact-head release checks and browser fixtures, including narrow screens, delayed responses, both report sources and print/CSV.
2. Apply `0042_historical_analytics_reports.sql` through supported database deployment. Migrations 0040/0041 were already applied by Lovable; their Supabase replay copies must not be reapplied blindly.
3. Deploy `track` and `analytics-report` from the final source using Lovable or the connected Supabase project. The old collector's broad 30-second action guard must not be mistaken for the new scoped guard.
4. Reconcile 7/30/90-day filtered and historical reports against independent read-only database aggregates with identical bounds. Verify unauthorized access fails.
5. Publish through the native project deployment and verify the live routes. User authorization to publish is already present; no new permission is required for this rollout.

Use only isolated data/providers for testing. Do not create charges, emails, customer identities or synthetic production events.
