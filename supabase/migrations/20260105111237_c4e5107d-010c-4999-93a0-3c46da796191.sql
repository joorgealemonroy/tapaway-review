-- Add is_featured column to personal_links for featured link functionality
ALTER TABLE public.personal_links 
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Create a partial unique index to ensure only one featured link per profile
CREATE UNIQUE INDEX IF NOT EXISTS personal_links_one_featured_per_profile 
ON public.personal_links (profile_id) 
WHERE is_featured = true;