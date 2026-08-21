# Fix the shrunken banner band (Fit mode) across all hubs

## What's wrong now

The last change made the banner take the image's own height. For a wide logo on a white plate (Las Nuevas Islas, Xol Coffee, and every other banner hub) that produces a thin, small strip that reads as an accident rather than a header. The bulk data update also flipped **every** banner hub to Fit — including hubs whose banner is a photo, which should still bleed edge-to-edge.

Confirmed in the database: 39+ banner hubs are currently set to `banner_fit = 'contain'`, including `xolcoffee`; `lasnuevasislas` uses `header_type = 'image'` and is still `cover`.

## The fix

**1. A real banner panel, not a strip**
In Fit mode the banner gets a proper minimum height (roughly 30% of screen height on the live hub, with matching proportions in the dashboard and rep previews). The panel is filled with the color sampled from the image, and the logo is centered inside it at a comfortable size with a little breathing room on all sides. Result: the full logo stays readable but sits in a header-sized area instead of a squished band.

**2. Stop guessing — let the image decide**
Instead of relying on a stored setting that was mass-applied, the renderer measures the image once it loads:
- Wide, logo-shaped images (aspect ratio wider than about 2:1) get the Fit panel.
- Photo-shaped images (closer to square or tall) get the classic edge-to-edge Fill banner with the soft fade.
The manual Fill/Fit toggle in Design still wins when the owner has explicitly set it; the automatic choice only applies where nothing was deliberately chosen.

**3. Undo the blanket data change**
The rows that were flipped to `contain` in bulk are reset so behavior comes from the automatic rule above, which fixes Xol Coffee and the other affected hubs in one pass without hand-tuning each one.

**4. Same rules for the `image` header type**
The photo-header path (`header_type = 'image'`, e.g. Las Nuevas Islas) currently ignores fit entirely. It gets the same panel/measure logic so both header styles behave identically.

**5. Blending**
The sampled banner color continues into the page background under the panel, so there is no hard seam or white cutoff, and the floating Save-contact / Share icons keep contrast against light logo plates.

## Technical notes

- Add a small shared helper (e.g. `src/lib/bannerFit.ts`) exporting the effective-fit decision: explicit `banner_fit` wins, otherwise derive from the loaded image's `naturalWidth / naturalHeight` (>= 2.0 → contain, else cover).
- `src/pages/personal/PersonalProfilePage.tsx` (~1332-1371): Fit branch becomes a `min-h-[30vh]` flex-centered wrapper painted with `extractedBannerColor`, image `max-h-full w-auto max-w-[88%] object-contain` plus vertical padding. Keep the existing Fill branch untouched. Adjust the `-mt-32` / `mt-6` content offset at ~1422 accordingly.
- `src/components/personal/ProfilePreviewRenderer.tsx` (~800-840): same structure at preview scale (`min-h-[150px]`).
- `src/components/rep/LivePhonePreview.tsx` (~188-213): same structure at 170px min height so the rep preview stays pixel-faithful.
- Header-image path: apply the same wrapper where `header_type === 'image'` renders `optimizedHeaderUrl`.
- One migration/data update resetting `banner_fit` to null for the rows set by the previous bulk update, and treating null as "auto".

## Verification

- Las Nuevas Islas and Xol Coffee: logo appears centered in a full-size colored header panel, fully readable, no thin white strip.
- A photo-banner hub still renders edge-to-edge with the bottom fade.
- Dashboard preview and rep phone preview match the live hub.
- Manually flipping Fill/Fit in Design still overrides the automatic choice.
