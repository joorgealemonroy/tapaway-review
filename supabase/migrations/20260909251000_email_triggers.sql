-- Email event triggers (email backend workstream).
--
-- 1. Fulfillment stage emails: AFTER UPDATE trigger on personal_profiles.
--    When printed_at flips NULL -> set, pg_net POSTs { profile_id, stage:
--    "printed" } to the fulfillment-email edge function (sends card_printed).
--    When delivered_at flips, stage "delivered" (sends card_delivered).
--    The edge function re-checks the stamp + dedups via email_sends, so a
--    double-fire can never double-email. No email is ever sent without the
--    real stage stamp (honesty rule).
--
-- 2. Trial-ending email: pg_cron daily job POSTs to trial-ending-email, which
--    finds trialing accounts 3 days from trial end (day 11) and sends the
--    billing-focused trial_ending email. Staggered away from the day 3/10/13
--    trial-followup SMS sequence (cron runs 16:00 UTC; SMS runs 17:00 UTC).
--
-- AUTH: both use the project's service-role key from Vault (same pattern as
-- the trial-followup-daily job in 20260909011500). The Vault secret
-- 'tapaway_service_role_key' is already created (Fix 4) — no new secret needed.
-- If it is missing, the jobs fail closed and log an error; nothing sends.
--
-- Idempotent; safe to re-run.

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─────────────────────────────────────────────────────────────
-- 1. Fulfillment stage trigger
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_fulfillment_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage text := NULL;
  v_key text;
BEGIN
  IF OLD.printed_at IS NULL AND NEW.printed_at IS NOT NULL THEN
    v_stage := 'printed';
  ELSIF OLD.delivered_at IS NULL AND NEW.delivered_at IS NOT NULL THEN
    v_stage := 'delivered';
  END IF;

  IF v_stage IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'tapaway_service_role_key'
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE WARNING 'notify_fulfillment_stage: tapaway_service_role_key missing in Vault; no email triggered';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://xfrvckdcrqvkqdwjzopt.supabase.co/functions/v1/fulfillment-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('profile_id', NEW.id::text, 'stage', v_stage)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- The trigger must never break the fulfillment board update.
  RAISE WARNING 'notify_fulfillment_stage failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fulfillment_stage_email ON public.personal_profiles;
CREATE TRIGGER trg_fulfillment_stage_email
  AFTER UPDATE OF printed_at, delivered_at ON public.personal_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_fulfillment_stage();

-- ─────────────────────────────────────────────────────────────
-- 2. Trial-ending email cron (day 11 of the 14-day trial)
-- ─────────────────────────────────────────────────────────────

SELECT cron.unschedule('trial-ending-email-daily');

-- Daily at 16:00 UTC = 9:00 AM PDT / 8:00 AM PST — one hour before the
-- trial-followup SMS job so the two never land at the same moment.
SELECT cron.schedule(
  'trial-ending-email-daily',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xfrvckdcrqvkqdwjzopt.supabase.co/functions/v1/trial-ending-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'tapaway_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
