# Rep Compensation Overhaul

## Goals
1. Approvals actually produce commission rows so the rep's Commissions page reflects real earnings.
2. Daily cap = 50 completed demos (max earning ceiling); quota = 10 demos = "paid day" unlocked.
3. Remove 10% lifetime recurring. Replace with (a) a one-time **Annual Upsell Bounty** and (b) a monthly **Closer's Bonus Pool** with tiered milestones. Add a **Quality Gate** so the $300 daily cap is only unlockable after a 5% conversion rate is proven.

---

## 1. New comp structure (final numbers)

| Component | Amount | Trigger |
|---|---|---|
| Daily Shift Base | **$50/day** | Awarded once/day when rep hits 10 approved demos |
| Per-Demo Production Bonus | **$5/demo** | Each approved demo, capped at 50/day (max $250 bonus + $50 base = $300/day) |
| Annual Upsell Bounty | **$75** | Rep-created hub converts to an **annual** Solo/Venue plan |
| Monthly Closer's Pool | **$250 / $600 / $1,200** | 10 / 20 / 35 converted paid subs in a calendar month |
| Recurring % | **REMOVED** | — |

**Quality Gate (new):** For a rep's first 30 days OR any rep whose 30-day conversion rate < 5%, the daily earnings cap drops from $300 → $150 (10 demos base + 20 bonus demos). Prevents junk-hub farming.

---

## 2. Approval → commission wiring

Edit `src/components/admin/AdminPendingHubApprovals.tsx` `approve()`:
- After the `is_approved = true` update succeeds, call a new edge function `award-demo-commission` (service role) that:
  1. Inserts a `commissions` row: `commission_type='demo_bonus'`, `amount=5`, `status='available'`, `period_label=<Mon YYYY>`, linked to `rep_id` and `personal_profile_id` (add nullable `personal_profile_id` column to `commissions`).
  2. Counts today's approved demos for that rep. If count just crossed 10 AND no `shift_base` row exists for today, insert one `commission_type='shift_base'`, `amount=50`.
  3. Re-evaluates monthly closer pool milestones (see §4).
- Idempotent: unique index on `(rep_id, personal_profile_id, commission_type)` for `demo_bonus`; unique on `(rep_id, DATE(created_at))` for `shift_base`.

## 3. Conversion → Annual Upsell Bounty

Edit `supabase/functions/stripe-webhook/index.ts`:
- Remove the block that inserts `commission_type='recurring'` rows.
- On `checkout.session.completed` / first successful invoice for a rep-attributed personal profile:
  - If billing interval = `year` → insert `commission_type='annual_bounty'`, `amount=75`, `status='available'` (no clawback per user).
  - If billing interval = `month` → do NOT insert per-sale row; the monthly pool (§4) handles it.
- Also trigger a monthly-pool recount for the rep.

## 4. Monthly Closer's Bonus Pool

New DB helper `recompute_closer_pool(_rep_id, _period_label)`:
- Counts paid conversions (`personal_profiles.subscription_status='active'` attributed to rep in that month).
- Ensures exactly one `commission_type='closer_pool'` row per tier hit: $250 at 10, $600 at 20, $1,200 at 35 (only the highest earned tier is kept; delete/upgrade lower tier if a higher one is hit).
- Called from the approval function and the stripe webhook.

## 5. Quality Gate enforcement

- Add computed field in `award-demo-commission`: if rep is <30 days old OR (paid conversions / approved demos over trailing 30 days) < 5%, mark today's `demo_bonus` rows above index 20 as `status='locked_quality_gate'` (still visible, not payable).
- `RepHome.tsx` shows a banner: "Quality Gate active — max $150/day until your first 5% conversion rate."

## 6. UI updates

**`src/pages/rep/RepHome.tsx`**
- Change the third metric card from "Active Monthly Stream / 10% Recurring" → **"This Month's Bounties"**: sum of `annual_bounty` + `closer_pool` for current period. Show next milestone progress bar ("3 / 10 conversions to unlock $250").
- "How You Get Paid" section rewritten with the new 4-row breakdown (Base, Production Bonus, Annual Bounty, Closer's Pool). Remove "10% Monthly Recurring" copy.
- Show quality-gate banner when active.

**`src/pages/rep/RepCommissions.tsx`**
- Filter options: replace `recurring` with `annual_bounty`, `closer_pool`, `demo_bonus`.
- Label map: `demo_bonus → "Demo Bonus ($5)"`, `annual_bounty → "Annual Bounty ($75)"`, `closer_pool → "Closer's Pool"`, `shift_base → "Daily Base ($50)"`.
- Add "This Month Summary" tiles at top: Approved Demos · Paid Conversions · Bounties Earned.

**`src/pages/rep/RepDocs.tsx`**
- Rewrite step describing "10% recurring" → describe Annual Bounty + Closer's Pool.

**`src/pages/admin/AdminCompSettings.tsx`**
- Remove the 4 `*_recurring` inputs.
- Add `annual_bounty_amount`, `closer_pool_tier1/2/3_count`, `closer_pool_tier1/2/3_amount`, `quality_gate_min_rate`, `quality_gate_probation_days`.

## 7. DB migration

```text
- ALTER TABLE commissions
    ADD COLUMN personal_profile_id uuid REFERENCES personal_profiles(id) ON DELETE SET NULL;
- CREATE UNIQUE INDEX commissions_demo_bonus_unique
    ON commissions (rep_id, personal_profile_id)
    WHERE commission_type = 'demo_bonus';
- CREATE UNIQUE INDEX commissions_shift_base_daily_unique
    ON commissions (rep_id, (created_at::date))
    WHERE commission_type = 'shift_base';
- ALTER TABLE rep_compensation_settings
    DROP COLUMN restaurant_annual_recurring, DROP COLUMN restaurant_monthly_recurring,
    DROP COLUMN lite_annual_recurring,        DROP COLUMN lite_monthly_recurring,
    ADD COLUMN annual_bounty_amount numeric NOT NULL DEFAULT 75,
    ADD COLUMN closer_pool_tier1_count int NOT NULL DEFAULT 10,
    ADD COLUMN closer_pool_tier1_amount numeric NOT NULL DEFAULT 250,
    ADD COLUMN closer_pool_tier2_count int NOT NULL DEFAULT 20,
    ADD COLUMN closer_pool_tier2_amount numeric NOT NULL DEFAULT 600,
    ADD COLUMN closer_pool_tier3_count int NOT NULL DEFAULT 35,
    ADD COLUMN closer_pool_tier3_amount numeric NOT NULL DEFAULT 1200,
    ADD COLUMN quality_gate_min_rate numeric NOT NULL DEFAULT 0.05,
    ADD COLUMN quality_gate_probation_days int NOT NULL DEFAULT 30;
- Backfill: no historical `recurring` rows are deleted — they remain paid history.
```

## 8. Verification

1. Approve 3 demos as admin → rep sees three $5 rows appear immediately in `/rep/commissions`.
2. Approve a 10th demo → one $50 shift_base row appears.
3. Approve up to 50 → cap enforced, no extra bonus rows created after #50.
4. Stripe test webhook: annual conversion → $75 bounty row. 10 monthly conversions → $250 closer pool row; 20 → upgraded to $600; 35 → upgraded to $1,200.
5. New rep with <5% conversion → daily earnings dashboard capped at $150.
6. Confirm no `recurring` rows are ever inserted post-migration.
