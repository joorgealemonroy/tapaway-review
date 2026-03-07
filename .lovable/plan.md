

# Smart "Copy Layout" Wizard — Clean Slate + Contrast Engine

## Overview

Five focused changes across 3 files to make the "Copy Layout" flow smarter: sanitize copied data, add image upload affordances inline, implement automatic contrast/readability detection, update preview copy, and use Framer Motion for carousel transitions.

## Changes

### 1. Clean Slate Placeholders (`src/components/card/HubShowcase.tsx`)

In `handleCopyLayout`, strip the original creator's specific data from the copied layout:
- Set link `label` to generic placeholders based on type (e.g. `"Instagram"` stays as-is since it's a platform name, but custom labels like `"Living Club Cali"` become `"Your Link"`)
- Set link `placeholder` to contextual hints: `"@yourhandle"` for socials, `"Paste your link"` for externals
- For blocks, replace creator-specific content with `BLOCK_PLACEHOLDER_CONTENT` (already exists in the file)

Logic: If `link_type` is a known social platform, keep the platform name as label. Otherwise, set label to a generic version (e.g. `"My Website"`, `"My Link"`).

### 2. Image-Aware Inputs in Carousel (`src/components/personal/signup/LinksStep.tsx`)

In `renderSubStep2()`, for carousel items that have image-related properties (links with `coverImageUrl`, `thumbnailUrl`, or image blocks):
- Add a prominent "Upload Image" button below the text input inside the carousel card
- Wire it to open a file picker → ImageCropper with appropriate aspect ratio (1:1 for thumbnails, 16:9 for covers)
- Show a small preview thumbnail if an image is already uploaded

### 3. Automatic Contrast Engine (`src/components/personal/signup/LinksStep.tsx`)

Add luminance detection in the preview data construction. When `formData.profilePhotoUrl` or `formData.headerColor`/`backgroundColor` changes:
- Compute luminance using the existing `isColorDark` pattern from `ProfilePreviewRenderer.tsx` (inline the same hex luminance check)
- If the background is very light (luminance > 0.7), auto-switch text to dark mode by adjusting the `backgroundColor` to a darker value, or by setting a new `textColorMode` field
- This is already handled in `ProfilePreviewRenderer.tsx` via `isDarkBg` — no extra work needed there. The real fix: ensure `headerColor` and `backgroundColor` defaults don't produce white-on-white. Add a guard in `handleCropComplete` that also checks banner luminance and warns/adjusts.

Actually, the existing `ProfilePreviewRenderer` already handles contrast via `isDarkBg` → `headingClass`/`textClass`. The issue is when users upload a white profile photo as a banner. The fix:
- In `handleCropComplete`, after extracting the bottom color, check luminance. If > 0.7, auto-set `backgroundColor` to a dark color if currently light, or show a toast suggesting dark background.

### 4. Preview Copy Update (`src/components/personal/signup/LinksStep.tsx`)

Change line 846 from `"This is exactly what people will see"` to `"Mobile Preview (Example Only)"`.

### 5. Framer Motion Transitions for Carousel (`src/components/personal/signup/LinksStep.tsx`)

Wrap the carousel card in `<AnimatePresence>` + `<motion.div>` with `key={activeLinkIndex}` for smooth slide transitions between items. Already imported via `PersonalSignup.tsx` parent — just need to import `motion, AnimatePresence` from `framer-motion` in LinksStep.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/card/HubShowcase.tsx` | Sanitize copied layout: generic labels + contextual placeholders instead of creator data |
| `src/components/personal/signup/LinksStep.tsx` | Image upload in carousel cards, contrast guard in `handleCropComplete`, preview copy update, Framer Motion carousel transitions |

