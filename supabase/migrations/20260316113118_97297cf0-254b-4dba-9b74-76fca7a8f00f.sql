ALTER TABLE public.personal_links ADD COLUMN is_placeholder boolean NOT NULL DEFAULT false;
ALTER TABLE public.personal_blocks ADD COLUMN is_placeholder boolean NOT NULL DEFAULT false;