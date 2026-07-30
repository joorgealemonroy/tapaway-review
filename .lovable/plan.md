## Root cause (verified against the live database)

The $50 daily base never lands because the insert is **rejected**, not missing:

- `commissions.type` has a CHECK allowing only `close` or `bonus`; the edge function inserts the base with `type: 'shift_base'` → constraint violation, logged with `console.error` and swallowed, so approval still "succeeds" and the rep silently loses $50.
- Data confirms it: rep `05a4…5433` has **15 demo bonuses on 2026-07-28 and zero base rows**.

Two corrections to the SQL in the request (real schema differs):
- Settings columns are `daily_shift_quota` (10) and `daily_shift_base_amount` (50) — not `daily_demo_quota` / `daily_base_amount`.
- The commissions column is `note`, not `notes`; `type` and `period_label` are NOT NULL, so both must be supplied (`type = 'bonus'`).
- The unique index already exists as `commissions_shift_base_daily_unique` on (`rep_id`, UTC day) where `commission_type = 'shift_base'` — that is what enforces exactly one base per day. I'll keep the `CREATE UNIQUE INDEX IF NOT EXISTS` as a no-op safety net.

### 1. Migration: trigger + backfill
- `award_daily_base_trigger()` — `SECURITY DEFINER`, `search_path = public`, `AFTER INSERT` on `commissions`, only acting on `commission_type = 'demo_bonus'`:
  - reads `daily_shift_quota` / `daily_shift_base_amount` from `rep_compensation_settings`
  - counts that rep's `demo_bonus` rows for the same UTC day
  - once the count reaches the quota, inserts one base row: `type = 'bonus'`, `commission_type = 'shift_base'`, `amount = 50`, `status = 'available'`, `period_label` filled, `note = 'Earned Daily Base (Trigger)'`, `created_at` stamped at the crossing moment
  - `ON CONFLICT DO NOTHING` → **exactly one $50 base per rep per day**, no matter how many demos (40 demos = $200 bonuses + $50 base = $250)
- Backfill: every rep/day with quota-meeting demo bonuses and no base gets the missing $50 as `available`, noted as a historical backfill (credits the 2026-07-28 day).

### 2. Edge function cleanup
`supabase/functions/award-demo-commission/index.ts` keeps the `demo_bonus` insert, the quality gate, and the Closer's Pool recompute. The entire shift-base counting/insert block is deleted so the trigger is the single owner.

### 3. Verification
- Audit query: rep/day groups with quota-meeting demo bonuses and 0 base rows must return zero rows; and no rep/day has more than one base row.
- Typecheck.
- `RepCommissions.tsx` already sums `status = 'available'` and labels `shift_base` as "Daily Base ($50)" — confirm Available Balance rises by the backfilled amount; no UI change expected.
