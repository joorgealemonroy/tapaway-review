CREATE OR REPLACE FUNCTION public.get_signup_dropoff_stats(days_back int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total', COUNT(*),
    'verified', COUNT(*) FILTER (WHERE verified_at IS NOT NULL),
    'abandoned', COUNT(*) FILTER (WHERE verified_at IS NULL),
    'abandoned_list', (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT email, created_at
        FROM pending_otps
        WHERE verified_at IS NULL
          AND created_at > now() - (days_back || ' days')::interval
        ORDER BY created_at DESC
        LIMIT 20
      ) t
    )
  ) INTO result
  FROM pending_otps
  WHERE created_at > now() - (days_back || ' days')::interval;

  RETURN result;
END;
$$;