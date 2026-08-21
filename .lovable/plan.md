# Make the full banner logo always readable

## What's happening now

The public hub still renders the banner in a fixed tall panel (`h-[55vh]`) with `object-cover object-top`. A wide logo like the Mariscos sign gets blown up and chopped on the left, right and bottom — exactly what your first screenshot shows. The Fill/Fit toggle exists, but it is off by default, so hubs still land on the cropped look.

The rep phone preview in your second screenshot looks right because it scales the whole image down. The live page should behave the same.

## The fix: banner height follows the image

Stop forcing a fixed banner height. Instead, let the banner render at the image's own aspect ratio so the entire logo is always visible, edge-to-edge, with no crop:

- The banner container gets the sampled banner color as its background.
- The image renders full width with automatic height (capped so an unusually tall image cannot take over the screen).
- Result: a wide logo shows as a short, fully readable band; a squarer photo shows taller. No zoom, no cut edges.

This applies identically in three places so everything matches:
- the live public hub,
- the dashboard live preview,
- the sales rep phone preview.

## Fill vs Fit

- **Fit** (new default for banners) — the behavior above: whole logo visible.
- **Fill** — kept for photo-style banners that should bleed edge to edge with the soft fade.

Existing banner hubs (the three Las Nuevas Islas hubs, Las Islas Marias) get switched to Fit so their logos become readable immediately; anyone who prefers the old look can flip the toggle back in Design.

## Polish that comes with it

- The soft fade gradient under the banner only applies in Fill mode; in Fit mode the banner color continues cleanly into the page background, so there is no hard seam.
- The floating "Save my contact" / share icons keep their position and stay legible against the sampled color.

## Technical notes

- `src/pages/personal/PersonalProfilePage.tsx` (~line 1336): replace the `h-[55vh] md:h-[50vh]` + `object-cover` block with a color-filled wrapper and `w-full h-auto max-h-[60vh] object-contain` when `banner_fit !== 'cover'`.
- `src/components/personal/ProfilePreviewRenderer.tsx` (~line 800): same treatment, replacing the fixed `h-52`.
- `src/components/rep/LivePhonePreview.tsx`: swap the CSS `background-image` banner for a real `<img>` using the same rules so the preview is pixel-faithful.
- Default handling: treat a null/absent `banner_fit` as `contain` for `header_type === 'banner'`; keep `cover` only when explicitly set.
- One data update setting `banner_fit = 'contain'` on existing approved banner hubs.

## Verification

- Load the Las Nuevas Islas hub on mobile width: the full "Mariscos Las Nuevas Islas Estilo Nayarit" sign is visible with no cropped edges, matching the phone preview.
- Dashboard preview and rep preview render identically.
- Flipping to Fill restores the old cropped/faded banner.
