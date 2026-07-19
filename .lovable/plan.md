## 1. Resolver: allow approved trialing demos to render publicly

**`src/pages/UsernameResolver.tsx`**
- Add `is_approved` to the select on `personal_profiles_public`.
- Change the render gate from `subscription_status === 'active'` to:
  `subscription_status === 'active' || (subscription_status === 'trialing' && is_approved === true)`

**`src/hooks/useProfileData.ts`**
- Add `is_approved` to the select.
- Same predicate: fail out only when neither active nor (trialing + approved).

Everything else (restaurant slug fallback, 404 path, caching) stays as-is.

## 2. Auto-generate vanity slug on "Submit for review"

Where the rep's submit banner action lives in `PersonalDashboard.tsx`, extend the submit handler:

1. Load the current profile's `username` and `full_name`.
2. If `username` starts with `demo-`, derive a slug from `full_name`:
   - lowercase, trim
   - replace any non `[a-z0-9]` run with `-`
   - collapse repeats and strip leading/trailing `-`
   - fall back to the existing `demo-xxxxx` if the derived base is empty
3. Ensure uniqueness against `personal_profiles`:
   - Query `username` in `(base, base-2, base-3, ...)`; pick the lowest suffix not taken.
   - Also respect the existing `is_username_available` DB function's "tap"-prefix collision rules — call it and increment on false.
   - Cap attempts (e.g. 25) to avoid runaway loops; on exhaustion, keep the placeholder and surface a toast so admin can rename manually.
4. Single UPDATE on `personal_profiles` sets, together:
   - `username` = new slug (only when changed)
   - `pipeline_status = 'ready_for_review'`
   - `submitted_for_review_at = now()`
5. On success, refresh in-memory profile state and show the submit toast with the new public URL.

If `username` doesn't start with `demo-` (rep already customized it), skip slug generation and just flip the status fields.

## 3. Verification

- Reload `tapaway.co/demo-dk8kc4` — should now render (approved, trialing).
- `demo-rjcutj` still 404s until approved (expected).
- Create a fresh demo, set business name "Something Eats", click Submit → username becomes `something-eats` (or `something-eats-2` if taken), status flips to `ready_for_review`.
- Admin approval flow untouched; approved profile resolves at the new clean slug.

## Files touched

- `src/pages/UsernameResolver.tsx`
- `src/hooks/useProfileData.ts`
- `src/pages/personal/PersonalDashboard.tsx` (submit-for-review handler)

No DB migration required. No RLS changes.
