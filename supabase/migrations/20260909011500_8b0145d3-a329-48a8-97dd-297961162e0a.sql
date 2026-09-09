-- Fix #4: automated trial follow-up (daily trial-nurture SMS sequence).
--
-- Creates trial_nurture_log for idempotent per-day sends and schedules a
-- daily pg_cron job that POSTs to the trial-followup edge function.
--
-- AUTH: the cron job authenticates to the edge function with the project's
-- service-role key, pulled from Vault at run time. Before this job can fire,
-- the owner must store the key in Vault once (Supabase dashboard -> SQL editor):
--   SELECT vault.create_secret('<SERVICE_ROLE_KEY>', 'tapaway_service_role_key');
-- The service-role key is found in Supabase dashboard -> Project Settings -> API.
-- Never paste it into chat or commit it anywhere.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotent send log: one row per (restaurant, day) guarantees no double-send.
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

ALTER TABLE public.trial_nurture_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view trial nurture log"
  ON public.trial_nurture_log FOR SELECT
  USING (public.is_admin());

-- Replace any previous schedule (unschedule returns false, no error, when absent).
SELECT cron.unschedule('trial-followup-daily');

-- Daily at 17:00 UTC = 10:00 AM PDT / 9:00 AM PST (business-owner-friendly hour).
-- Pattern matches the analytics-retention-daily precedent (cron.schedule);
-- pg_net POSTs to the edge function since a DB function cannot send SMS.
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
