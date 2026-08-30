# Pay demo bonuses by submission day (Pacific), atomically and reversibly

## The problem (confirmed in the data)

Today's approval batch covered demos submitted Aug 5, Aug 26/27 and Aug 29/30. Both the daily cap and the daily shift base are keyed to the moment the commission row is created (approval time), so all of them landed on one day, exceeded the cap of 50, and 11 bonuses were written as `voided` with the note "Skipped: daily cap of 50 demos reached". None of the 11 is paid.

A demo must earn for the workday the rep submitted it. Approving a week later cannot change what it pays.

## 1. The earned workday is the California business day

Earned day = `(personal_profiles.created_at AT TIME ZONE 'America/Los_Angeles')::date`. The same Pacific day drives the cap, the quality-gate position, the daily base and the `Mon YYYY` period label. The original UTC timestamp is preserved untouched in `created_at`.

There is no per-rep timezone column today (checked `sales_reps` and `rep_compensation_settings`), so `America/Los_Angeles` is the documented fallback and the only value used. If a rep timezone column is added later, the derivation reads it and falls back to Pacific.

### Pacific vs UTC for the 11 affected rows (reported before any update)

Five of the 11 shift to an earlier day under Pacific time:

```text
slug                          submitted (UTC)        UTC day     Pacific day
nosyneighborscoffee           2026-08-05 07:36:52    2026-08-05  2026-08-05
dumontcreamerycafe            2026-08-27 05:48:08    2026-08-27  2026-08-26  *
thealley                      2026-08-27 06:14:41    2026-08-27  2026-08-26  *
stateracafe                   2026-08-27 06:26:01    2026-08-27  2026-08-26  *
bubblicityboba                2026-08-27 06:30:28    2026-08-27  2026-08-26  *
teaspoonrc                    2026-08-27 06:34:14    2026-08-27  2026-08-26  *
moon-coffee-and-tea           2026-08-27 06:41:46    2026-08-27  2026-08-26  *
canvascoffee                  2026-08-27 06:50:28    2026-08-27  2026-08-26  *
dailybrewcoffeehousebakery    2026-08-27 06:55:24    2026-08-27  2026-08-26  *
liftcoffeeroasters            2026-08-27 19:28:41    2026-08-27  2026-08-27
poorhousebistro               2026-08-30 06:11:23    2026-08-30  2026-08-29  *
```

Under Pacific the Aug-27 cluster becomes an Aug-26 evening shift, which matches when the rep actually worked.

## 2. Awarding becomes atomic and idempotent

No more "count, then insert" from the edge function — two simultaneous approvals could both pass the cap. Instead a single service-role-only database function does everything in one transaction:

1. Take an advisory lock on (rep, earned_on).
2. Return early if a demo commission already exists for that source profile.
3. Compute the deterministic position within the earned day, ordered by submission timestamp then profile ID — never by which approval request arrived first.
4. Apply the cap and the quality gate to that position.
5. Insert the demo commission.
6. Check and create the daily base for that rep/earned day.
7. Return the resulting status and human-readable reason.

Uniqueness is enforced in the database: one demo commission per source profile, and one daily-base commission per rep per earned day. The edge function keeps the admin authorization check and simply calls the RPC.

## 3. The 11-row repair is frozen and guarded

The exact 11 commission IDs are frozen up front and a dry run is shown before anything changes. A row is repaired only if it is still voided, still carries the exact daily-cap reason, is not paid / not in a payout / not reversed / not manually adjusted, and is still linked to the expected profile and rep. Anything failing a check is left alone and reported.

The dry run and the final report both list, per row: rep, slug, submission timestamp, Pacific earned day, previous status, new status, reason.

After the repair, the result is verified through the affected rep's own authenticated view — not just the service-role client — to confirm eligible bonuses read as available for payout and are counted in the available total. The commission queries are invalidated after approval so the UI cannot keep showing a stale voided row.

## 4. Payouts and the Closer's Pool are protected

The Closer's Pool recomputation is previewed before it is applied. Paid or closed payout periods are never rewritten; if a closed period needs correction, an auditable adjustment entry is created instead. A before/after check confirms no rep's paid or available total decreases as a side effect.

## 5. Backfill validation

`earned_on` is backfilled for existing demo commissions from their linked profile's submission timestamp. Any demo commission that cannot be linked to a profile submission timestamp is reported explicitly rather than being given a guessed date. Other commission types fall back to their existing `created_at`.

## Technical notes

- Migration (additive only): `commissions.earned_on date`, index on `(rep_id, commission_type, earned_on)`, partial unique index on `(personal_profile_id)` for demo bonuses and on `(rep_id, earned_on)` for shift bases, a validated backfill, the new `private.award_demo_commission(...)` RPC granted to `service_role` only, and a rewritten `award_daily_base_trigger()` that groups by `earned_on`.
- Edge function `supabase/functions/award-demo-commission/index.ts`: keeps the admin check, then calls the RPC and returns its status/reason.
- Repair runs as an explicit one-off statement over the frozen 11 IDs, dry run first.
- Frontend `src/pages/rep/RepCommissions.tsx`: group by `earned_on` with a `created_at` fallback, and invalidate the commissions query after an approval.

## Not touched

Paid commissions, payout history, subscriptions and billing, hub access, historical analytics, and the bonus amounts themselves.
