-- Drop existing check constraint
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_plan_type_check;

-- Add columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurants' AND column_name='plan_type') THEN
    ALTER TABLE restaurants ADD COLUMN plan_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurants' AND column_name='hub_background_style') THEN
    ALTER TABLE restaurants ADD COLUMN hub_background_style TEXT;
  END IF;
END $$;

-- Set defaults for all rows
UPDATE restaurants 
SET plan_type = COALESCE(plan_type, 'standard'),
    hub_background_style = COALESCE(hub_background_style, 'classic');

-- Update specific restaurants to their correct plan types
UPDATE restaurants 
SET plan_type = 'bundle'
WHERE custom_slug IN ('lasislassalem', 'lasislaswoodburn', 'lasislasportland');

UPDATE restaurants 
SET plan_type = 'private_access'
WHERE custom_slug = 'avmealpreps';