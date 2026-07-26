## Goal
Match target (image-179): auto-fetched **Website** and **Google Review** render as **full-width list rows** (globe/logo icon on the left), while TikTok/Instagram (and any other social with a cover) remain **half-width image tiles**. All items still freely reorderable.

## Root cause
Last change seeded Website + Review as half-width tiles with the place photo as cover. Target design wants them as clean full-width rows instead.

## Changes

### 1. `src/pages/rep/RepDemoCreate.tsx`
Seed Website + Google Review as full-width pill rows (no `cover_image_url`, no `grid_size`):
- Website: `display_style: 'pill'`, `thumbnail_url: <favicon>` (globe fallback).
- Google Review: `display_style: 'pill'` (Google "G" badge already rendered by `link_type: 'google_review'`).

### 2. `supabase/functions/magic-onboarding/index.ts`
Mirror the same pill seeding for Website and Google Review; leave social/photo tiles unchanged.

### 3. Backfill existing rep demos
One-off UPDATE to convert previously seeded Website + Review rows back to pill rows: set `display_style='pill'`, clear `grid_size` and `cover_image_url`.

### 4. Reorder integrity — no code change needed
`DashboardUnifiedContent` groups only consecutive half-tiles with cover images; full-width pills break the group cleanly and drag/reorder already works.

## Out of scope
Social tile rendering, public renderer, autosave, drag internals.
