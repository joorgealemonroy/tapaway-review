## Root cause

The public hub for `sugarbloomcakery` (and every personal hub) shows **"No links yet"** to anonymous visitors even though the dashboard has 6 active links + a collage block.

The data is fine. The Data‑API grants are fine (anon has full CRUD). The bug is in the RLS policies on `personal_links` and `personal_blocks`:

```sql
-- current "Public can view links for active profiles" policy
USING (
  is_active = true
  AND profile_id IN (
    SELECT id FROM personal_profiles
    WHERE subscription_status = 'active'
  )
)
```

The subquery into `personal_profiles` is itself subject to RLS. `personal_profiles` only has policies for **owners** (`auth.uid() = user_id`) and **admins** (`is_admin()`). There is **no public‑read policy** on `personal_profiles`, so when an anonymous visitor evaluates the policy, the subquery returns 0 rows → every link/block is filtered out → "No links yet". Same story for `personal_blocks`.

This affects **every personal hub for signed‑out visitors**, not just sugarbloom.

## Fix

Replace the broken subquery with a `SECURITY DEFINER` helper that bypasses RLS to check the profile's active status. This keeps the existing intent (only show content for active subscriptions) without depending on `personal_profiles` RLS.

### Migration

1. Create `public.personal_profile_is_active(_profile_id uuid) returns boolean` — `SECURITY DEFINER`, `STABLE`, `search_path = public`. Returns `true` when the profile row exists and `subscription_status = 'active'`.
2. `REVOKE ALL ... FROM PUBLIC` then `GRANT EXECUTE` to `anon, authenticated`.
3. Drop and recreate the two policies:
   - `personal_links` → "Public can view links for active profiles": `USING (is_active = true AND public.personal_profile_is_active(profile_id))`
   - `personal_blocks` → "Public can view blocks on active profiles": same shape.

No application code changes. No grant changes. No schema changes to tables.

## Verification

- Re‑load `/sugarbloomcakery` while signed out — 6 links + collage render.
- Spot‑check 1–2 other paying hubs.
- Confirm an inactive/cancelled profile still renders empty.

## Why this won't regress

- The helper is `SECURITY DEFINER` and pinned `search_path`, so it cannot be hijacked.
- It only reveals a boolean derived from `subscription_status`; no PII leaves the function.
- Owner/admin policies are unchanged, so dashboards keep working exactly as today.
