-- One source record appears once: migrated history follows its new owner-scoped hub.
CREATE OR REPLACE FUNCTION public.historical_analytics_report(_days integer DEFAULT 30, _kind text DEFAULT NULL::text, _hub uuid DEFAULT NULL::uuid, _search text DEFAULT ''::text, _until timestamp with time zone DEFAULT NULL::timestamp with time zone, _since timestamp with time zone DEFAULT NULL::timestamp with time zone, _cursor_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _cursor_id uuid DEFAULT NULL::uuid, _page integer DEFAULT 0, _event text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_admin boolean:=public.is_admin(); v_until timestamptz:=coalesce(_until,statement_timestamp()); v_since timestamptz; result jsonb;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
IF _days IS NULL OR _days NOT IN (7,30,90) OR _kind IS NOT NULL AND _kind NOT IN ('solo','business') OR _hub IS NOT NULL AND _kind IS NULL OR _page IS NULL OR _page<0 OR _page>100000 OR length(coalesce(_search,''))>120 OR (_cursor_at IS NULL)<>(_cursor_id IS NULL) OR _event IS NOT NULL AND _event NOT IN ('hub_view','link_click','review_click','social_click','menu_view','directions_click','call_click','text_click','website_click','contact_save','lead_submit') THEN RAISE EXCEPTION 'Invalid reporting parameters' USING ERRCODE='22023'; END IF;
IF v_until>statement_timestamp() THEN RAISE EXCEPTION 'Future snapshot is not allowed' USING ERRCODE='22023'; END IF;
v_since:=coalesce(_since,v_until-make_interval(days=>_days));
IF v_since>=v_until OR v_since<v_until-interval '3660 days' THEN RAISE EXCEPTION 'Invalid reporting bounds' USING ERRCODE='22023'; END IF;
IF _hub IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.personal_profiles p WHERE _kind='solo' AND p.id=_hub AND (v_admin OR p.user_id=auth.uid()) UNION ALL SELECT 1 FROM public.restaurants r WHERE _kind='business' AND r.id=_hub AND (v_admin OR r.owner_id=auth.uid())) THEN RAISE EXCEPTION 'Hub access denied' USING ERRCODE='42501'; END IF;
IF _hub IS NULL AND NOT v_admin THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
WITH hubs AS MATERIALIZED (
SELECT p.id,'solo'::text AS kind,coalesce(nullif(p.full_name,''),p.username,'Untitled hub') AS name,p.username AS slug FROM public.personal_profiles p WHERE v_admin OR p.user_id=auth.uid()
UNION ALL SELECT r.id,'business',coalesce(nullif(r.restaurant_name,''),r.custom_slug,'Untitled hub'),r.custom_slug FROM public.restaurants r WHERE v_admin OR r.owner_id=auth.uid()
), selected AS MATERIALIZED (
SELECT * FROM hubs h WHERE (_kind IS NULL OR h.kind=_kind) AND (_hub IS NULL OR h.id=_hub) AND (coalesce(_search,'')='' OR strpos(lower(h.name||' '||coalesce(h.slug,'')),lower(_search))>0)
), raw AS MATERIALIZED (
SELECT a.*,h.name,h.slug FROM (
SELECT md5('personal:'||p.id::text)::uuid AS id,'personal:'||p.id::text AS event_id,p.profile_id AS hub_id,'solo'::text AS hub_kind,
 CASE p.event_type WHEN 'profile_visit' THEN 'hub_view' ELSE p.event_type END AS event_name,
 NULL::text AS session_id,p.created_at AS occurred_at,p.created_at,false AS is_validated,'unfiltered'::text AS traffic_class,
 coalesce(p.visitor_info,'{}'::jsonb) AS props,NULL::text AS referrer_host,NULL::text AS campaign_channel,NULL::text AS device_category,NULL::text AS path
FROM public.personal_analytics p
UNION ALL
SELECT md5('business:'||a.id::text)::uuid,'business:'||a.id::text,coalesce(m.profile_id,a.restaurant_id),CASE WHEN m.profile_id IS NULL THEN 'business' ELSE 'solo' END,
 CASE a.event_type WHEN 'tap' THEN 'hub_view' WHEN 'google_click' THEN 'review_click' WHEN 'yelp_click' THEN 'review_click' WHEN 'instagram_click' THEN 'social_click' WHEN 'phone_click' THEN 'call_click' WHEN 'directions_clicked' THEN 'directions_click' WHEN 'menu_viewed' THEN 'menu_view' ELSE a.event_type END,
 NULL::text,a.created_at,a.created_at,false,'unfiltered',
 coalesce(a.event_data,'{}'::jsonb)||jsonb_build_object('action_key',a.event_type,'link_label',CASE a.event_type WHEN 'google_click' THEN 'Google review link' WHEN 'yelp_click' THEN 'Yelp review link' ELSE replace(a.event_type,'_',' ') END),
 NULL::text,NULL::text,NULL::text,NULL::text
FROM public.analytics_events a LEFT JOIN public.legacy_hub_migrations m ON m.restaurant_id=a.restaurant_id
) a JOIN selected h ON h.id=a.hub_id AND h.kind=a.hub_kind
WHERE a.occurred_at>=v_since AND a.occurred_at<v_until AND a.created_at<=v_until
), valid AS MATERIALIZED (
SELECT * FROM raw
), activity AS MATERIALIZED (
SELECT * FROM valid WHERE hub_id IS NOT NULL AND event_name IN ('hub_view','link_click','review_click','social_click','menu_view','directions_click','call_click','text_click','website_click','contact_save','lead_submit')
), ranked AS MATERIALIZED (
SELECT h.id,h.kind,h.name,h.slug,count(*) AS events,count(*) FILTER(WHERE a.event_name='hub_view') AS views,count(*) FILTER(WHERE a.event_name IN ('link_click','review_click','social_click','menu_view','directions_click','call_click','text_click','website_click')) AS clicks,count(*) FILTER(WHERE a.event_name='contact_save') AS saves,max(a.occurred_at) AS last_active_at FROM selected h JOIN activity a ON a.hub_id=h.id AND a.hub_kind=h.kind GROUP BY h.id,h.kind,h.name,h.slug
), feed AS MATERIALIZED (
SELECT * FROM activity WHERE (_event IS NULL OR event_name=_event) AND (_cursor_at IS NULL OR (occurred_at,id)<(_cursor_at,_cursor_id)) ORDER BY occurred_at DESC,id DESC LIMIT 51
), feed_page AS(SELECT * FROM feed ORDER BY occurred_at DESC,id DESC LIMIT 50),
axis AS(SELECT d::date AS day FROM generate_series((v_since AT TIME ZONE 'America/Los_Angeles')::date::timestamp,((v_until-interval '1 microsecond') AT TIME ZONE 'America/Los_Angeles')::date::timestamp,interval '1 day') d),
daily_events AS(SELECT (occurred_at AT TIME ZONE 'America/Los_Angeles')::date AS day,event_name,count(*) AS n FROM valid GROUP BY 1,2),
daily AS(SELECT ax.day,coalesce(jsonb_object_agg(e.event_name,e.n) FILTER(WHERE e.event_name IS NOT NULL),'{}'::jsonb) AS events FROM axis ax LEFT JOIN daily_events e ON e.day=ax.day GROUP BY ax.day),
event_totals AS(SELECT event_name,count(*) AS events,NULL::bigint AS sessions FROM valid GROUP BY event_name),
sources AS(SELECT CASE WHEN campaign_channel IN ('nfc','qr') THEN upper(campaign_channel)||' (tagged)' WHEN referrer_host ~ '^[a-zA-Z0-9.-]+$' THEN left(referrer_host,120) ELSE 'Direct / unknown' END AS source,count(*) AS views FROM valid WHERE event_name IN ('hub_view','page_view') GROUP BY 1),
devices AS(SELECT CASE WHEN device_category IN ('mobile','tablet','desktop') THEN device_category ELSE 'unknown' END AS name,count(*) AS views FROM valid WHERE event_name IN ('hub_view','page_view') GROUP BY 1),
links AS(SELECT event_name,coalesce(nullif(props->>'link_id',''),nullif(props->>'action_key',''),event_name) AS link_key,CASE WHEN coalesce(props->>'link_label','') ~ '(@|https?://|tel:|mailto:|[0-9]{5})' THEN 'Link action' ELSE coalesce(nullif(left(props->>'link_label',120),''),replace(event_name,'_',' ')) END AS label,count(*) AS clicks FROM activity WHERE event_name IN ('link_click','review_click','social_click','menu_view','directions_click','call_click','text_click','website_click') GROUP BY 1,2,3)
SELECT jsonb_build_object(
'meta',jsonb_build_object('since',v_since,'until',v_until,'asOf',v_until,'timezone','America/Los_Angeles','days',_days,'coverage','Historical records only, from the original activity tables. These records were not filtered consistently for bots, staff or duplicates. They may overlap the filtered dataset; never add these totals together. Sessions and individual visitors were not recorded. Recorded views do not establish NFC taps, and clicks do not prove calls, reviews or payments.','source','historical','firstRecordedAt',(SELECT min(occurred_at) FROM valid)),
'hub',(SELECT jsonb_build_object('id',id,'kind',kind,'name',name,'slug',slug) FROM selected WHERE id=_hub AND kind=_kind),
 'totals',(SELECT jsonb_build_object('site_views',count(*) FILTER(WHERE event_name='page_view' AND hub_kind='site'),'hub_views',count(*) FILTER(WHERE event_name='hub_view' AND hub_id IS NOT NULL),'sessions',NULL,'clicks',count(*) FILTER(WHERE hub_id IS NOT NULL AND event_name IN ('link_click','review_click','social_click','menu_view','directions_click','call_click','text_click','website_click')),'saves',count(*) FILTER(WHERE hub_id IS NOT NULL AND event_name='contact_save'),'events',count(*),'excluded',0) FROM valid),
'events',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY event_name) FROM event_totals e),'[]'::jsonb),
'daily',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY day) FROM daily d),'[]'::jsonb),
'sources',coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY views DESC,source) FROM sources s),'[]'::jsonb),
'devices',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY views DESC,name) FROM devices d),'[]'::jsonb),
'links',coalesce((SELECT jsonb_agg(to_jsonb(l)-'link_key' ORDER BY clicks DESC,label,event_name) FROM links l),'[]'::jsonb),
'hubCount',(SELECT count(*) FROM ranked),
'hubs',coalesce((SELECT jsonb_agg(to_jsonb(h) ORDER BY events DESC,last_active_at DESC,kind,id) FROM(SELECT * FROM ranked ORDER BY events DESC,last_active_at DESC,kind,id LIMIT 20 OFFSET _page*20) h),'[]'::jsonb),
'activityCount',(SELECT count(*) FROM activity WHERE _event IS NULL OR event_name=_event),
'activity',coalesce((SELECT jsonb_agg(jsonb_build_object('key',id,'at',occurred_at,'hub',jsonb_build_object('id',hub_id,'kind',hub_kind,'name',name,'slug',slug),'event',event_name,'label',CASE WHEN coalesce(props->>'link_label','') ~ '(@|https?://|tel:|mailto:|[0-9]{5})' THEN NULL ELSE nullif(left(props->>'link_label',120),'') END,'source',CASE WHEN campaign_channel IN ('nfc','qr') THEN upper(campaign_channel)||' (tagged)' WHEN referrer_host ~ '^[a-zA-Z0-9.-]+$' THEN left(referrer_host,120) ELSE 'Direct / unknown' END) ORDER BY occurred_at DESC,id DESC) FROM feed_page),'[]'::jsonb),
'nextCursor',CASE WHEN(SELECT count(*) FROM feed)>50 THEN(SELECT jsonb_build_object('at',occurred_at,'id',id) FROM feed_page ORDER BY occurred_at,id LIMIT 1) ELSE NULL END
) INTO result;
RETURN result;
END $function$

