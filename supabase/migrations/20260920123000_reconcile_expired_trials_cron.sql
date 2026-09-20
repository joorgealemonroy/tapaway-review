-- H-6: expired-trial reconciliation, scheduled daily.
--
-- reconcile-expired-trials finds restaurants/personal_profiles stuck on
-- 'trialing' past trial_ends_at (missed webhooks, dashboard-deleted
-- subscriptions, no billing relationship) and syncs them to Stripe's truth
-- (or past_due when there is none). pg_cron pattern follows the existing
-- trial-ending-email job: service-role bearer from Vault, never in code.
--
-- Runs daily at 17:00 UTC (10:00 AM PDT / 9:00 AM PST), one hour after the
-- trial-ending-email job so dunning emails land before status flips.

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('reconcile-expired-trials-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconcile-expired-trials-daily');

SELECT cron.schedule(
  'reconcile-expired-trials-daily',
  '0 17 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xfrvckdcrqvkqdwjzopt.supabase.co/functions/v1/reconcile-expired-trials',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'tapaway_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
