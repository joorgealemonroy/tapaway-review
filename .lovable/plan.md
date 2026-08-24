# Las Islas Marias multi-location hub at /islas

Build a premium "choose your location" master hub at `/islas`, and put all three hubs under one login.

## Ownership consolidation

Today both existing hubs (`/islasmarias`, `/islasmariasog`) belong to the login `oxydgo@gmail.com`. There is no `alexi@tapaway.co` account, but `alexis@tapaway.co` exists.

- Move `/islasmarias` and `/islasmariasog` to `alexis@tapaway.co`.
- Create the new `/islas` hub under the same login.
- All three then appear in one dashboard through the existing multi-profile switcher — no new dashboard work needed.
- Neither existing hub's content, design, slug, or public appearance changes.

## The /islas page

A new hub (same rendering engine as every other TapAway hub, so it stays consistent and fast) with:

- Logo header at the top using the Las Islas Marias logo, on a clean brand band.
- Heading "Las Islas Marias", supporting line "Our Locations", subtitle "Choose a location to view their menu, directions, socials & more."
- A dark premium selector section below holding two large rounded location cards:
  - Las Islas Marias — Los Angeles (6401 San Pedro St) → `/islasmarias`
  - Las Islas Marias — Gardena (444 W Gardena Blvd) → `/islasmariasog`
- Each card: large food/venue image, business name, city line, optional one-line subtitle, and a clear "View Location" call to action. The whole card is tappable.
- No menu, directions, review, or ordering buttons on `/islas` — location choice first, then the existing hub handles everything.
- Mobile-first single column; two columns side-by-side from tablet up. Subtle borders, soft shadows, tap/hover press feedback, generous spacing.

## Reusable Locations feature

Instead of a one-off page, add a new **Locations** block type to the existing block system so any owner can build a location hub:

- New block type `locations` selectable in the dashboard block picker.
- Editor: add/remove/reorder location entries; each has name, city/label, optional subtitle, image upload, and a target hub slug or URL.
- Rendered identically in the dashboard live preview and on the public hub.
- Adding a 3rd, 4th or 5th location later is pure data entry — no redesign.

## Technical notes

- Data move: `UPDATE personal_profiles SET user_id = <alexis uuid>` for the two existing rows; insert a new `personal_profiles` row `username = 'islas'`, `plan_type = 'solo_pro'`, approved and publicly visible, plus one `personal_blocks` row of type `locations` seeded with the two locations.
- New `LocationsBlock` renderer shared by `PersonalProfilePage.tsx` (public) and `ProfilePreviewRenderer.tsx` (dashboard preview), added to both `case` switches.
- New editor branch in `BlockModal.tsx` (`BLOCK_TYPES` entry + content form), reusing the existing image upload/compression path into the `personal-photos` bucket.
- Cards navigate with react-router `Link` to `/:slug` so no full page reload between hubs.
- Styling uses existing semantic tokens and the hub contrast helpers (`src/lib/hubContrast.ts`), so the band/body two-tone treatment matches other hubs.
- Location images: reuse each location's existing hub imagery as the default; you can swap in better food photos from the dashboard afterwards.

## Out of scope

No changes to `/islasmarias` or `/islasmariasog` content, slugs, billing, or approval state.
