CREATE TABLE IF NOT EXISTS public.google_review_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  review_count integer NOT NULL,
  rating numeric NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_snapshots_restaurant_captured
  ON public.google_review_snapshots(restaurant_id, captured_at DESC);

GRANT SELECT ON public.google_review_snapshots TO authenticated;
GRANT ALL ON public.google_review_snapshots TO service_role;

ALTER TABLE public.google_review_snapshots ENABLE ROW LEVEL SECURITY;

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

-- Weekly sync: Mondays 16:00 UTC = 9:00 AM PDT.
DO $$
BEGIN
  PERFORM cron.unschedule('google-review-sync-weekly');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

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