-- Add grid_size column to personal_links for 2-column grid layout
ALTER TABLE personal_links ADD COLUMN IF NOT EXISTS grid_size text DEFAULT 'half';

-- Add comment for clarity
COMMENT ON COLUMN personal_links.grid_size IS 'Controls card width: half (2-column grid) or full (full width)';