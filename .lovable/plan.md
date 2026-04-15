

# Fix: Analytics showing 0 for sugarbloomcakery (RLS issue)

## Root Cause
The `personal_analytics` table has a SELECT RLS policy that only allows profile owners to view their analytics:
```sql
profile_id IN (SELECT id FROM personal_profiles WHERE user_id = auth.uid())
```

When you (admin) view sugarbloomcakery's dashboard via `admin_view_personal`, you're not the profile owner, so RLS blocks all reads → everything shows 0.

**The tracking itself works fine** — there are 72 profile visits and 41 link clicks in the database for sugarbloomcakery.

## Fix
Update the SELECT RLS policy on `personal_analytics` to also allow admin access:

```sql
DROP POLICY "Users can view their own analytics" ON personal_analytics;
CREATE POLICY "Users and admins can view analytics"
  ON personal_analytics FOR SELECT TO authenticated
  USING (
    profile_id IN (SELECT id FROM personal_profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );
```

## Files Changed
- One database migration (RLS policy update on `personal_analytics`)

No code changes needed — the UI and tracking logic are already correct.
