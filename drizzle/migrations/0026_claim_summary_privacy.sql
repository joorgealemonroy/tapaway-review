-- The public claim page needs branding, not account contact details or private analytics.
-- Keep the existing signature so rep links and existing clients remain compatible.
CREATE OR REPLACE FUNCTION public.get_claim_summary(_id uuid DEFAULT NULL,_slug text DEFAULT NULL)
RETURNS TABLE(id uuid,username text,display_name text,profile_photo_url text,header_image_url text,contact_name text,email text,trial_ends_at timestamptz,subscription_status text,plan_type text,has_card_addon boolean,taps bigint,review_clicks bigint,vip_numbers bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.id,p.username,COALESCE(NULLIF(trim(p.full_name),''),p.username),p.profile_photo_url,p.header_image_url,
 CASE WHEN access.private THEN p.contact_name ELSE NULL END,
 CASE WHEN access.private THEN p.email ELSE NULL END,
 p.trial_ends_at,p.subscription_status,p.plan_type,COALESCE(p.has_card_addon,false),
 CASE WHEN access.private THEN (SELECT count(*) FROM personal_analytics a WHERE a.profile_id=p.id AND a.event_type='profile_visit') ELSE 0 END,
 CASE WHEN access.private THEN (SELECT count(*) FROM personal_analytics a WHERE a.profile_id=p.id AND a.event_type='link_click' AND (a.visitor_info->>'link_url' ILIKE '%search.google.com/local/writereview%' OR a.visitor_info->>'link_url' ILIKE '%google.com/maps%' OR a.visitor_info->>'link_url' ILIKE '%g.page%')) ELSE 0 END,
 CASE WHEN access.private THEN (SELECT count(*) FROM personal_email_captures c WHERE c.profile_id=p.id AND COALESCE(trim(c.phone),'')<>'') ELSE 0 END
 FROM personal_profiles p
 CROSS JOIN LATERAL (SELECT (public.is_admin() OR auth.uid()=p.user_id OR auth.uid()=p.sales_rep_id OR auth.uid()=p.created_by_rep_id) IS TRUE AS private) access
 WHERE (_id IS NOT NULL AND p.id=_id) OR (_slug IS NOT NULL AND lower(p.username)=lower(_slug)) LIMIT 1;
$$;
