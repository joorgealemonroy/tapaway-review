# Undo approval-generated account names

## Verified cause

`AdminPendingHubApprovals` currently fills an empty `full_name` during approval by converting the profile username/slug into a name. That is why intentionally blank names become values such as `Xolcoffee`, `Canabrucoffee`, and `Doghausbiergarten`.

A read-only database audit found **58 approved rep-created profiles** whose current `full_name` exactly matches this generated username transformation. Their updates are clustered in the recent approval/backfill operations, and `xolcoffee` is in this set. Profiles with independently supplied names that do not exactly match the generated value are excluded.

## Changes

1. **Stop future name creation on approval**
   - Remove the `humanizeSlug` name fallback from the approval handler.
   - Approval will update approval, plan, pipeline, and review-note fields only; it will leave `full_name` untouched, including when blank.

2. **Undo generated names safely**
   - Run a targeted data correction that clears `full_name` only for the audited 58 profiles where:
     - the profile is approved and rep-created;
     - the current value exactly equals the deterministic username-derived value; and
     - the update belongs to the identified recent approval/backfill window.
   - Include `xolcoffee` explicitly in verification.
   - Do not change usernames, hub content, approval state, access, billing, subscriptions, analytics, locations, or legitimate manually entered names.

3. **Verify**
   - Confirm all targeted profiles now have blank `full_name` and remain approved/live.
   - Confirm `xolcoffee` is blank again.
   - Confirm a blank-name approval no longer writes a generated name.
   - Run the project typecheck and verify the admin approval flow still completes normally.

## Technical scope

- Frontend: `src/components/admin/AdminPendingHubApprovals.tsx`
- Data correction: one narrowly scoped database update against `public.personal_profiles`; no schema migration is needed.
