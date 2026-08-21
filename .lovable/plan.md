# Fix banner logos getting cropped and over-zoomed

## What's wrong today

Two separate problems stack on top of each other:

1. **The crop dialog is the wrong shape.** When a hub uses the full-banner header, the photo is still cropped through the round, square (1:1) cropper. A wide logo like the Mariscos sign cannot fit inside a circle, so the sides get chopped before it is even saved.
2. **You cannot zoom out.** The zoom slider's minimum is 1 (already "filling" the frame), so there is no way to pull back and show the whole logo.
3. **The banner then re-crops the image.** Both the dashboard preview and the live hub render the banner with `object-cover object-top`, which zooms the image again to fill a tall panel — that is why the logo shows up huge and unreadable.

## The fix

**1. Banner-aware cropping**
- When the hub's header is a full banner, open the cropper in rectangular mode with the banner's real aspect ratio instead of the round 1:1 shape.
- Keep the round 1:1 crop for regular avatar photos.

**2. Zoom out past "fill"**
- Lower the cropper's minimum zoom so the whole image can be pulled inside the frame, and allow the image to be positioned freely.
- Any empty space created by zooming out is filled with the image's own dominant edge color (already computed elsewhere in the app), so the saved image stays a clean, seamless rectangle instead of showing black bars.

**3. A "Fit whole logo" banner option**
- Add a small Fill / Fit toggle to the banner section of the design editor.
- **Fill** keeps today's behavior (edge-to-edge, may crop).
- **Fit** shows the entire logo, letterboxed against the sampled banner color, and uses a shorter banner panel so a wide logo reads at a comfortable size.
- Default new banner uploads to **Fit** when the image is clearly wide (logo-like), otherwise Fill.

**4. Apply everywhere the banner renders**
The same rendering rules go into the dashboard preview, the public hub page, and the rep live phone preview so what the rep sees matches what the customer sees.

## Technical notes

- `src/components/personal/ImageCropper.tsx`: add `minZoom` prop (default 1, banner mode ~0.4), pass `restrictPosition={false}`, and change `getCroppedImg` to paint a background fill color before `drawImage` so out-of-bounds areas are colored instead of transparent.
- `src/pages/personal/PersonalDashboard.tsx`: pass `aspectRatio` / `cropShape` / `minZoom` based on `profile.header_type === "banner"` (currently uses defaults). `HeaderCustomizer.tsx` already passes `16/5` rect and gets the same `minZoom` treatment.
- New persisted setting `banner_fit: "cover" | "contain"` on the personal profile (stored in the existing profile settings JSON, no new column needed).
- Rendering updates:
  - `src/components/personal/ProfilePreviewRenderer.tsx` (~line 800): `object-cover object-top` becomes conditional; container `h-52` shrinks in contain mode.
  - `src/pages/personal/PersonalProfilePage.tsx` (~line 1336): same conditional for the `h-[55vh]` banner block.
  - `src/components/rep/LivePhonePreview.tsx`: mirror the change.
- The bottom mask/fade gradients stay as-is; in contain mode the letterbox color is the already-extracted `extractedBannerColor`, so the fade still blends.

## Verification

- Upload the wide Mariscos logo on a banner hub: the crop dialog opens rectangular, the slider allows zooming out to show the entire sign, and the saved banner shows the full readable logo on both the dashboard preview and the live hub.
- Confirm existing banner hubs (Las Nuevas Islas x3, Las Islas Marias) are unchanged since they default to Fill.
- Confirm the round avatar crop still behaves the same for non-banner hubs.
