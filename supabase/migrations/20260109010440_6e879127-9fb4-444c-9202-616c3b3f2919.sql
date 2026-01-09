-- Add archive columns to personal_profiles
ALTER TABLE personal_profiles 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_header_image_url TEXT,
ADD COLUMN IF NOT EXISTS archived_header_type TEXT;

-- Add archive flag to personal_links
ALTER TABLE personal_links ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add archive flag to personal_blocks
ALTER TABLE personal_blocks ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Create cleanup function for archived content older than 60 days
CREATE OR REPLACE FUNCTION cleanup_expired_archives()
RETURNS void AS $$
BEGIN
  -- Delete archived blocks older than 60 days for free users
  DELETE FROM personal_blocks b
  WHERE b.is_archived = true
  AND EXISTS (
    SELECT 1 FROM personal_profiles p 
    WHERE p.id = b.profile_id 
    AND (p.plan_type = 'free' OR p.plan_type IS NULL)
    AND p.archived_at < NOW() - INTERVAL '60 days'
  );
  
  -- Delete archived links older than 60 days for free users
  DELETE FROM personal_links l
  WHERE l.is_archived = true
  AND EXISTS (
    SELECT 1 FROM personal_profiles p 
    WHERE p.id = l.profile_id 
    AND (p.plan_type = 'free' OR p.plan_type IS NULL)
    AND p.archived_at < NOW() - INTERVAL '60 days'
  );
  
  -- Clear archived header images for free users after 60 days
  UPDATE personal_profiles
  SET archived_header_image_url = NULL,
      archived_header_type = NULL
  WHERE (plan_type = 'free' OR plan_type IS NULL)
  AND archived_at < NOW() - INTERVAL '60 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;