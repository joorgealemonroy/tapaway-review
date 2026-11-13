-- Slug changes are atomic with redirects and NFC destinations. The hub ID,
-- ownership, content, approval, billing and analytics associations stay intact.
CREATE TABLE IF NOT EXISTS public.hub_slug_redirects (
  slug text PRIMARY KEY CHECK (slug = lower(slug)),
  profile_id uuid REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  CHECK (num_nonnulls(profile_id, restaurant_id) = 1)
);
ALTER TABLE public.hub_slug_redirects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hub_slug_redirects FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.hub_slug_redirects TO service_role;

CREATE OR REPLACE FUNCTION public.hub_slug_is_reserved(_slug text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT lower(_slug) = ANY(ARRAY[
    'admin','auth','api','business','dashboard','demo','hub','onboarding','paywall',
    'personal','privacy','pricing','refund','rep','support','terms','trial-confirmed',
    'www','mail','ftp','localhost','app','static','assets','images','css','js','fonts',
    'blog','help','about','contact','login','logout','signup','register','settings',
    'profile','account','user','users','home','index','null','undefined','true','false',
    'tap','card','cards','order','orders','shop','store','checkout','connect','start',
    'welcome','faq','examples','payment','billing','subscribe','subscription','team',
    'enterprise','pro','premium','free','u','c','import','select-dashboard',
    'onboarding-success','onboarding-start','van-success','claim','acceptable-use',
    'affiliate-terms','nfc-disclaimer','ai-disclaimer','dmca','cookie-policy','dpa',
    'affiliate','rep-checkout-success','compliance','sms-signup','restaurants',
    'barbershops','salons','cafes','auto-shops','soniamonroy'
  ]::text[]);
$$;

CREATE OR REPLACE FUNCTION public.guard_hub_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  next_slug text;
  prior_slug text;
  personal boolean := TG_TABLE_NAME = 'personal_profiles';
  can_manage boolean;
BEGIN
  next_slug := lower(btrim(to_jsonb(NEW)->>(CASE WHEN personal THEN 'username' ELSE 'custom_slug' END)));
  IF personal THEN NEW.username := next_slug; ELSE NEW.custom_slug := next_slug; END IF;
  IF TG_OP = 'UPDATE' THEN
    prior_slug := to_jsonb(OLD)->>(CASE WHEN personal THEN 'username' ELSE 'custom_slug' END);
    IF next_slug IS NOT DISTINCT FROM prior_slug THEN RETURN NEW; END IF;

    -- SECURITY DEFINER's current_user is never an authorization signal.
    -- Only a real admin, trusted backend JWT or local database operator can
    -- override the approved-hub lock. RLS still controls who may edit drafts.
    can_manage := COALESCE(public.is_admin(), false)
      OR COALESCE(auth.role() = 'service_role', false)
      OR (auth.uid() IS NULL AND session_user IN ('postgres','supabase_admin'));
    IF (NOT personal OR OLD.is_approved IS TRUE) AND NOT can_manage THEN
      RAISE EXCEPTION 'Only an administrator can change this hub URL' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Legacy restaurant creation can allocate its URL in a later server step.
  IF next_slug IS NULL AND TG_OP = 'INSERT' AND NOT personal THEN RETURN NEW; END IF;
  -- Existing business onboarding generates up to 50 characters plus a suffix.
  -- Keep that established flow compatible; editors offer a shorter 3–40 range.
  IF next_slug IS NULL OR next_slug !~ '^[a-z0-9_-]{1,80}$' THEN
    RAISE EXCEPTION 'Use lowercase letters, numbers, hyphens or underscores (up to 80 characters) for the hub URL' USING ERRCODE = '22023';
  END IF;
  IF public.hub_slug_is_reserved(next_slug) THEN
    RAISE EXCEPTION 'This URL is reserved by TapAway' USING ERRCODE = '22023';
  END IF;

  -- Both hub tables and old URLs share one namespace. Serialize its rare
  -- mutations so concurrent claims cannot race a rename or its redirect.
  PERFORM pg_catalog.pg_advisory_xact_lock(731913004);
  IF EXISTS (SELECT 1 FROM public.personal_profiles p WHERE lower(p.username) = next_slug AND (NOT personal OR p.id <> NEW.id))
     OR EXISTS (SELECT 1 FROM public.restaurants r WHERE lower(r.custom_slug) = next_slug AND (personal OR r.id <> NEW.id))
     OR EXISTS (SELECT 1 FROM public.hub_slug_redirects a WHERE a.slug = next_slug
       AND NOT (CASE WHEN personal THEN a.profile_id = NEW.id ELSE a.restaurant_id = NEW.id END IS TRUE)) THEN
    RAISE EXCEPTION 'This hub URL is already in use or retained for an existing card' USING ERRCODE = '23505';
  END IF;

  IF personal THEN NEW.username := next_slug; ELSE NEW.custom_slug := next_slug; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_hub_slug() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.retain_hub_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  personal boolean := TG_TABLE_NAME = 'personal_profiles';
  prior_slug text;
  next_slug text;
BEGIN
  prior_slug := to_jsonb(OLD)->>(CASE WHEN personal THEN 'username' ELSE 'custom_slug' END);
  next_slug := to_jsonb(NEW)->>(CASE WHEN personal THEN 'username' ELSE 'custom_slug' END);
  IF prior_slug IS NOT DISTINCT FROM next_slug THEN RETURN NEW; END IF;

  -- A hub may reclaim its own old address. Aliases point at stable IDs, so
  -- multiple renames resolve directly to the latest address without chains.
  DELETE FROM public.hub_slug_redirects a WHERE a.slug = next_slug
    AND (CASE WHEN personal THEN a.profile_id = NEW.id ELSE a.restaurant_id = NEW.id END IS TRUE);
  IF prior_slug IS NOT NULL THEN
    INSERT INTO public.hub_slug_redirects(slug, profile_id, restaurant_id, changed_by)
    VALUES(lower(prior_slug), CASE WHEN personal THEN NEW.id END,
      CASE WHEN NOT personal THEN NEW.id END, auth.uid());
    IF personal THEN
      UPDATE public.nfc_cards SET destination_value = next_slug
      WHERE owner_user_id = NEW.user_id AND destination_type = 'profile'
        AND destination_value = prior_slug;
    END IF;
  END IF;
  IF auth.uid() IS NOT NULL AND public.is_admin() THEN
    INSERT INTO public.admin_audit_log(admin_user_id, action, target_type, target_id, details)
    VALUES(auth.uid(), 'change_hub_slug', TG_TABLE_NAME, NEW.id::text,
      jsonb_build_object('previous_slug', prior_slug, 'slug', next_slug));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.retain_hub_slug() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_hub_slug ON public.personal_profiles;
CREATE TRIGGER guard_hub_slug BEFORE INSERT OR UPDATE OF username ON public.personal_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_hub_slug();
DROP TRIGGER IF EXISTS guard_hub_slug ON public.restaurants;
CREATE TRIGGER guard_hub_slug BEFORE INSERT OR UPDATE OF custom_slug ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.guard_hub_slug();
DROP TRIGGER IF EXISTS retain_hub_slug ON public.personal_profiles;
CREATE TRIGGER retain_hub_slug AFTER UPDATE OF username ON public.personal_profiles
  FOR EACH ROW EXECUTE FUNCTION public.retain_hub_slug();
DROP TRIGGER IF EXISTS retain_hub_slug ON public.restaurants;
CREATE TRIGGER retain_hub_slug AFTER UPDATE OF custom_slug ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.retain_hub_slug();

CREATE OR REPLACE FUNCTION public.is_username_available(check_username text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT lower(check_username) ~ '^[a-z0-9_-]{1,80}$'
    AND NOT public.hub_slug_is_reserved(check_username)
    AND NOT EXISTS (SELECT 1 FROM public.personal_profiles p WHERE p.username = lower(check_username)
      OR (lower(check_username) NOT LIKE 'tap%' AND p.username = 'tap' || lower(check_username))
      OR (lower(check_username) LIKE 'tap%' AND p.username = substring(lower(check_username) FROM 4)))
    AND NOT EXISTS (SELECT 1 FROM public.restaurants r WHERE lower(r.custom_slug) = lower(check_username))
    AND NOT EXISTS (SELECT 1 FROM public.hub_slug_redirects a WHERE a.slug = lower(check_username));
$$;
REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated, service_role;

-- Expose only an approved hub's current public address. Actual content remains
-- behind the existing approval, gift and subscription RPCs after navigation.
CREATE OR REPLACE FUNCTION public.get_hub_slug_redirect(_slug text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(p.username, r.custom_slug)
  FROM public.hub_slug_redirects a
  LEFT JOIN public.personal_profiles p ON p.id = a.profile_id AND p.is_approved IS TRUE
  LEFT JOIN public.restaurants r ON r.id = a.restaurant_id AND r.is_approved IS TRUE
  WHERE a.slug = lower(_slug);
$$;
REVOKE ALL ON FUNCTION public.get_hub_slug_redirect(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hub_slug_redirect(text) TO anon, authenticated, service_role;
