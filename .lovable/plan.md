# Logo header: logo band takes the logo's color, bottom stays the owner's color

## What went wrong

The logo band is currently painted with `header_color`, an old field that most hubs already had set from the previous design. Mariscos Las Nuevas Islas has `header_color = #0F172A` (dark navy) left over from before, so its white logo now sits on a navy slab while the page below stays white — exactly the mismatch in the screenshot. The page color was also being auto-shifted to a "companion" shade, which is not what was asked for.

## What it should do

- Top band behind the logo: the logo's own color, sampled from the logo image itself.
- Bottom section: whatever color the owner picks. Nothing derived, nothing auto-shifted.

## Changes

1. New dedicated field `logo_bg_color` on hub profiles, so the band never inherits a stale value from the old `header_color`. Stop using `header_color` for the logo band.
2. Picking **Logo**, or tapping **Match to logo**, samples the logo image and writes only `logo_bg_color`. The page background color is left exactly as the owner set it.
3. Remove the companion/derived background shift entirely — the bottom color is only ever what the owner chose in the color picker.
4. If `logo_bg_color` is empty, the band simply uses the page background (one clean tone), never a legacy color.
5. Design tab shows two clear controls for Logo style: "Logo background" (with Match to logo / White / Black chips) and "Page background", each with its own swatch. Both keep auto-saving.
6. Save contact / Share chips pick their contrast from the band color; the blocks below keep picking theirs from the page color.
7. Curved seam, like Reborn Wraps: the content section below the logo band gets rounded top corners and overlaps the band slightly, so the two colors meet on a soft curve instead of a hard straight edge.
8. One-time cleanup for Mariscos Las Nuevas Islas: set its `logo_bg_color` to the logo's own white so it reads as one clean top band instead of the navy slab.

## Technical notes

- Migration: `alter table public.personal_profiles add column logo_bg_color text;` (nullable, no backfill of other rows). Existing GRANTs/RLS on the table already cover it.
- `src/components/personal/DashboardDesignTab.tsx`: drop `deriveCompanionColor` usage; `applySampledLogoColors` becomes `applyLogoBandColor` writing only `logo_bg_color`; add the second swatch row; keep the existing debounced auto-save.
- `src/lib/logoHeader.ts`: remove `deriveCompanionColor`.
- `src/pages/personal/PersonalProfilePage.tsx`: band style reads `profile.logo_bg_color ?? page background`; `bandContrast` derives from that; page background logic untouched.
- `src/components/personal/ProfilePreviewRenderer.tsx` and `src/components/rep/LivePhonePreview.tsx`: mirror the same band color.
- Non-logo hubs (banner, photo, solid) are untouched; `header_color` keeps its current meaning everywhere else.

## Verification

- Mariscos: white logo band flowing into the white page, no navy slab, Save contact / Share readable.
- Change the page color to a dark tone: the band stays the logo's white, only the bottom section changes.
- Reborn Wraps (banner) renders unchanged.
