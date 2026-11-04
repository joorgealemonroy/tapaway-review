CREATE OR REPLACE FUNCTION public.guard_analytics_duplicate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_action text:=coalesce(nullif(NEW.props->>'link_id',''),nullif(NEW.props->>'action_key',''),nullif(NEW.props->>'link_url',''),NEW.event_name); v_window interval:=CASE WHEN NEW.event_name IN ('hub_view','page_view') THEN interval '30 seconds' ELSE interval '750 milliseconds' END;
BEGIN
PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws('|',NEW.session_id,NEW.hub_kind,NEW.hub_id::text,NEW.path,NEW.event_name,v_action),0));
IF EXISTS(SELECT 1 FROM public.analytics_hits a WHERE a.session_id=NEW.session_id AND a.hub_kind IS NOT DISTINCT FROM NEW.hub_kind AND a.hub_id IS NOT DISTINCT FROM NEW.hub_id AND a.path IS NOT DISTINCT FROM NEW.path AND a.event_name=NEW.event_name AND coalesce(nullif(a.props->>'link_id',''),nullif(a.props->>'action_key',''),nullif(a.props->>'link_url',''),a.event_name)=v_action AND a.occurred_at>=NEW.occurred_at-v_window AND a.occurred_at<=NEW.occurred_at) THEN RETURN NULL; END IF;
RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_analytics_duplicate() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER analytics_duplicate_guard BEFORE INSERT ON public.analytics_hits FOR EACH ROW EXECUTE FUNCTION public.guard_analytics_duplicate();
