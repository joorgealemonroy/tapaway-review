## Root cause (confirmed)

The five hubs in the "Changes Requested" list were never actually resubmitted. In the database all five are still `pipeline_status = 'changes_requested'` with `submitted_for_review_at = NULL`, even though the reps did the work.

Why: when a rep hits **Submit for review**, `handleSubmitForReview` in `src/pages/personal/PersonalDashboard.tsx` also writes `review_note: null` and `review_note_at: null`. The database trigger `guard_profile_approval_fields()` raises `Only an admin can edit the review note` for any non-admin who touches those columns, so the entire update is rejected and the rep sees only a generic "Failed to submit" toast.

The "Needs Fixing" links callout is separate and is real data: 4 hubs still store `https://facebook.com/facebook.com`. Left as-is for manual rep entry.

## Changes

1. **Unblock rep resubmits** — `src/pages/personal/PersonalDashboard.tsx`: drop `review_note` / `review_note_at` from the `handleSubmitForReview` payload. Send only `pipeline_status: 'ready_for_review'`, `submitted_for_review_at`, and the auto-generated slug.
2. **Stop silent failures** — same function: show the real Supabase `error.message` in the toast instead of "Failed to submit".
3. **Clear notes on approval** — `src/components/admin/AdminPendingHubApprovals.tsx`: the `approve()` update also sets `review_note: null` and `review_note_at: null`, so an approved hub never carries a stale rejection note. (Admins pass the trigger guard.)
4. **Hide resolved items** — `src/pages/rep/RepBusinesses.tsx`: the changes-requested filter already requires `!is_approved && pipeline_status === 'changes_requested'`; verify and keep it as the safety net.
5. **Data cleanup migration** — move the stuck hubs back into the admin queue:
   ```sql
   UPDATE public.personal_profiles
   SET pipeline_status = 'ready_for_review',
       submitted_for_review_at = now()
   WHERE pipeline_status = 'changes_requested'
     AND is_approved = false;
   ```
   Existing `review_note` values are kept for admin reference.

## Verification

- Full typecheck.
- Re-query `personal_profiles` to confirm the 5 hubs now read `ready_for_review`.

## Technical notes

- The `guard_profile_approval_fields()` trigger stays intact — it is a legitimate privilege guard; the client simply must not write those columns.
- The cleanup runs as a migration (service role), which bypasses the guard cleanly.
