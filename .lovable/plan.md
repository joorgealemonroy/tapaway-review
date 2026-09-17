# Real NFC Card Showcase

## Goal
Replace the placeholder rotating card in the homepage hero with a realistic, reusable 3D showcase of actual printed TapAway cards, plus a secure admin page for managing showcase designs. Keep the rest of the homepage unchanged.

## Public showcase
- Extract the two Sugar Bloom PDF pages into high-resolution PNG textures. Preserve page 1 exactly and rotate page 2 exactly once for the website-facing back orientation specified in the brief.
- Show the Sugar Bloom front immediately as a reserved static fallback while the 3D viewer loads.
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
- Keep the first static card visible until WebGL is ready; retain it permanently for reduced-motion, WebGL failure, and viewer errors.
- Cap pixel density on mobile, preload only the current and next design pair, stop rendering while off-screen or while the tab is hidden, and reserve stable layout space at all viewport sizes.
- Respect `prefers-reduced-motion`: no automatic rotation, but manual design selection remains available.
- Keep “Send Me My Cards” usable throughout loading or failure.

## Admin management
- Add a guarded “Card Showcase” page inside the existing admin area.
- Each entry includes business name, front image, optional back image, enabled state, and sort order.
- Support adding, previewing fit, replacing either face, moving entries up/down, disabling, and removing entries.
- Validate PNG/JPEG/WebP type, file size, minimum dimensions, and portrait aspect ratio before upload. Show the fitted front/back preview before saving.
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
- Verify missing-back, one-design, and zero-design states plus reduced motion and forced WebGL failure.
- Verify admin add, replace, reorder, disable, and remove behavior; confirm anonymous users can read only enabled entries and cannot mutate records or files.
- Check browser console, network failures, TypeScript, lint, and backend security warnings with zero new errors.

## Reference note
The attached `image-247.png` and `image-248.png` are visual references only and will not be embedded as card artwork. Final PVC finish comparison will use the pending physical Muchas Gracias card photograph if it is uploaded before the visual-tuning pass; otherwise the written material specifications remain the baseline.
