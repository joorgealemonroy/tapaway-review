-- Add indexes for optimal personal profile queries
-- personal_links: index on profile_id + sort_order for ordered retrieval
CREATE INDEX IF NOT EXISTS idx_personal_links_profile_sort 
ON public.personal_links (profile_id, sort_order ASC) 
WHERE is_active = true;

-- personal_blocks: index on profile_id + sort_order for ordered retrieval  
CREATE INDEX IF NOT EXISTS idx_personal_blocks_profile_sort 
ON public.personal_blocks (profile_id, sort_order ASC)
WHERE is_active = true;

-- personal_profiles: index on username with subscription_status for fast lookups
CREATE INDEX IF NOT EXISTS idx_personal_profiles_username_active 
ON public.personal_profiles (username) 
WHERE subscription_status = 'active';