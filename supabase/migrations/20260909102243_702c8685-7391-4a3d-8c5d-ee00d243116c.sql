CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

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
  RAISE WARNING 'notify_fulfillment_stage failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fulfillment_stage_email ON public.personal_profiles;
CREATE TRIGGER trg_fulfillment_stage_email
  AFTER UPDATE OF printed_at, delivered_at ON public.personal_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_fulfillment_stage();

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trial-ending-email-daily') THEN
    PERFORM cron.unschedule('trial-ending-email-daily');
  END IF;
END
$do$;

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