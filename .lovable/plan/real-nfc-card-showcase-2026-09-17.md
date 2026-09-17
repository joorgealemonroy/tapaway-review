# Real NFC Card Showcase

## Goal
Replace the placeholder rotating card in the homepage hero with a realistic, reusable 3D showcase of actual printed TapAway cards, plus a secure admin page for managing showcase designs. Keep the rest of the homepage unchanged.

## Public showcase
- Extract the two Sugar Bloom PDF pages into high-resolution PNG textures. Preserve page 1 exactly and rotate page 2 exactly once for the website-facing back orientation specified in the brief.
- Seed Sugar Bloom as the initial design, then derive the static fallback from the first enabled admin-managed design so later ordering, replacement, and disabling changes are reflected automatically.
- Show the first enabled design’s front immediately while the 3D viewer loads. If no designs are enabled, render the intentional empty showcase state rather than Sugar Bloom or another stale fallback.
- Build one reusable portrait CR80 card model using the specified 53.98 × 85.60 × 0.76 proportions, 3.18 mm corner radius, tiny separate edge bevel, white edge material, and no artwork wrapping.
- Fit each supplied texture without cropping or stretching. Center the slightly wider artwork on the white face with only the required top/bottom padding.
- Use restrained perspective, a subtle fixed tilt, neutral soft lighting, satin white PVC material, modest clearcoat, and a soft shadow. Keep framing, scale, lighting, and camera unchanged between designs.
- Use distinct front, back, and edge surfaces so text remains upright and unmirrored with no overlap flicker.

## Rotation and controls
- Begin on a readable front view, hold for about three seconds, then complete a smooth vertical-axis rotation over about five seconds.
- Show each matching back, then atomically switch to the next fully decoded pair near the 270° edge-on position. If the next pair is not ready, continue the current design until a later safe transition.
- Add the business name plus compact previous, next, and pause/play controls outside the canvas. Support keyboard use and manual selection without blank frames or scene restarts.
- Treat a missing back as a clearly labeled blank white back rather than copying or inventing artwork.
- Handle one enabled design and zero enabled designs without broken layout.

## Performance and accessibility
- Load React Three Fiber separately from critical homepage code, pinned to React 18-compatible versions.
- Keep the static card visible until the current front/back textures have loaded and decoded and the 3D viewer has rendered its first complete frame with the textured card. Canvas creation alone does not mark the viewer ready.
- Retain the static fallback permanently for reduced-motion, WebGL failure, and viewer errors, always using the first enabled design from admin data and respecting the empty state.
- Cap pixel density on mobile, preload only the current and next design pair, stop rendering while off-screen or while the tab is hidden, and reserve stable layout space at all viewport sizes.
- Respect `prefers-reduced-motion`: no automatic rotation, but manual design selection remains available.
- Keep “Send Me My Cards” usable throughout loading or failure.

## Admin management
- Add a guarded “Card Showcase” page inside the existing admin area.
- Each entry includes business name, front image, optional back image, enabled state, and sort order.
- Support adding, previewing fit, replacing either face, moving entries up/down, disabling, and removing entries.
- Validate PNG/JPEG/WebP type, file size, minimum dimensions, and portrait aspect ratio before upload. Show the fitted front/back preview before saving.
- Replace images transactionally: upload each replacement under a new unique filename, update the showcase record only after the upload succeeds, and delete the now-unused old file only after the database update succeeds. Failed uploads or updates leave the currently published image intact.
- Store these entries independently from customer hubs, cards, billing, and subscriptions.

## Backend and permissions
- Add a dedicated showcase table with explicit grants, row-level security, timestamps, enabled state, and sort order.
- Public visitors may read enabled entries only. Authenticated administrators may read and manage every entry through the existing server-verified admin role check.
- Add a dedicated public image bucket with public reads and administrator-only upload, replace, and delete policies.
- Seed Sugar Bloom as the first enabled design after its extracted textures are uploaded.
- Keep the renderer’s `CardDesign` data shape independent of the storage source so the animation does not need to change later.

## Homepage integration
- Replace only the current hero card visual on mobile and desktop; remove the redundant outer desktop tilt.
- Preserve the existing hero copy, CTA, city label, testimonial section, spacing intent, and all unrelated card-preview/export tools.
- Do not reuse the advertisement or physical reference photos as textures.

## Validation
- Verify desktop, standard mobile, and 360 px layouts with no clipping or page overflow.
- Visually verify front/back orientation, readable text, full artwork fit, thin edge, corner silhouette, satin finish, restrained glare, soft shadow, and constant scale.
- Observe several complete automatic transitions and manual previous/next/pause transitions, including simulated delayed image loading.
- Verify missing-back, one-design, and zero-design states plus reduced motion and forced WebGL failure. Confirm fallback changes follow admin ordering/replacement changes and all-disabled remains empty.
- Verify readiness does not switch from the static fallback when only the canvas exists; it switches only after decoded textures appear in a completed rendered frame.
- Verify admin add, replace, reorder, disable, and remove behavior, including failed-upload and failed-record-update replacement paths with no broken or stale card.
- Confirm anonymous visitors can read enabled entries but cannot mutate records or files. Confirm an ordinary signed-in customer also cannot open the admin page, query disabled records, mutate showcase records, or upload/replace/delete showcase files.
- Confirm disabled records are omitted from the showcase while their already-known public image URLs remain reachable, as expected for public marketing artwork.
- Check browser console, network failures, TypeScript, lint, and backend security warnings with zero new errors.

## Reference note
The attached `image-247.png` is the current placeholder-card reference and `image-248.png` is the generated Sugar Bloom image that defines the desired visual direction; neither will be embedded as card artwork. The pending physical Muchas Gracias card photograph will be identified and used specifically as the white PVC material, thin-edge, rounded-corner, and finish reference once attached. If it is unavailable during tuning, the written material specifications remain the baseline.

## Build order
1. Extract the Sugar Bloom artwork, build the shared card geometry, and visually tune its orientation, fit, proportions, material, lighting, framing, and motion across desktop and mobile.
2. Add the public data source, dynamic first-enabled fallback, explicit readiness handoff, empty state, and multi-design transitions without changing the tuned card model.
3. Finish the admin management page, reliable replacement lifecycle, ordering/enabled controls, and full administrator/customer/anonymous permission validation.
