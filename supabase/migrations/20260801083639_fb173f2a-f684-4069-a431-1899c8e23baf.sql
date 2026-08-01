CREATE OR REPLACE FUNCTION public.guard_profile_approval_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role / backend jobs bypass this guard entirely.
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Only admins may flip approval or write the admin review note.
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    RAISE EXCEPTION 'Only an admin can approve or un-approve a hub';
  END IF;
  IF NEW.review_note IS DISTINCT FROM OLD.review_note
     OR NEW.review_note_at IS DISTINCT FROM OLD.review_note_at THEN
    RAISE EXCEPTION 'Only an admin can edit the review note';
  END IF;

  -- Billing state is set by Stripe webhooks / admins, never by the client.
  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
     OR NEW.trial_extension_days IS DISTINCT FROM OLD.trial_extension_days
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN
    RAISE EXCEPTION 'Billing and trial fields cannot be changed from the client';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_approval_fields ON public.personal_profiles;
CREATE TRIGGER trg_guard_profile_approval_fields
BEFORE UPDATE ON public.personal_profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_approval_fields();