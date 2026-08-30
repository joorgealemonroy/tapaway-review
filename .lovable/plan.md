# Pay demo bonuses by submission date, not approval date

## The problem (confirmed in the data)

Today you approved a batch of demos submitted on Aug 5, Aug 27 and Aug 30. Because both the daily cap and the daily shift base are keyed off the moment the commission row is created (approval time), all of them landed on the same day, blew past the daily cap of 50, and 11 bonuses were written as `voided` with the note "Skipped: daily cap of 50 demos reached". Every one of those 11 belongs to a different, much earlier submission day.

Correct behavior: a demo earns for the day the rep submitted it. Approving a week later must not change what it pays.

## What changes

1. **Earned-on date on every commission**
   Add an additive `earned_on` date column to `commissions`. For demo bonuses it is the demo's submission timestamp (`personal_profiles.created_at`) in UTC, not the approval timestamp. `created_at` stays exactly as it is, so audit trails and payout history are untouched.

2. **Daily cap counted per earned day**
   `award-demo-commission` counts existing demo bonuses for the rep on the demo's *earned* day, and compares that against the daily cap. Approving 40 old demos today no longer consumes today's allowance.

3. **Daily shift base keyed to the earned day**
   The `award_daily_base_trigger` function groups by `earned_on` instead of `created_at`, and stamps the shift-base row with the same `earned_on` and the matching `Mon YYYY` period label. This means a rep who hit quota on Aug 27 gets Aug 27's $50 base, credited to Aug 27's period, even when you approve on Aug 30.

4. **Quality-gate cap uses the earned day too**
   The probation cap (first N demos per day) is likewise evaluated per earned day, for the same reason.

5. **Repair the 11 wrongly voided bonuses**
   Recompute each of the 11 `voided` demo bonuses against its true submission day. Any that fit within that day's cap is set back to `available` (or `locked_quality_gate` if the rep's gate genuinely applies), with the cap note cleared and `earned_on` backfilled. Anything that still legitimately exceeds its own day's cap stays voided with an accurate note. Then re-run the shift-base check per affected rep/day so missed $50 bases are created, and recompute the affected months' Closer's Pool.

6. **Backfill existing rows**
   All existing demo bonuses get `earned_on` set from their linked profile's submission date; other commission types fall back to their own `created_at`. Nothing is deleted and no amounts are reduced.

## Reporting

Rep commission views group by earned day so a rep's daily $50 base and demo bonuses line up with the day they actually worked, not the day you got around to approving.

## Technical notes

- Migration: `ALTER TABLE public.commissions ADD COLUMN earned_on date`, an index on `(rep_id, commission_type, earned_on)`, a backfill `UPDATE`, and a replacement `award_daily_base_trigger()` body. No drops, no destructive changes.
- Edge function `supabase/functions/award-demo-commission/index.ts`: read `personal_profiles.created_at`, derive `earnedOn`, count by `earned_on`, insert with `earned_on`.
- Repair runs as an explicit one-off SQL statement over exactly the 11 known voided IDs, reported back to you individually with rep, slug, submission date and new status.
- Frontend: `src/pages/rep/RepCommissions.tsx` date grouping switched to `earned_on` with a `created_at` fallback.

## Not touched

Payout history, paid commissions, subscription/billing data, hub access, and the amounts themselves.
