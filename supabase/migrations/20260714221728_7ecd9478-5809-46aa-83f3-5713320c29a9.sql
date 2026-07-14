ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS pipeline_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS card_print_pdf_path text;

ALTER TABLE public.rep_demo_requests
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz;

DROP POLICY IF EXISTS "card-print-files owners and admins select" ON storage.objects;
DROP POLICY IF EXISTS "card-print-files owners and admins insert" ON storage.objects;
DROP POLICY IF EXISTS "card-print-files owners and admins update" ON storage.objects;
DROP POLICY IF EXISTS "card-print-files owners and admins delete" ON storage.objects;

CREATE POLICY "card-print-files owners and admins select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'card-print-files'
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id::text = split_part(name, '/', 1)
      AND (r.created_by = auth.uid() OR public.is_admin())
  )
);

CREATE POLICY "card-print-files owners and admins insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'card-print-files'
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id::text = split_part(name, '/', 1)
      AND (r.created_by = auth.uid() OR public.is_admin())
  )
);

CREATE POLICY "card-print-files owners and admins update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'card-print-files'
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id::text = split_part(name, '/', 1)
      AND (r.created_by = auth.uid() OR public.is_admin())
  )
);

CREATE POLICY "card-print-files owners and admins delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'card-print-files'
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id::text = split_part(name, '/', 1)
      AND (r.created_by = auth.uid() OR public.is_admin())
  )
);