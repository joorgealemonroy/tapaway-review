CREATE OR REPLACE FUNCTION public.get_claim_summary(_id uuid DEFAULT NULL, _slug text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  username text,
  display_name text,
  profile_photo_url text,
  header_image_url text,
  contact_name text,
  email text,
  trial_ends_at timestamp with time zone,
  subscription_status text,
  plan_type text,
  has_card_addon boolean,
  taps bigint,
  review_clicks bigint,
  vip_numbers bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    COALESCE(NULLIF(trim(p.full_name), ''), p.username) AS display_name,
    p.profile_photo_url,
    p.header_image_url,
    p.contact_name,
    p.email,
    p.trial_ends_at,
    p.subscription_status,
    p.plan_type,
    COALESCE(p.has_card_addon, false) AS has_card_addon,
    (SELECT count(*) FROM public.personal_analytics a
      WHERE a.profile_id = p.id AND a.event_type = 'profile_visit') AS taps,
    (SELECT count(*) FROM public.personal_analytics a
      WHERE a.profile_id = p.id
        AND a.event_type = 'link_click'
        AND (
          a.visitor_info->>'link_url' ILIKE '%search.google.com/local/writereview%'
          OR a.visitor_info->>'link_url' ILIKE '%google.com/maps%'
          OR a.visitor_info->>'link_url' ILIKE '%g.page%'
        )) AS review_clicks,
    (SELECT count(*) FROM public.personal_email_captures c
      WHERE c.profile_id = p.id AND COALESCE(trim(c.phone), '') <> '') AS vip_numbers
  FROM public.personal_profiles p
  WHERE (_id IS NOT NULL AND p.id = _id)
     OR (_slug IS NOT NULL AND lower(p.username) = lower(_slug))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_claim_summary(uuid, text) TO anon, authenticated, service_role;