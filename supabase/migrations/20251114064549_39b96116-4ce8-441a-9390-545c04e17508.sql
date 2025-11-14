-- Ensure menu_sections and menu_items have proper RLS policies for uploads
-- The issue is likely that when inserting, the owner check isn't working properly

-- First, let's make sure the policies allow inserts with proper ownership checks
-- Drop existing ALL policies and recreate with explicit INSERT, UPDATE, DELETE

-- For menu_sections
DROP POLICY IF EXISTS "Owners can manage menu sections" ON menu_sections;

-- Owners can INSERT their own menu sections
CREATE POLICY "Owners can insert menu sections"
ON menu_sections
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM restaurants
    WHERE restaurants.id = menu_sections.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

-- Owners can UPDATE their own menu sections
CREATE POLICY "Owners can update menu sections"
ON menu_sections
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM restaurants
    WHERE restaurants.id = menu_sections.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

-- Owners can DELETE their own menu sections
CREATE POLICY "Owners can delete menu sections"
ON menu_sections
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM restaurants
    WHERE restaurants.id = menu_sections.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

-- For menu_items
DROP POLICY IF EXISTS "Owners can manage menu items" ON menu_items;

-- Owners can INSERT their own menu items
CREATE POLICY "Owners can insert menu items"
ON menu_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM menu_sections
    JOIN restaurants ON restaurants.id = menu_sections.restaurant_id
    WHERE menu_items.section_id = menu_sections.id
    AND restaurants.owner_id = auth.uid()
  )
);

-- Owners can UPDATE their own menu items
CREATE POLICY "Owners can update menu items"
ON menu_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM menu_sections
    JOIN restaurants ON restaurants.id = menu_sections.restaurant_id
    WHERE menu_items.section_id = menu_sections.id
    AND restaurants.owner_id = auth.uid()
  )
);

-- Owners can DELETE their own menu items
CREATE POLICY "Owners can delete menu items"
ON menu_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM menu_sections
    JOIN restaurants ON restaurants.id = menu_sections.restaurant_id
    WHERE menu_items.section_id = menu_sections.id
    AND restaurants.owner_id = auth.uid()
  )
);