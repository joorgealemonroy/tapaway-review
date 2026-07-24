DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'restaurants'
      AND policyname = 'Approved restaurant hubs are publicly visible'
  ) THEN
    CREATE POLICY "Approved restaurant hubs are publicly visible"
      ON public.restaurants
      FOR SELECT
      TO anon, authenticated
      USING (
        is_approved = true
        AND custom_slug IS NOT NULL
        AND length(trim(custom_slug)) > 0
      );
  END IF;
END;
$$;