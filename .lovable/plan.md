# Drag & Drop Multi-Upload for Photo Collage

Right now the Photo Collage editor (`BlockModal.tsx`) only accepts one file at a time via the "+ Add" tile, and every image is forced through the single-image cropper. For batch uploads this is slow.

## Changes

**File: `src/components/personal/BlockModal.tsx`**

1. **Multi-file `<input>`**: Add `multiple` to the collage file input so users can select many photos/videos at once from the OS picker.

2. **Drag-and-drop zone**: Wrap the collage grid (lines 1077–1116) in a container with `onDragOver`, `onDragLeave`, and `onDrop` handlers. Show a highlighted dashed border + "Drop images here" overlay while dragging.

3. **Batch upload handler**: Refactor `handleCollageMediaSelect` into a shared `handleCollageFiles(files: File[])` used by both `<input onChange>` and the drop handler:
   - Respect the 9-item cap (`collageMedia.length + files.length` capped at 9; toast if trimmed).
   - Process files sequentially with a single `setUploadingCollageImage(true)` wrapping the whole batch.
   - **Images**: skip the single-image cropper in batch mode. Auto-square each image via a canvas center-crop (max 1200px, JPEG/WebP) then upload to `personal-photos` storage — reuse existing upload logic.
   - **Videos**: keep existing 20 MB / 60 s validation and poster-frame extraction.
   - Show progress toast like "Uploading 3 of 7…".

4. **Preserve single-add cropper**: If exactly one image file is added via the "+ Add" tile click, keep the existing cropper flow so users can fine-tune single uploads. Drag-drop and multi-select bypass cropping and use auto-square.

## Out of scope
No changes to storage, DB schema, or the public collage renderer. Alignment picker and other block types untouched.
