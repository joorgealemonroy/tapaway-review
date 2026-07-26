# Fix broken personal hubs + add live monitoring

## Root cause (verified)

`https://tapaway.co/rebornwraps` and `/sugarbloomcakery` render 404 because the anon Data-API request to `personal_profiles_public` returns `42501 permission denied for table personal_profiles`.

Verified:
- Both rows exist with `subscription_status = 'active'` and `is_approved = true`, and are returned by the view under service role.
- `personal_profiles_public` is defined `WITH (security_invoker = true)`, so PostgREST evaluates the caller's grants + RLS on the base table `personal_profiles`.
- `personal_profiles` has **no** SELECT policy for `anon` (only owner / admin / rep policies), and `personal_profiles_public` has **no grants at all** (not to `anon`, not to `authenticated`).
- Restaurant hubs work because they go through the `get_public_restaurant_hub` SECURITY DEFINER RPC instead of a view.

Net effect: any anon visit to a personal slug is denied, and `UsernameResolver` falls through to the NotFound branch. This affects every personal hub for logged-out visitors, not just these two — the ones that "worked" in the past were likely opened while a session was active or via the RPC path.

## Fix

### 1. Restore public read access to approved personal hubs

Migration:
- `GRANT SELECT ON public.personal_profiles_public TO anon, authenticated;`
- Add a narrow SELECT policy on `public.personal_profiles` that only exposes publicly-visible rows to `anon` and `authenticated`:
  ```
  CREATE POLICY "Public can view approved active profiles"
    ON public.personal_profiles
    FOR SELECT
    TO anon, authenticated
    USING (
      subscription_status = 'active'
      OR (subscription_status = 'trialing' AND is_approved = true)
    );
  ```
  This is required because the view uses `security_invoker=true`; without a matching base-table policy the view will keep failing.
- Also fix the current view's boolean precedence bug: `active OR trialing AND is_approved` parses as `active OR (trialing AND is_approved)` — that's what we actually want, but re-create the view with explicit parens plus `security_invoker=true` so the intent is unambiguous.
- `GRANT SELECT` on the view is scoped; sensitive columns (email, stripe_*, tokens, phone-of-owner, etc.) stay excluded because the view already whitelists columns. Base-table policy is SELECT-only and still filters rows, so no private drafts leak.

### 2. Client fallback hardening in `src/pages/UsernameResolver.tsx`

Currently, if the anon view query errors (as it does today), the code silently treats it as "no row" and continues to a NotFound. Change the resolver to:
- Keep the primary `personal_profiles_public` lookup.
- Log the error to the console (so future regressions are visible), and still fall through to the restaurant RPC. No behavior change once the grants are fixed, but it prevents another silent outage.

## Add a live-hub health monitor

### 3. New SECURITY DEFINER RPC `get_hub_health()`

Returns one row per hub the platform believes should be publicly live:
- `slug`, `kind` (`personal` | `restaurant`), `owner_label`, `expected_status` (`live` | `expired`), plus the visibility flags actually stored (`subscription_status`, `is_approved`, `expires_at`).
- Restricted to admins via `is_admin()` guard.

### 4. Admin page `src/pages/admin/AdminHubHealth.tsx`

- Reachable from the existing admin nav (add link next to Preflight).
- On load: calls `get_hub_health()` and, for every slug expected to be live, fires an anon `fetch` against `/rest/v1/personal_profiles_public?...` or `/rest/v1/rpc/get_public_restaurant_hub` using the publishable key (same code path as a real visitor).
- Renders a table: slug, kind, expected, actual (`200 + row` / `200 + empty` / `4xx`), a "Retest" button per row, and a "Retest all" button.
- Any red rows are surfaced at the top with the exact error body so the next regression is diagnosed in one click.

### 5. Extend `scripts/check-public-hubs.mjs`

- Add `rebornwraps` and `sugarbloomcakery` to the fixed checks so this exact regression is caught in CI.
- Add a mode that pulls the list from `get_hub_health()` (service-role) and asserts every "expected live" slug is anon-visible. This is the same check the admin page runs, just headless.

## Verification

- After migration: `curl` the anon endpoint for both slugs → expect 200 + one row.
- Load `/rebornwraps` and `/sugarbloomcakery` in Playwright anon session → expect the hub, not the 404.
- Load `/islasmarias` and one trialing+approved demo → still work.
- Load an unapproved trial slug → still 404 for anon, still previewable by admin/rep.
- Open the new Admin Hub Health page → all rows green.

## Technical notes

- No changes to `personal_profiles` INSERT/UPDATE/DELETE policies. The new policy is SELECT-only and strictly narrower than "anon can read everything".
- We keep `security_invoker=true` on the view (per the project's DB security baseline memory) rather than switching to a definer view.
- No edge functions or client business logic change beyond the resolver's error logging and the new admin page.
