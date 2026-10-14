CREATE OR REPLACE FUNCTION public.guard_legacy_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') OR public.is_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.legacy_allowance := false; NEW.legacy_allowance_key := NULL; NEW.legacy_allowance_source := NULL; NEW.legacy_allowance_granted_at := NULL;
  ELSE
    NEW.legacy_allowance := OLD.legacy_allowance; NEW.legacy_allowance_key := OLD.legacy_allowance_key;
    NEW.legacy_allowance_source := OLD.legacy_allowance_source; NEW.legacy_allowance_granted_at := OLD.legacy_allowance_granted_at;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_legacy_fields() FROM PUBLIC, anon, authenticated;
-- Named to sort before trg_legacy_auto_grant so the server-side grant still applies after the guard.
DROP TRIGGER IF EXISTS trg_a_guard_legacy_fields ON public.personal_profiles;
CREATE TRIGGER trg_a_guard_legacy_fields BEFORE INSERT OR UPDATE ON public.personal_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_legacy_fields();
DROP TRIGGER IF EXISTS trg_a_guard_legacy_fields ON public.restaurants;
CREATE TRIGGER trg_a_guard_legacy_fields BEFORE INSERT OR UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.guard_legacy_fields();