-- Drop the overly permissive RLS policy that exposes all restaurant data
DROP POLICY IF EXISTS "Public can view restaurant public info" ON public.restaurants;

-- The restaurant_public_info view already exists and provides safe public access
-- Owners can still access full data via "Owners can view their restaurants" policy
-- This migration removes the security vulnerability while maintaining functionality