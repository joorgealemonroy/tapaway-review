-- Add review_hub_url column for demo restaurant feature
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS review_hub_url text;

-- Note: is_demo_account column already exists in the table