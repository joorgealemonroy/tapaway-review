## Diagnosis

The opt-in **did** save successfully — Jorge Monroy's row is in `personal_email_captures` with `sms_opt_in=true` for profile `socials`. The dashboard shows "0" because of an RLS gap, not a write failure.

**Root cause:** The `personal_email_captures` SELECT policy only allows the profile's owning user:

```sql
USING (EXISTS (SELECT 1 FROM personal_profiles
               WHERE personal_profiles.id = personal_email_captures.profile_id
                 AND personal_profiles.user_id = auth.uid()))
```

You are currently viewing this dashboard via admin impersonation (`?admin_view_personal=...`). Admins are not included in the policy, so the subscriber count query returns 0 — even though the row exists. (For comparison, `sms_campaigns` already has an `is_admin()` policy and works correctly under impersonation.)

## Fix

Add an admin-read policy to `personal_email_captures` mirroring the one on `sms_campaigns`, via a new migration:

```sql
CREATE POLICY "Admins can view all email captures"
  ON public.personal_email_captures
  FOR SELECT
  USING (public.is_admin());
```

That's the only change. No frontend or edge function changes are needed — the existing query in `SmsMarketingTab.tsx` (filtered by `profile_id` + `sms_opt_in=true`) will then return the correct count for both the profile owner and admins viewing via impersonation.

## Verification after deploy

1. Reload the SMS tab — "Total SMS Subscribers" should show **1** (Jorge Monroy).
2. The actual owner of `@socials` will also continue to see their own subscribers (their existing policy is untouched).
