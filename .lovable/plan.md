

# Fix Collage Video Thumbnails — Instant Loading via Pre-Generated Posters

## Problem
Video thumbnails in the collage are generated client-side at render time using a hidden `<video>` element. On mobile, this is slow and unreliable, showing blank pulsing placeholders.

## Solution
Generate a JPEG poster frame at upload time, store it in the same storage bucket, and save the URL in the `media` JSON. At render time, use the stored poster as a plain `<img>` — instant loading. Legacy videos without a poster fall back to the existing `VideoThumbnail` component.

## Changes

### 1. `src/components/personal/BlockModal.tsx` — Generate poster at upload time

Add a helper function `extractVideoPoster(file: File): Promise<Blob>` that:
- Creates object URL, loads into hidden `<video>` element
- Waits for `onloadeddata` event, then sets `currentTime = 0.1`
- Waits for `onseeked` event, then draws to canvas and converts to JPEG blob
- Calls `URL.revokeObjectURL()` in a `finally` block to prevent memory leaks
- Returns the JPEG blob via Promise

In the video upload flow (lines 392-416), after uploading the video file:
- Call `extractVideoPoster(file)` to get the JPEG blob
- Upload the blob to `personal-photos/{userId}/collage/{timestamp}_thumb.jpg`
- Get the public URL
- Add to collage media as `{ url: videoPublicUrl, type: "video", poster: thumbPublicUrl }`

### 2. `src/pages/personal/PersonalProfilePage.tsx` — Use stored poster

- Update the `media` type to `Array<{ url: string; type: "image" | "video"; poster?: string }>`
- In `CollageWithLightbox`, for video items: if `item.poster` exists, render `<img src={item.poster}>` instead of `<VideoThumbnail url={item.url} />`
- Fall back to `<VideoThumbnail>` only when no poster is present (legacy videos)

### 3. `src/components/personal/ProfilePreviewRenderer.tsx` — Dashboard preview

The `CollagePreview` component currently only handles `images: string[]` (legacy format). Update it to also accept the `media` format with `poster` support:
- Update the `photo_collage` case (line 642) to parse the `media` JSON and pass it to `CollagePreview`
- Update `CollagePreview` to handle media items with video type + poster, rendering `<img src={poster}>` for videos with posters

## Files Modified

| File | Change |
|------|--------|
| `src/components/personal/BlockModal.tsx` | Add `extractVideoPoster()` helper; upload poster alongside video |
| `src/pages/personal/PersonalProfilePage.tsx` | Use `poster` field for instant video thumbnails |
| `src/components/personal/ProfilePreviewRenderer.tsx` | Support media format with poster in dashboard preview |

No database migration needed — the `poster` field lives inside the existing JSON content blob.

