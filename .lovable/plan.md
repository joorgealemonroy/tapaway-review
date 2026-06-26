# Fix: Public personal hubs show no links (sugarbloomcakery)

## Root cause

The recent security pass removed Data-API grants on the personal tables. Current state in the database:

- `personal_links` — no grants for `anon` or `authenticated`
- `personal_blocks` — no grants for `anon` or `authenticated`
- `personal_profiles` — no grants for `anon` or `authenticated` (reads now go through `personal_profiles_public`)

The existing RLS policy `"Public can view links for active profiles"` (and the matching one on blocks) is correctly scoped to active profiles only — but PostgREST checks table-level GRANTs first and returns "permission denied" before RLS ever runs. Result: every public personal hub renders the profile shell (via the public view) but the links/blocks fetch comes back empty.

sugarbloom's row is healthy: 6 active, non-archived links and 1 active photo collage block, active monthly subscription.

## Fix

Single migration that restores the missing Data-API grants. We are NOT changing RLS — the existing policies already scope public reads to `is_active = true` AND active subscriptions, which is the intended public surface.

### Migration

```sql
-- personal_links: public hubs read these for active profiles
GRANT SELECT ON public.personal_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_links TO authenticated;
GRANT ALL ON public.personal_links TO service_role;

-- personal_blocks: same pattern
GRANT SELECT ON public.personal_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_blocks TO authenticated;
GRANT ALL ON public.personal_blocks TO service_role;

-- personal_profiles: keep anon OFF the base table (reads go through
-- personal_profiles_public view). Restore authenticated + service_role
-- so owners and edge functions can read/write their own row.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_profiles TO authenticated;
GRANT ALL ON public.personal_profiles TO service_role;
```

## Why anon SELECT on links/blocks is safe

Both tables have RLS enabled with a public SELECT policy that already filters to:
- `is_active = true`, AND
- `profile_id` belongs to a profile with `subscription_status = 'active'`

There are no sensitive columns on these tables (label, url, thumbnail, sort order, display style). This is the same posture personal hubs had before the security pass.

## Verification

1. Visit `/sugarbloomcakery` while signed out — all 6 links and the photo collage block render.
2. Spot-check one other personal hub (e.g. any active monthly profile) — links render.
3. Owner dashboard for sugarbloom still loads links normally (authenticated path).
4. Confirm `personal_profiles_public` view still serves the anon profile fetch (no regression in the hub header / hero).

## Out of scope

- No RLS changes.
- No code changes to `PersonalProfilePage.tsx` or the public hub resolver.
- Restaurant hubs are unaffected — they use a separate table and weren't touched.
