-- Phase 1: Remove Fathom Analytics Integration
-- This migration removes all Fathom-related columns from the restaurants table
-- as we're now using internal Supabase-based analytics

-- Remove fathom_site_id column from restaurants table
ALTER TABLE public.restaurants DROP COLUMN IF EXISTS fathom_site_id;