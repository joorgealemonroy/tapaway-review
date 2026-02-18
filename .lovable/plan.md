
# Add Image Cropping to All Image Uploads in LinkModal

## Problem
Currently, cover images and thumbnail icons uploaded in the Link Modal are uploaded directly without any cropping. The `ImageCropper` component already exists and works well for profile photos and header images -- we just need to wire it into `LinkModal.tsx`.

## Changes

### File: `src/components/personal/LinkModal.tsx`

**1. Import the ImageCropper component**

Add `import { ImageCropper } from "./ImageCropper";` to the imports.

**2. Add cropper state variables**

Add state for managing the cropper dialog for both cover images and thumbnails:
- `cropperOpen` / `setCropperOpen` -- whether the crop dialog is showing
- `cropperImageSrc` -- the raw image data URL to crop
- `cropperMode` -- either `"cover"` or `"thumbnail"` to know which upload triggered the crop

**3. Update `handleCoverImageUpload`**

Instead of uploading immediately, read the file as a data URL and open the cropper:
- Convert the selected file to a data URL (or object URL)
- Set `cropperImageSrc` to that URL
- Set `cropperMode` to `"cover"`
- Open the cropper dialog

**4. Update `handleThumbnailUpload`**

Same approach -- open the cropper instead of uploading directly:
- Set `cropperMode` to `"thumbnail"`
- Open the cropper dialog

**5. Add `handleCropComplete` callback**

When the user finishes cropping:
- Take the cropped `Blob` from the cropper
- Upload it to Supabase storage (same upload logic currently in the handlers)
- Set the resulting public URL as `coverImageUrl` or `thumbnailUrl` depending on `cropperMode`

**6. Render the ImageCropper component**

Add the `ImageCropper` at the bottom of the modal content with:
- `aspectRatio`: 4/3 for cover images, 1 for thumbnails
- `cropShape`: "rect" for cover images, "round" for thumbnails

## Cropper configuration per upload type

| Upload | Aspect Ratio | Crop Shape |
|--------|-------------|------------|
| Cover image | 4/3 | Rectangle |
| Thumbnail icon | 1 (square) | Round |

## No other files need changes

The `ImageCropper` component already supports all needed props (`aspectRatio`, `cropShape`, `onCropComplete`). Only `LinkModal.tsx` needs to be updated.
