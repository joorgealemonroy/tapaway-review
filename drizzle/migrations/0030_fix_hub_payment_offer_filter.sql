-- Corrective: restore the exact reviewed empty-string filter in the public offer function.
CREATE OR REPLACE FUNCTION public.get_hub_payment_offer(_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH target AS (
   SELECT p.*,r.request_version,r.requested_at,r.amount,r.currency,r.card_quantity
   FROM public.personal_profiles p JOIN public.hub_payment_requests r ON r.profile_id=p.id
   WHERE lower(p.username)=lower(trim(_slug)) AND p.payment_state='payment_required'
     AND r.fulfilled_at IS NULL AND p.is_approved IS TRUE
   LIMIT 1
 ), hits AS (
   SELECT h.event_name,h.occurred_at,
     lower(COALESCE(NULLIF(h.props->>'link_type',''),l.link_type,'')) AS link_type,
     lower(COALESCE(NULLIF(h.props->>'link_url',''),l.url,'')) AS link_url
   FROM public.analytics_hits h JOIN target t ON t.id=h.hub_id
   LEFT JOIN public.personal_links l ON l.profile_id=t.id AND l.id::text=h.props->>'link_id'
   WHERE h.is_validated IS TRUE AND h.traffic_class='human'
 ), metrics AS (
   SELECT count(*) FILTER(WHERE event_name='hub_view') AS views,
     count(*) FILTER(WHERE event_name IN ('link_click','review_click','social_click','menu_view','directions_click','call_click','text_click','website_click')) AS link_clicks,
     count(*) FILTER(WHERE event_name IN ('link_click','review_click') AND (
       link_type='google_review' OR (link_type<>'directions' AND link_url~'(^https?://([^/]+\.)?google\.com/.*writereview|^https?://([^/]+\.)?g\.page/.*review)'))) AS google_clicks,
     count(*) FILTER(WHERE event_name IN ('link_click','review_click','social_click') AND (link_type='yelp' OR link_url~'^https?://([^/]+\.)?yelp\.com/')) AS yelp_clicks,
     count(*) FILTER(WHERE event_name IN ('link_click','social_click') AND (link_type='instagram' OR link_url~'^https?://([^/]+\.)?instagram\.com/')) AS instagram_clicks,
     count(*) FILTER(WHERE event_name='directions_click' OR (event_name='link_click' AND link_type='directions')) AS directions_clicks,
     count(*) FILTER(WHERE event_name='contact_save') AS contact_saves,
     min(occurred_at) AS first_activity_at,max(occurred_at) AS last_activity_at
   FROM hits
 ), history AS (
   SELECT count(*) AS historical_views
   FROM public.personal_analytics a JOIN target t ON t.id=a.profile_id
   WHERE a.event_type='profile_visit'
     AND a.created_at < COALESCE((SELECT min(h.occurred_at) FROM public.analytics_hits h WHERE h.hub_id=t.id),'infinity'::timestamptz)
     AND COALESCE(a.visitor_info->>'userAgent',a.visitor_info->>'user_agent','')<>''
     AND COALESCE(a.visitor_info->>'userAgent',a.visitor_info->>'user_agent','') !~* 'bot|crawl|spider|slurp|preview|facebookexternalhit|headless|phantomjs|puppeteer|playwright|python-requests|curl/|wget|monitor|uptime|lighthouse|gtmetrix'
     AND COALESCE(a.visitor_info->>'referrer','') !~* 'localhost|127\.0\.0\.1|lovable\.(app|dev)|admin_preview'
 )
 SELECT jsonb_build_object(
   'profileId',t.id,'requestVersion',t.request_version,'username',t.username,
   'displayName',COALESCE(NULLIF(trim(t.full_name),''),NULLIF(trim(t.contact_company),''),t.username),
   'profilePhotoUrl',t.profile_photo_url,'headerImageUrl',t.header_image_url,
   'amount',t.amount,'currency',t.currency,'cardQuantity',t.card_quantity,'interval','month','requestedAt',t.requested_at,
   'metrics',jsonb_build_object('views',m.views,'linkClicks',m.link_clicks,'googleClicks',m.google_clicks,
     'yelpClicks',m.yelp_clicks,'instagramClicks',m.instagram_clicks,'directionsClicks',m.directions_clicks,
     'contactSaves',m.contact_saves,'firstActivityAt',m.first_activity_at,'lastActivityAt',m.last_activity_at,
     'source','validated_traffic','historicalViews',h.historical_views)
 ) FROM target t CROSS JOIN metrics m CROSS JOIN history h;
$$;
REVOKE ALL ON FUNCTION public.get_hub_payment_offer(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_hub_payment_offer(text) TO service_role;