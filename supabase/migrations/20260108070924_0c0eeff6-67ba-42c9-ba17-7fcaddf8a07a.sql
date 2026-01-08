-- Add cover_image_url column to personal_links table
ALTER TABLE personal_links ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Create storage bucket for link cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('personal-link-images', 'personal-link-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the new bucket
CREATE POLICY "Anyone can view link images"
ON storage.objects FOR SELECT
USING (bucket_id = 'personal-link-images');

CREATE POLICY "Authenticated users can upload link images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'personal-link-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update link images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'personal-link-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete link images"
ON storage.objects FOR DELETE
USING (bucket_id = 'personal-link-images' AND auth.role() = 'authenticated');