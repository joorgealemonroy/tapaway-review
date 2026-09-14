-- Per-review attribution: marks individual Google reviews as likely coming from
-- a TapAway tap, so the client dashboard can show "X of your new reviews came
-- right after customers tapped your card."
--
-- Reuses the existing google_reviews table (populated from the Places API,
-- newest-first) — this migration only adds the attribution flags.
--
-- How attribution works: a review published at time T is marked
-- attributed_to_tapaway when at least one google_click event exists for the
-- same restaurant in the 48 hours before T. Correlation, labeled honestly in
-- the UI as "likely from TapAway" — never claimed as certain.

ALTER TABLE public.google_reviews
  ADD COLUMN IF NOT EXISTS attributed_to_tapaway boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS matched_clicks integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_google_reviews_attributed
  ON public.google_reviews(restaurant_id, review_time DESC)
  WHERE attributed_to_tapaway = true;

-- Daily attribution pass: 16:30 UTC = 9:30 AM PDT. The attribute-google-reviews
-- edge function pulls newest reviews (Places API, NEWEST sort) for restaurants
-- with recent review-button tap activity, stores them, and flags the ones that
-- followed TapAway taps. Only tap-active restaurants are polled, keeping API
-- costs near zero at current scale.
SELECT cron.unschedule('google-reviews-attribution-daily');

SELECT cron.schedule(
  'google-reviews-attribution-daily',
  '30 16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xfrvckdcrqvkqdwjzopt.supabase.co/functions/v1/attribute-google-reviews',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'tapaway_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
