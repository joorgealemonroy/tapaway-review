# Manual banner cropping so every hub looks perfect

## The idea

Instead of the app guessing (Fill vs Fit vs auto-detect), the person building the hub crops the banner themselves in a banner-shaped editor and what they see is exactly what ships. No shrunken white strips, no zoomed-in logos.

## How it works

**1. "Adjust banner" editor**
In the Design tab, next to the banner image, an **Adjust banner** button opens a cropper:
- The crop frame is the real banner shape used on the live hub, so the frame *is* the preview.
- Drag to reposition, pinch or slider to zoom — including zooming out below 100% so a wide logo fits entirely inside the frame.
- Any empty space around the image is filled with a background color: auto-sampled from the image by default, with a small color picker to override (useful for logos on white or colored plates).
- Buttons: **Fit whole image** (one tap to zoom out until nothing is cut) and **Fill frame** (one tap to cover edge to edge).

**2. Banner shape control**
A short row of banner heights — **Short**, **Standard**, **Tall** — changes the crop frame and the live banner together, so a wide logo can use a Short band while a photo can use a Tall hero. The chosen shape is saved with the hub.

**3. One saved image, rendered identically everywhere**
Saving the crop writes a finished banner image at the chosen shape. The live hub, dashboard preview, and sales rep phone preview all render that image edge-to-edge at the saved aspect ratio — no `object-cover` re-crop, no per-view differences. What the rep crops is what the customer sees.

**4. Fixing the hubs already affected**
The recent bulk change flipped every banner hub (including Xol Coffee, Las Nuevas Islas, Islas Marias, and ~35 others) to Fit, which is what created the tiny strips. Those hubs fall back to a sensible Standard banner rendered from their existing image with the sampled background, so nothing looks broken before anyone re-crops; each can then be perfected in one pass with the new editor.

**5. Same tool for the photo header**
Hubs using the photo header (`header_type = 'image'`, e.g. Las Nuevas Islas) get the same editor and rendering rules so both header styles behave the same.

## Technical notes

- Extend `src/components/personal/ImageCropper.tsx`: accept a variable `aspect` (short 16:5, standard 16:7, tall 4:3), `minZoom` ~0.3, `restrictPosition={false}`, and a `backgroundColor` painted onto the canvas before `drawImage` so letterboxed areas export as solid color rather than transparent. Add "Fit whole image" / "Fill frame" presets that set zoom from the image's natural ratio vs the frame ratio.
- Default background color comes from the existing `sampleBannerColor` helper; expose a compact color input to override.
- Persist `banner_aspect` ('short' | 'standard' | 'tall') on `personal_profiles`; the exported image already encodes the crop, so `banner_fit` is retired from rendering and only kept as a legacy fallback for hubs that have not been re-cropped.
- Rendering (all three surfaces) becomes: wrapper with `aspect-ratio` from `banner_aspect`, background = sampled color, `<img className="w-full h-full object-cover">` — safe because the stored image already matches the ratio.
  - `src/pages/personal/PersonalProfilePage.tsx` (~1332-1371), and the content offset at ~1422.
  - `src/components/personal/ProfilePreviewRenderer.tsx` (~800-840).
  - `src/components/rep/LivePhonePreview.tsx` (~188-213).
- `src/components/personal/DashboardDesignTab.tsx`: replace the Fill/Fit toggle with the Adjust banner button plus the Short/Standard/Tall selector.
- Data update: reset the bulk-applied `banner_fit` values and set `banner_aspect = 'standard'` for existing banner hubs.

## Verification

- Crop the Las Nuevas Islas logo: the frame shows the whole sign on the sampled color, and the saved live hub matches the editor pixel for pixel.
- Xol Coffee and the other bulk-flipped hubs render a normal Standard banner immediately, with no thin white strip.
- Dashboard preview and rep phone preview match the live hub.
- Re-cropping an already-cropped banner reopens from the original upload, not the flattened export.
