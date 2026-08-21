# Logo header — the Islas Marias look, built into the hub

## The problem with Fill / Fit

Fill crops a wide logo until it is unreadable. Fit shrinks it into a thin strip. Both come from forcing the logo into an edge-to-edge banner panel that has to be a fixed shape. On a phone neither reads well, and the person building the hub has to fight a zoom slider to get anything usable.

## The new approach

Replace the Fit option with a **Logo header** — exactly the top of the Islas Marias review page:

- The logo is shown **whole, never cropped**, centered near the top of the hub.
- It sits on the page background (auto-sampled from the logo, overridable), so there are no letterbox bars, no white strip, no hard banner edge — the header just *is* the top of the page.
- The logo is sized by comfort, not by a frame: it takes up to ~78% of the phone width and is capped at roughly a third of the screen height, with breathing room above and below. Wide wordmarks and round crest logos both land at a readable size with no zoom slider at all.
- Below the logo, the page continues straight into the normal Solo Pro layout — name, tagline, action buttons, tiles — with the standard spacing. Nothing is cramped and nothing overlaps.
- Save contact / Share stay in the top-right corner, tinted for a light or dark background as they already are.

Mobile is the reference: the sizing is defined in phone terms first, then relaxed slightly on desktop.

## What the hub owner sees in the editor

The Design tab header choices become: **Solid color · Photo header · Full banner · Logo header**.

- Picking Logo header needs no cropping at all — the uploaded image is used as-is. The Adjust/crop step is skipped for this style.
- A small size control (Small / Medium / Large) nudges the logo scale for anyone who wants it bigger or smaller.
- The background color behind it is auto-sampled with a picker to override.

## Existing hubs are not touched

No bulk migration and no change to any saved profile. Every hub currently on Full banner keeps its exact current appearance. Logo header only applies where someone deliberately chooses it — starting with Mariscos Las Nuevas Islas.

## Technical notes

- New header style value `logo` alongside `color` / `image` / `banner` on `personal_profiles.header_type`, plus a `logo_scale` setting (`sm` | `md` | `lg`) stored with the existing profile settings. Existing rows unchanged.
- Rendering helper shared by the three surfaces so they can't drift:
  - `src/pages/personal/PersonalProfilePage.tsx` (~1332): new branch before the `hasBanner` branch — a padded container with the sampled background, `<img className="mx-auto w-[78%] max-h-[32vh] object-contain">`, no mask, no fade gradient, and content offset `mt-0` instead of `-mt-32`.
  - `src/components/personal/ProfilePreviewRenderer.tsx` and `src/components/rep/LivePhonePreview.tsx`: same branch, scaled to their mock widths.
- `src/components/personal/DashboardDesignTab.tsx` / `HeaderCustomizer.tsx`: add the Logo header radio option and the size control; hide the Fill/Fit toggle and the banner Adjust button when this style is selected.
- Background color reuses `src/lib/sampleBannerColor.ts`; the crop pipeline in `ImageCropper.tsx` is left alone.

## Verification

- Mariscos Las Nuevas Islas on Logo header: full sign readable at a comfortable size on a 390px phone, page flows straight into the Solo Pro tiles.
- A round crest logo (Islas Marias) renders at the same visual weight without any adjustment.
- Reborn Wraps, Xol Coffee and every other existing banner hub render byte-identical to today.
- Dashboard preview and rep phone preview match the live hub.
