-- Opt-in, first-party guest reviews. A review's rating and optional comment are
-- public; browser/submission identifiers never leave the controlled projection.
-- No hub is enabled by this schema migration. Configure the intended hub
-- separately after deploying its review UI.
CREATE TABLE IF NOT EXISTS public.profile_review_settings (
  profile_id uuid PRIMARY KEY REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profile_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 600),
  visitor_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, submission_id)
);
CREATE INDEX IF NOT EXISTS profile_reviews_feed_idx
  ON public.profile_reviews (profile_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS profile_reviews_visitor_idx
  ON public.profile_reviews (profile_id, visitor_id, created_at DESC);

ALTER TABLE public.profile_review_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_review_settings, public.profile_reviews FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.profile_review_settings, public.profile_reviews TO service_role;

COMMENT ON TABLE public.profile_reviews IS
  'Private storage for guest reviews. All scores use the same public feed. The public RPC excludes visitor and submission identifiers.';
COMMENT ON COLUMN public.profile_reviews.visitor_id IS
  'Browser-generated pseudonymous identifier used only for best-effort duplicate limits; not a verified customer identity.';

CREATE OR REPLACE FUNCTION public.get_public_profile_reviews(
  p_profile_id uuid,
  p_limit integer DEFAULT 5,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_limit integer := greatest(1, least(coalesce(p_limit, 5), 20));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_total bigint;
  v_average numeric;
  v_reviews jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profile_review_settings s
    WHERE s.profile_id = p_profile_id AND s.enabled
  ) OR public.personal_profile_is_active(p_profile_id) IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'enabled', false, 'total', 0, 'average', NULL,
      'reviews', '[]'::jsonb, 'has_more', false
    );
  END IF;

  SELECT count(*), round(avg(r.rating), 1)
    INTO v_total, v_average
  FROM public.profile_reviews r WHERE r.profile_id = p_profile_id;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', page.id, 'rating', page.rating,
      'comment', page.comment, 'created_at', page.created_at
    ) ORDER BY page.created_at DESC, page.id DESC
  ), '[]'::jsonb) INTO v_reviews
  FROM (
    SELECT r.id, r.rating, r.comment, r.created_at
    FROM public.profile_reviews r
    WHERE r.profile_id = p_profile_id
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT v_limit OFFSET v_offset
  ) page;

  RETURN jsonb_build_object(
    'enabled', true, 'total', v_total, 'average', v_average,
    'reviews', v_reviews,
    'has_more', v_total > v_offset + jsonb_array_length(v_reviews)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_profile_review(
  p_profile_id uuid,
  p_rating integer,
  p_comment text,
  p_visitor_id uuid,
  p_submission_id uuid
)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_existing public.profile_reviews%ROWTYPE;
  v_now timestamptz;
  v_comment text;
  v_recent_count bigint;
  v_daily_count bigint;
  v_id uuid;
BEGIN
  IF p_profile_id IS NULL OR p_visitor_id IS NULL OR p_submission_id IS NULL THEN
    RAISE EXCEPTION 'Refresh this page and try again.' USING ERRCODE = '22023';
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Choose a rating from 1 to 5.' USING ERRCODE = '22023';
  END IF;
  IF char_length(p_comment) > 600 THEN
    RAISE EXCEPTION 'Keep your feedback to 600 characters or fewer.' USING ERRCODE = '22023';
  END IF;
  v_comment := nullif(regexp_replace(coalesce(p_comment, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g'), '');

  -- Serialize inserts for this hub before checking retries and both rate limits.
  -- The profile-wide limits still apply when a caller rotates visitor IDs.
  PERFORM pg_advisory_xact_lock(hashtextextended('profile_reviews:' || p_profile_id::text, 0));
  v_now := clock_timestamp();

  IF NOT EXISTS (
    SELECT 1 FROM public.profile_review_settings s
    WHERE s.profile_id = p_profile_id AND s.enabled
  ) OR public.personal_profile_is_active(p_profile_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Reviews are unavailable for this hub.' USING ERRCODE = '22023';
  END IF;

  SELECT r.* INTO v_existing FROM public.profile_reviews r
  WHERE r.profile_id = p_profile_id AND r.submission_id = p_submission_id;
  IF FOUND THEN
    IF v_existing.visitor_id <> p_visitor_id THEN
      RAISE EXCEPTION 'Refresh this page and try again.' USING ERRCODE = '22023';
    END IF;
    -- A retry returns its original result even if the client changed its form.
    -- It cannot silently replace an already-published rating or comment.
    RETURN v_existing.id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profile_reviews r
    WHERE r.profile_id = p_profile_id AND r.visitor_id = p_visitor_id
      AND r.created_at > v_now - interval '24 hours'
  ) THEN
    RAISE EXCEPTION 'You can leave another review after 24 hours.' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) FILTER (WHERE r.created_at > v_now - interval '10 minutes'), count(*)
    INTO v_recent_count, v_daily_count
  FROM public.profile_reviews r
  WHERE r.profile_id = p_profile_id AND r.created_at > v_now - interval '24 hours';
  IF v_recent_count >= 30 OR v_daily_count >= 300 THEN
    RAISE EXCEPTION 'Reviews are busy right now. Please try again later.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.profile_reviews (
    profile_id, rating, comment, visitor_id, submission_id, created_at
  ) VALUES (
    p_profile_id, p_rating, v_comment, p_visitor_id, p_submission_id, v_now
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_reviews(uuid, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_profile_review(uuid, integer, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_reviews(uuid, integer, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_profile_review(uuid, integer, text, uuid, uuid) TO anon, authenticated, service_role;
