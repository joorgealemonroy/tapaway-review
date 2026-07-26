-- security_invoker=true requires anon to have base-table access, which would expose
-- private columns (email, stripe_*, etc). Flip the view back to owner-based so only
-- the whitelisted columns and the view's own row filter are visible to anon.
ALTER VIEW public.personal_profiles_public SET (security_invoker = false);
GRANT SELECT ON public.personal_profiles_public TO anon, authenticated;