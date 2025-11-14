-- Update restaurant-logos bucket to allow larger file sizes
-- Current error: Object exceeded maximum allowed size
-- Setting file size limit to 50MB (52428800 bytes)

UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'restaurant-logos';

-- Also ensure the bucket exists with proper settings
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('restaurant-logos', 'restaurant-logos', true, 52428800)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = 52428800;