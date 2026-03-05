ALTER TABLE public.personal_profiles ALTER COLUMN background_color SET DEFAULT '#000000';

UPDATE public.personal_profiles SET background_color = '#000000' WHERE background_color = '#ffffff' OR background_color IS NULL;