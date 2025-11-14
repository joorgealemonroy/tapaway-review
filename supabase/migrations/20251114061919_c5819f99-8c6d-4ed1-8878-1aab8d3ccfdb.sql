-- Fix analytics_events RLS policy to allow public inserts (for guest tracking on ReviewHub)
-- while keeping SELECT restricted to owners and admins

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Authenticated users can insert analytics" ON analytics_events;

-- Allow anyone (including guests) to insert analytics events
-- This is necessary because ReviewHub is publicly accessible and guests need to track taps
CREATE POLICY "Anyone can insert analytics events"
ON analytics_events
FOR INSERT
WITH CHECK (true);

-- Keep existing SELECT policies for owners and admins (no changes needed)
-- "Restaurant owners can view their analytics" - already exists
-- "Admins can view all analytics" - already exists