
ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS pipeline_status text,
  ADD COLUMN IF NOT EXISTS card_print_pdf_path text,
  ADD COLUMN IF NOT EXISTS business_phone text;
