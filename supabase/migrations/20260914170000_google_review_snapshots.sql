-- Google review count snapshots: weekly total review counts per restaurant,
-- so the client dashboard can show "X new Google reviews in the last N days".
-- Counts come from the Google Places API (Place Details, user_ratings_total)
-- via the sync-google-review-counts edge function. No per-client OAuth needed.

CREATE TABLE IF NOT EXISTS public.google_review_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  review_count integer NOT NULL,
  rating numeric NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_snapshots_restaurant_captured
  ON public.google_review_snapshots(restaurant_id, captured_at DESC);

ALTER TABLE public.google_review_snapshots ENABLE ROW LEVEL SECURITY;

-- Restaurant owners can read their own snapshots; admins can read all.
-- (Same pattern as analytics_events.)
DROP POLICY IF EXISTS "Restaurant owners can view their review snapshots"
  ON public.google_review_snapshots;
CREATE POLICY "Restaurant owners can view their review snapshots"
  ON public.google_review_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = google_review_snapshots.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all review snapshots"
  ON public.google_review_snapshots;
CREATE POLICY "Admins can view all review snapshots"
  ON public.google_review_snapshots FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Weekly sync: Mondays 16:00 UTC = 9:00 AM PDT. Snapshots are weekly, so the
-- 30-day dashboard view always has several data points.
SELECT cron.unschedule('google-review-sync-weekly');

SELECT cron.schedule(
  'google-review-sync-weekly',
  '0 16 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://xfrvckdcrqvkqdwjzopt.supabase.co/functions/v1/sync-google-review-counts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'tapaway_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
