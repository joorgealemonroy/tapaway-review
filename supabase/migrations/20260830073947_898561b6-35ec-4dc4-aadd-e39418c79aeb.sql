CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'analytics-retention-daily',
  '15 3 * * *',
  $$SELECT private.enforce_analytics_retention();$$
);