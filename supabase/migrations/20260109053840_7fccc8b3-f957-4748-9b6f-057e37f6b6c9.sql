-- Add thumbnail_url column to personal_links table for small icon images
ALTER TABLE public.personal_links 
ADD COLUMN thumbnail_url TEXT DEFAULT NULL;