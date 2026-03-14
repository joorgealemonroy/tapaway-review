

# Auto-Fill Imported Profile Data & Skip Photo Step

## Problem
When a user imports from Linktree/etc, the scraped photo and bio are available but never applied to the signup form. The user is then asked to re-upload a photo and write a headline — data they already had.

## Changes

### 1. `src/pages/personal/PersonalSignup.tsx` — Consume photo + bio from import
In the `tapaway_import_data` consumer effect (~line 100), also set:
- `profilePhotoUrl` from `imported.photoUrl`
- `cardHeadline` from `imported.bio` (or `imported.name` as fallback headline)

Also persist additional link properties (thumbnails, cover images, display styles, grid sizes) that are already being passed from the import page but currently ignored.

### 2. `src/components/personal/signup/LinksStep.tsx` — Auto-skip photo sub-step
When `formData.profilePhotoUrl` is already set on mount (i.e. from import), start at `subStep: 2` instead of `subStep: 1`, skipping the "Add your photo" step entirely. The user can still go back to it if they want to change things.

### Files
- `src/pages/personal/PersonalSignup.tsx` — add photoUrl + bio consumption from import data
- `src/components/personal/signup/LinksStep.tsx` — initialize subStep to 2 when photo already present

