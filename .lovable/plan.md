

# Default pfp_position to "center" Everywhere

## Current State
- The database column `pfp_position` defaults to `'left'` (set in migration `20260105061710`)
- The `create-personal-account` edge function already hardcodes `"center"`
- The signup flow (`LinksStep.tsx`, `DashboardHeroEditor.tsx`) already hardcodes `"center"`
- But any profile created before those hardcodes, or via other paths, got `'left'`
- The code in `ProfilePreviewRenderer.tsx` falls back to `"center"` if null, but not if `"left"`

## Changes Needed

### 1. Database migration — change column default + fix existing rows
- `ALTER TABLE personal_profiles ALTER COLUMN pfp_position SET DEFAULT 'center'`
- `UPDATE personal_profiles SET pfp_position = 'center' WHERE pfp_position = 'left' OR pfp_position IS NULL`

This fixes all existing profiles and ensures every new profile defaults to center.

### 2. No code changes needed
All the code paths already either hardcode `"center"` or fall back to `"center"`. The only source of `"left"` was the database default, which this migration fixes.

## Files Modified
- New database migration (schema default change + data backfill)

