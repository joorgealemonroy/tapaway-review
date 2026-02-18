
# Fix: Duplicate Blocks, Auto Style Color, and Preview Icons

## Issues Found

### 1. Duplicate block list below Continue button
The `BlocksManager` component renders its own block list AND an "Add block" button (lines 268-314 of BlocksManager.tsx). Since LinksStep already shows blocks in the unified content list, the BlocksManager is creating a duplicate set of blocks below the Continue button. Fix: hide BlocksManager's built-in list rendering when used in "external modal" mode.

### 2. Preview missing icons and cover images
The `previewLinks` mapping in LinksStep (lines 257-266) does not pass `display_style`, `cover_image_url`, `grid_size`, or `thumbnail_url` to the preview renderer. This means:
- Social icon bar never appears (requires `display_style: "icon"` or `"both"`)
- Cover image cards don't render
- Thumbnail icons don't show

### 3. No automatic style color matching
When a user uploads a profile photo, the Style section keeps the default green (#6BCB77) header color. It should auto-extract a color from the photo and apply it.

---

## Changes

### File: `src/components/personal/BlocksManager.tsx`
- When `externalModalOpen` prop is provided (indicating it's being used as a modal-only component from LinksStep), skip rendering the block list and "Add block" button entirely
- Only render the Dialog and AlertDialog modals

### File: `src/components/personal/signup/LinksStep.tsx`

**Fix preview data mapping** -- add missing fields to `previewLinks`:
```
display_style: link.displayStyle || null
cover_image_url: link.coverImageUrl || null
grid_size: link.gridSize || null
thumbnail_url: link.thumbnailUrl || null
```

**Auto-match style color** -- after profile photo crop completes:
- Import `extractBottomColor` from `imageColorExtraction.ts`
- In `handleCropComplete`, call `extractBottomColor(previewUrl)` to get the dominant color
- Auto-set `headerColor` to the extracted color
- Show a toast like "Style color matched to your photo"

### No other files change
