# Sharp banner crops — stop the quality loss on logos

## What's happening

Two things stack up on a logo like the Las Nuevas Islas sign:

1. The uploaded file has a huge white margin, so the actual artwork is only a small part of the image. You have to zoom way out to fit it into the banner frame, which means only a fraction of the original pixels ends up in the banner.
2. Before the crop even opens, the upload is downscaled, and the cropper then exports at a hard 1024px cap with 0.8 quality. A wide banner exported at 1024px wide is already soft on a phone screen (2-3x device pixel ratio), and the letterboxed logo occupies only part of that.

## The fix

**1. Crop from the full-resolution original**
Keep the original upload untouched as the crop source instead of the pre-compressed copy, so zooming out no longer throws away detail.

**2. Export banners at real display resolution**
Banner crops export at up to 2048px wide (instead of 1024px on the longest side) at higher quality. The output canvas is sized from the banner frame, not the crop rectangle, so a zoomed-out logo is rendered at full frame size rather than shrunk and stretched back up.

**3. Auto-trim the empty margin**
When a banner image is opened in the cropper, detect and trim uniform empty borders (the white space around the sign) before the frame is fitted. The logo then fills the frame at a sensible zoom by default, so you rarely need to zoom out at all — and the fill color picker still handles whatever space is left.

**4. "Fit whole logo" button**
One tap sets the zoom so the entire artwork sits inside the banner frame with the background color behind it — no manual slider hunting for the right zoom.

## Scope guard

These changes apply to the banner/header crop path only. Avatar crops, link tiles and block images keep their current behavior, and no existing profile's saved banner is touched — only newly saved crops use the new pipeline.

## Technical notes

- `src/components/personal/ImageCropper.tsx`: make `MAX_IMAGE_DIMENSION` and JPEG/WebP quality props (banner: 2048 / 0.92; default stays 1024 / 0.8). Size the export canvas from `aspectRatio` at the target width and draw the source scaled into it, painting `fillColor` first.
- Add an auto-trim helper (sample border pixels, find the bounding box of non-uniform content with a tolerance) used to pick the initial zoom/crop when `cropShape === "rect"` and `editableFill` is set; skip if the trim finds nothing.
- Add a "Fit whole logo" preset button next to Reset that computes zoom from the trimmed image ratio vs `aspectRatio`.
- `src/components/personal/DashboardDesignTab.tsx` (and `PersonalDashboard.tsx` banner upload): pass the raw `File` object URL to the cropper rather than the compressed blob; compression continues to run on the exported crop before upload.

## Verification

- Re-crop the Las Nuevas Islas logo: it lands near-full-frame without manual zoom-out and stays crisp on the live hub at phone resolution.
- Compare the exported banner file dimensions before/after (should be ~2048px wide).
- Avatar, link-tile and block crops are unchanged.
