CREATE OR REPLACE FUNCTION public.is_username_available(check_username text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.personal_profiles
    WHERE username = lower(check_username)
  )
  AND NOT EXISTS (
    -- If checking "jorge", also block if "tapjorge" exists
    SELECT 1 FROM public.personal_profiles
    WHERE username = 'tap' || lower(check_username)
      AND lower(check_username) NOT LIKE 'tap%'
  )
  AND NOT EXISTS (
    -- If checking "tapjorge", also block if "jorge" exists
    SELECT 1 FROM public.personal_profiles
    WHERE lower(check_username) LIKE 'tap%'
      AND username = substring(lower(check_username) from 4)
  )
  AND NOT EXISTS (
    -- Business hubs share the same public /:slug namespace
    SELECT 1 FROM public.restaurants
    WHERE lower(custom_slug) = lower(check_username)
  )
$function$;

CREATE OR REPLACE FUNCTION public.admin_swap_hub_slug(_personal_id uuid, _restaurant_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _slug text;
  _r_slug text;
  _legacy text;
  _n int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT username INTO _slug FROM public.personal_profiles WHERE id = _personal_id;
  SELECT custom_slug INTO _r_slug FROM public.restaurants WHERE id = _restaurant_id;

  IF _slug IS NULL OR _r_slug IS NULL THEN
    RAISE EXCEPTION 'Hub not found';
  END IF;

  -- Target slug is the business hub's current slug
  _legacy := _r_slug || '-legacy';
  WHILE EXISTS (SELECT 1 FROM public.restaurants WHERE lower(custom_slug) = lower(_legacy))
     OR EXISTS (SELECT 1 FROM public.personal_profiles WHERE lower(username) = lower(_legacy)) LOOP
    _n := _n + 1;
    _legacy := _r_slug || '-legacy-' || _n;
  END LOOP;

  UPDATE public.restaurants SET custom_slug = _legacy WHERE id = _restaurant_id;
  UPDATE public.personal_profiles SET username = lower(_r_slug) WHERE id = _personal_id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'swap_hub_slug', 'personal_profile', _personal_id::text,
          jsonb_build_object('slug', _r_slug, 'previous_personal_slug', _slug,
                             'restaurant_id', _restaurant_id, 'restaurant_legacy_slug', _legacy));

  RETURN _r_slug;
END;
$function$;