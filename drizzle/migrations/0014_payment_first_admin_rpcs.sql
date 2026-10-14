CREATE OR REPLACE FUNCTION public.admin_set_setup_status(_session_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  UPDATE public.onboarding_sessions SET setup_status = _status WHERE id = _session_id;
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'set_setup_status', 'onboarding_session', _session_id::text, jsonb_build_object('status', _status));
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_setup_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_setup_status(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_card_club_override(_membership_id uuid, _status text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF _status NOT IN ('active','cancelled','past_due','pending_activation') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.card_club_memberships SET status = _status, admin_override = true, review_reason = _reason WHERE id = _membership_id;
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'card_club_override', 'card_club_membership', _membership_id::text, jsonb_build_object('status', _status, 'reason', _reason));
END; $$;
REVOKE ALL ON FUNCTION public.admin_card_club_override(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_card_club_override(uuid, text, text) TO authenticated;