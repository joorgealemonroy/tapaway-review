-- Owner workspace. No account reclassification, campaign sends, or billing mutations.
CREATE OR REPLACE FUNCTION public.admin_workspace_hubs()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 RETURN (WITH hubs AS (
  SELECT p.id, 'personal'::text kind, coalesce(nullif(p.full_name,''),p.username,'Untitled hub') name,
   p.username slug, p.payment_state, p.subscription_status, p.stripe_subscription_id,
   coalesce(p.is_approved,false) is_approved, p.created_at, p.profile_photo_url photo_url
  FROM personal_profiles p
  UNION ALL
  SELECT r.id,'business',coalesce(nullif(r.restaurant_name,''),r.custom_slug,'Untitled hub'),r.custom_slug,
   r.payment_state,r.subscription_status,r.stripe_subscription_id,coalesce(r.is_approved,false),r.created_at,r.logo_url FROM restaurants r
 ), engagement AS (
  SELECT hub_id,
   count(*) FILTER (WHERE event_name='hub_view') views,
   count(*) FILTER (WHERE event_name IN ('link_click','review_click','social_click','menu_view','directions_click','call_click','text_click','website_click')) clicks
  FROM analytics_hits WHERE is_validated AND traffic_class='human' AND occurred_at >= now()-interval '30 days' GROUP BY hub_id
 ) SELECT coalesce(jsonb_agg(to_jsonb(h)||jsonb_build_object('views',coalesce(e.views,0),'clicks',coalesce(e.clicks,0)) ORDER BY h.created_at DESC),'[]'::jsonb)
 FROM hubs h LEFT JOIN engagement e ON e.hub_id=h.id);
END $$;
REVOKE ALL ON FUNCTION public.admin_workspace_hubs() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_workspace_hubs() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_gift_unbilled_hub(_id uuid,_kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 IF _kind='personal' THEN
  UPDATE personal_profiles SET payment_state='complimentary' WHERE id=_id AND stripe_subscription_id IS NULL;
 ELSIF _kind='business' THEN
  UPDATE restaurants SET payment_state='complimentary' WHERE id=_id AND stripe_subscription_id IS NULL;
 ELSE RAISE EXCEPTION 'Unknown hub type'; END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Hub has linked billing or no longer exists. Review it before changing access.'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_gift_unbilled_hub(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_gift_unbilled_hub(uuid,text) TO authenticated;

CREATE TABLE public.admin_announcements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
 kind text NOT NULL CHECK(kind IN ('update','offer')),
 audience text NOT NULL CHECK(audience IN ('all','business','personal','subscribers')),
 cta_path text CHECK(cta_path IS NULL OR (cta_path ~ '^/[a-zA-Z0-9/?=&_#.%~-]*$' AND cta_path NOT LIKE '//%')),
 cta_label text CHECK(cta_label IS NULL OR length(cta_label) BETWEEN 1 AND 60),
 recipient_ids uuid[] NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent')),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz,
 CHECK ((cta_path IS NULL) = (cta_label IS NULL))
);
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read announcements" ON public.admin_announcements FOR SELECT TO authenticated USING(public.is_admin());
REVOKE ALL ON public.admin_announcements FROM anon,authenticated;
GRANT SELECT ON public.admin_announcements TO authenticated;
CREATE TABLE public.customer_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 announcement_id uuid NOT NULL REFERENCES public.admin_announcements(id),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 title text NOT NULL, body text NOT NULL, kind text NOT NULL, cta_path text, cta_label text,
 created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz,
 UNIQUE(announcement_id,user_id)
);
CREATE INDEX customer_notifications_inbox ON public.customer_notifications(user_id,created_at DESC);
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own inbox" ON public.customer_notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
REVOKE ALL ON public.customer_notifications FROM anon,authenticated;
GRANT SELECT ON public.customer_notifications TO authenticated;

CREATE FUNCTION public.admin_notification_recipients(_audience text)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(array_agg(DISTINCT user_id),'{}'::uuid[]) FROM (
 SELECT user_id FROM personal_profiles WHERE user_id IS NOT NULL AND (
  _audience IN ('all','personal') OR _audience='subscribers' AND stripe_subscription_id IS NOT NULL AND subscription_status='active' AND payment_state<>'complimentary')
 UNION SELECT owner_id FROM restaurants WHERE owner_id IS NOT NULL AND (
  _audience IN ('all','business') OR _audience='subscribers' AND stripe_subscription_id IS NOT NULL AND subscription_status='active' AND payment_state<>'complimentary')
 UNION SELECT user_id FROM personal_card_orders WHERE user_id IS NOT NULL AND status='paid' AND stripe_livemode AND _audience IN ('all','personal')
 ) recipients WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=recipients.user_id AND ur.role='admin');
$$;
REVOKE ALL ON FUNCTION public.admin_notification_recipients(text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.admin_save_announcement(_id uuid,_title text,_body text,_kind text,_audience text,_cta_path text,_cta_label text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved admin_announcements; recipients uuid[];
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 recipients:=public.admin_notification_recipients(_audience);
 IF _id IS NULL THEN
  INSERT INTO admin_announcements(title,body,kind,audience,cta_path,cta_label,recipient_ids,created_by)
   VALUES(trim(_title),trim(_body),_kind,_audience,nullif(trim(_cta_path),''),nullif(trim(_cta_label),''),recipients,auth.uid()) RETURNING * INTO saved;
 ELSE
  UPDATE admin_announcements SET title=trim(_title),body=trim(_body),kind=_kind,audience=_audience,
   cta_path=nullif(trim(_cta_path),''),cta_label=nullif(trim(_cta_label),''),recipient_ids=recipients,updated_at=clock_timestamp()
   WHERE id=_id AND status='draft' RETURNING * INTO saved;
  IF NOT FOUND THEN RAISE EXCEPTION 'This draft is already sent or no longer exists'; END IF;
 END IF;
 RETURN to_jsonb(saved)-'recipient_ids'||jsonb_build_object('recipient_count',cardinality(saved.recipient_ids));
END $$;
REVOKE ALL ON FUNCTION public.admin_save_announcement(uuid,text,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_save_announcement(uuid,text,text,text,text,text,text) TO authenticated;

CREATE FUNCTION public.admin_send_announcement(_id uuid,_updated_at timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE draft admin_announcements; delivered integer;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 SELECT * INTO draft FROM admin_announcements WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Draft not found'; END IF;
 IF draft.status='sent' THEN RETURN (SELECT count(*)::integer FROM customer_notifications WHERE announcement_id=_id); END IF;
 IF draft.updated_at<>_updated_at THEN RAISE EXCEPTION 'Draft changed. Preview it again before sending.'; END IF;
 IF cardinality(draft.recipient_ids)=0 THEN RAISE EXCEPTION 'There are no recipients in this audience'; END IF;
 -- Preview snapshot is the send audience. Deleted accounts are skipped safely.
 INSERT INTO customer_notifications(announcement_id,user_id,title,body,kind,cta_path,cta_label)
 SELECT draft.id,u.id,draft.title,draft.body,draft.kind,draft.cta_path,draft.cta_label
 FROM auth.users u WHERE u.id=ANY(draft.recipient_ids) ON CONFLICT(announcement_id,user_id) DO NOTHING;
 GET DIAGNOSTICS delivered=ROW_COUNT;
 UPDATE admin_announcements SET status='sent',sent_at=now() WHERE id=_id;
 RETURN delivered;
END $$;
REVOKE ALL ON FUNCTION public.admin_send_announcement(uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_send_announcement(uuid,timestamptz) TO authenticated;

CREATE FUNCTION public.customer_read_notification(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE customer_notifications SET read_at=coalesce(read_at,now()) WHERE id=_id AND user_id=auth.uid();
$$;
REVOKE ALL ON FUNCTION public.customer_read_notification(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.customer_read_notification(uuid) TO authenticated;

CREATE FUNCTION public.admin_workspace_insights(_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 IF _days NOT IN (7,30,90) THEN RAISE EXCEPTION 'Invalid reporting range'; END IF;
 RETURN (SELECT jsonb_build_object(
  'site_views',count(*) FILTER(WHERE is_validated AND traffic_class='human' AND event_name='page_view' AND hub_kind='site' AND path IN ('/','/personal','/personal/design','/support','/onboarding','/start','/about','/faq','/pricing','/restaurants','/barbershops','/salons','/cafes','/auto-shops')),
  'hub_views',count(*) FILTER(WHERE is_validated AND traffic_class='human' AND event_name='hub_view' AND hub_id IS NOT NULL),
  'visit_sessions',count(DISTINCT session_id) FILTER(WHERE is_validated AND traffic_class='human' AND event_name IN ('hub_view','page_view')),
  'link_clicks',count(*) FILTER(WHERE is_validated AND traffic_class='human' AND event_name IN ('link_click','review_click','social_click','menu_view','directions_click','call_click','text_click','website_click') AND hub_id IS NOT NULL),
  'excluded',count(*) FILTER(WHERE NOT is_validated OR traffic_class<>'human'),
  'raw_events',count(*),'since',now()-make_interval(days=>_days),'updated_at',now())
  FROM analytics_hits WHERE occurred_at>=now()-make_interval(days=>_days) AND occurred_at<=now());
END $$;
REVOKE ALL ON FUNCTION public.admin_workspace_insights(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_workspace_insights(integer) TO authenticated;
