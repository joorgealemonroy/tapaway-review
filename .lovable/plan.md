

# Add Video Support to Photo Collage (up to 1 minute)

## Overview

Extend the existing `photo_collage` block to support mixed media (images + videos up to 60 seconds). The collage data model changes from `images: string[]` to `media: Array<{url, type}>` with backward compatibility for existing image-only collages.

---

## 1. BlockModal.tsx — Upload & Builder Changes

- Rename internal state from `collageImages` to `collageMedia: Array<{url: string, type: "image" | "video"}>`
- Change the file input `accept` from `image/*` to `image/*,video/*`
- On file select:
  - If image → existing crop + compress + upload flow
  - If video → validate duration ≤ 60s using `HTMLVideoElement.duration`, enforce 20MB limit, upload directly to `personal-photos` storage bucket (no cropping)
- Show video thumbnails in the 4-column grid with a play icon overlay
- Save content as `{ media: JSON.stringify([{url, type}]), columns }` (keep `images` key as fallback for old data)
- Update the edit-loading logic to parse both old `images` format and new `media` format

## 2. PersonalProfilePage.tsx — Collage Rendering

- Update `CollageWithLightbox` to accept `media: Array<{url, type}>` instead of `images: string[]`
- In the carousel, render `<video>` elements for video items (muted, loop, playsInline, autoPlay for short preview) with a play button overlay
- In the lightbox, render a `<video controls>` for video items instead of `<img>`

## 3. ImageLightbox.tsx — Video Support

- Change `images: string[]` prop to `media: Array<{url: string, type: "image" | "video"}>`
- When `type === "video"`, render `<video controls autoPlay>` instead of `<img>`
- Keep all navigation and keyboard controls the same

## 4. Backward Compatibility

- The `photo_collage` case in the profile renderer currently reads `content.images`. Update to:
  1. Check for `content.media` (new format) → parse as `{url, type}[]`
  2. Fall back to `content.images` (old format) → map to `{url, type: "image"}[]`
- Same fallback logic in `BlockModal` edit loading, `AdminBlocksManager`, and `AdminUnifiedContent` display labels

## 5. Admin Components

- Update `AdminBlocksManager.tsx` and `AdminUnifiedContent.tsx` block description to count both images and videos (e.g., "3 images, 1 video")

---

## Files

| File | Change |
|------|--------|
| `src/components/personal/BlockModal.tsx` | Video upload, duration validation, mixed media state |
| `src/pages/personal/PersonalProfilePage.tsx` | CollageWithLightbox renders videos, backward-compat parsing |
| `src/components/personal/ImageLightbox.tsx` | Support video items in lightbox |
| `src/components/admin/AdminBlocksManager.tsx` | Update collage description label |
| `src/components/admin/AdminUnifiedContent.tsx` | Update collage description label |

No database or storage changes needed — videos upload to the existing `personal-photos` bucket.

