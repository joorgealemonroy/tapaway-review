CREATE INDEX IF NOT EXISTS analytics_hits_report_scope ON public.analytics_hits(hub_kind,hub_id,occurred_at DESC,id DESC) WHERE is_validated=true AND traffic_class='human';
CREATE OR REPLACE FUNCTION public.canonical_analytics_report(_days integer DEFAULT 30,_kind text DEFAULT NULL,_hub uuid DEFAULT NULL,_search text DEFAULT '',_until timestamptz DEFAULT NULL,_since timestamptz DEFAULT NULL,_cursor_at timestamptz DEFAULT NULL,_cursor_id uuid DEFAULT NULL,_page integer DEFAULT 0,_event text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
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
SELECT a.*,h.name,h.slug FROM public.analytics_hits a LEFT JOIN selected h ON h.id=a.hub_id AND h.kind=a.hub_kind WHERE a.occurred_at>=v_since AND a.occurred_at<v_until AND a.created_at<=v_until AND (h.id IS NOT NULL OR v_admin AND _hub IS NULL AND _kind IS NULL AND coalesce(_search,'')='' AND a.hub_kind='site' AND a.hub_id IS NULL)
), valid AS MATERIALIZED (
SELECT DISTINCT ON(event_id) * FROM raw WHERE is_validated=true AND traffic_class='human' ORDER BY event_id,created_at,id
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
event_totals AS(SELECT event_name,count(*) AS events,count(DISTINCT nullif(session_id,'')) AS sessions FROM valid GROUP BY event_name),
sources AS(SELECT CASE WHEN campaign_channel IN ('nfc','qr') THEN upper(campaign_channel)||' (tagged)' WHEN referrer_host ~ '^[a-zA-Z0-9.-]+$' THEN left(referrer_host,120) ELSE 'Direct / unknown' END AS source,count(*) AS views FROM valid WHERE event_name IN ('hub_view','page_view') GROUP BY 1),
devices AS(SELECT CASE WHEN device_category IN ('mobile','tablet','desktop') THEN device_category ELSE 'unknown' END AS name,count(*) AS views FROM valid WHERE event_name IN ('hub_view','page_view') GROUP BY 1),
links AS(SELECT event_name,coalesce(nullif(props->>'link_id',''),nullif(props->>'action_key',''),event_name) AS link_key,CASE WHEN coalesce(props->>'link_label','') ~ '(@|https?://|tel:|mailto:|[0-9]{5})' THEN 'Link action' ELSE coalesce(nullif(left(props->>'link_label',120),''),replace(event_name,'_',' ')) END AS label,count(*) AS clicks FROM activity WHERE event_name IN ('link_click','review_click','social_click','menu_view','directions_click','call_click','text_click','website_click') GROUP BY 1,2,3)
SELECT jsonb_build_object(
'meta',jsonb_build_object('since',v_since,'until',v_until,'asOf',v_until,'timezone','America/Los_Angeles','days',_days,'coverage','Recorded events only. Historical business tracking was missing from this dataset before this release; missing history is not backfilled. Rule-filtered does not guarantee human activity. Sessions are not people. Views are not NFC/QR opens unless tagged. Clicks do not prove calls, reviews or payments.','firstRecordedAt',(SELECT min(occurred_at) FROM public.analytics_hits WHERE is_validated=true AND traffic_class='human' AND (_hub IS NULL AND v_admin OR hub_id=_hub AND hub_kind=_kind))),
'hub',(SELECT jsonb_build_object('id',id,'kind',kind,'name',name,'slug',slug) FROM selected WHERE id=_hub AND kind=_kind),
 'totals',(SELECT jsonb_build_object('site_views',count(*) FILTER(WHERE event_name='page_view' AND hub_kind='site'),'hub_views',count(*) FILTER(WHERE event_name='hub_view' AND hub_id IS NOT NULL),'sessions',count(DISTINCT nullif(session_id,'')) FILTER(WHERE event_name IN ('hub_view','page_view')),'clicks',count(*) FILTER(WHERE hub_id IS NOT NULL AND event_name IN ('link_click','review_click','social_click','menu_view','directions_click','call_click','text_click','website_click')),'saves',count(*) FILTER(WHERE hub_id IS NOT NULL AND event_name='contact_save'),'events',count(*),'excluded',(SELECT count(*) FROM raw WHERE is_validated IS DISTINCT FROM true OR traffic_class IS DISTINCT FROM 'human')) FROM valid),
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
END $$;
REVOKE ALL ON FUNCTION public.canonical_analytics_report(integer,text,uuid,text,timestamptz,timestamptz,timestamptz,uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canonical_analytics_report(integer,text,uuid,text,timestamptz,timestamptz,timestamptz,uuid,integer,text) TO authenticated;