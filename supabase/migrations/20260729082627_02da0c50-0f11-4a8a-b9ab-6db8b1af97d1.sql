ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS print_status text DEFAULT 'not_downloaded' CHECK (print_status IN ('not_downloaded','downloaded','printed','delivered')),
  ADD COLUMN IF NOT EXISTS print_downloaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS print_downloaded_by uuid,
  ADD COLUMN IF NOT EXISTS print_printed_at timestamptz,
  ADD COLUMN IF NOT EXISTS print_printed_by uuid,
  ADD COLUMN IF NOT EXISTS print_delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS print_delivered_by uuid,
  ADD COLUMN IF NOT EXISTS print_notes text,
  ADD COLUMN IF NOT EXISTS trial_extension_days integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.admin_extend_trial(_profile_id uuid, _days int, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF _days IS NULL OR _days = 0 THEN
    RETURN;
  END IF;

  UPDATE public.personal_profiles
     SET trial_ends_at = COALESCE(trial_ends_at, now()) + (_days || ' days')::interval,
         trial_extension_days = COALESCE(trial_extension_days, 0) + _days
   WHERE id = _profile_id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'extend_trial', 'personal_profile', _profile_id::text,
          jsonb_build_object('days', _days, 'reason', _reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_print_status(_profile_id uuid, _status text, _notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF _status NOT IN ('not_downloaded','downloaded','printed','delivered') THEN
    RAISE EXCEPTION 'Invalid print status: %', _status;
  END IF;

  UPDATE public.personal_profiles
     SET print_status = _status,
         print_notes = COALESCE(_notes, print_notes),
         print_downloaded_at = CASE WHEN _status = 'downloaded' AND print_downloaded_at IS NULL THEN now() ELSE print_downloaded_at END,
         print_downloaded_by = CASE WHEN _status = 'downloaded' AND print_downloaded_by IS NULL THEN auth.uid() ELSE print_downloaded_by END,
         print_printed_at   = CASE WHEN _status = 'printed'    AND print_printed_at   IS NULL THEN now() ELSE print_printed_at   END,
         print_printed_by   = CASE WHEN _status = 'printed'    AND print_printed_by   IS NULL THEN auth.uid() ELSE print_printed_by END,
         print_delivered_at = CASE WHEN _status = 'delivered'  AND print_delivered_at IS NULL THEN now() ELSE print_delivered_at END,
         print_delivered_by = CASE WHEN _status = 'delivered'  AND print_delivered_by IS NULL THEN auth.uid() ELSE print_delivered_by END
   WHERE id = _profile_id;

  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'set_print_status', 'personal_profile', _profile_id::text,
          jsonb_build_object('status', _status, 'notes', _notes));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_extend_trial(uuid, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_print_status(uuid, text, text) TO authenticated;