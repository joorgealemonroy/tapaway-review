

# Reset sugarbloomcakery Analytics to Start from April 11

## Problem
There are 68 analytics events for sugarbloomcakery recorded before April 11 (from April 9-10, likely during setup/testing). These inflate the stats and should be removed.

## Fix
Run a single DELETE query on `personal_analytics` to remove all events for profile `cc06cb55-87ab-4dc7-88f7-073d3bb38d27` where `created_at < '2026-04-11T00:00:00Z'`.

```sql
DELETE FROM personal_analytics
WHERE profile_id = 'cc06cb55-87ab-4dc7-88f7-073d3bb38d27'
  AND created_at < '2026-04-11T00:00:00Z';
```

No code or schema changes needed — just a one-time data cleanup.

## Files Changed
None — data-only operation.

