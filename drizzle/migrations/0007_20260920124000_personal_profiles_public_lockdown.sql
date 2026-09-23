-- H-2 fix: the base personal_profiles table exposed EVERY column (email,
-- phone, Stripe IDs, internal flags) to anonymous callers via the
-- "Public can view profiles by username" SELECT policy
-- (subscription_status = 'active').
--
-- Public call-site audit (2026-09-20):
--   * Public hub rendering (UsernameResolver) goes through the
--     get_public_personal_profile() RPC, which returns only curated
--     display columns. Unaffected.
--   * serve-og-profile (anon key) queries the personal_profiles_public view
--     for id/username/full_name/headline/bio/profile_photo_url/
--     subscription_status. All present in the view.
--   * CardResolver / admin-preview reads hit the base table but only for the
--     viewer's own row or as an admin (covered by the owner/admin policies).
--
-- The view is therefore recreated SECURITY DEFINER (runs as the view owner,
-- postgres) so it keeps serving exactly its curated column list to anon/
-- authenticated callers after the base-table public policy is dropped. The
-- previous security_invoker incarnation would have returned zero rows once
-- the base policy went away, silently breaking OG tags.

DROP POLICY IF EXISTS "Public can view profiles by username" ON public.personal_profiles;

DROP VIEW IF EXISTS public.personal_profiles_public;

-- SECURITY DEFINER is deliberate here: this view IS the public API for
-- profile display data. Its column list is the allowlist; the base table is
-- no longer world-readable.
CREATE VIEW public.personal_profiles_public
WITH (security_invoker = false) AS
SELECT
  id,
  username,
  full_name,
  bio,
  headline,
  profile_photo_url,
  header_type,
  header_color,
  header_image_url,
  background_color,
  pfp_position,
  plan_type,
  subscription_status
FROM public.personal_profiles
WHERE subscription_status = 'active';

REVOKE ALL ON public.personal_profiles_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.personal_profiles_public TO anon, authenticated;