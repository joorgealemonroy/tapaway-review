CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.trial_nurture_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day_number integer NOT NULL CHECK (day_number IN (3, 10, 13)),
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error text
);

CREATE UNIQUE INDEX trial_nurture_log_restaurant_day
  ON public.trial_nurture_log (restaurant_id, day_number);

GRANT SELECT ON public.trial_nurture_log TO authenticated;
GRANT ALL ON public.trial_nurture_log TO service_role;

ALTER TABLE public.trial_nurture_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view trial nurture log"
  ON public.trial_nurture_log FOR SELECT
  USING (public.is_admin());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trial-followup-daily') THEN
    PERFORM cron.unschedule('trial-followup-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'trial-followup-daily',
  '0 17 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xfrvckdcrqvkqdwjzopt.supabase.co/functions/v1/trial-followup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'tapaway_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);