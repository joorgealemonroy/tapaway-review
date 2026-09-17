# Paired Card and Live Hub Homepage Showcase

## Goal
Update the existing homepage hero to pair the real rotating NFC card with a stationary phone showing the same business’s authentic mobile hub, while preserving the current navigation, copy, CTA, card geometry, artwork, admin security, and the rest of the homepage.

## Homepage composition
- Keep the existing headline, supporting copy, CTA, and reassurance text.
- Recompose the first screen on the existing navy/cyan visual system: copy on the left and an unframed card-plus-phone presentation on the right at desktop widths.
- Build one slim reusable phone frame containing a sharp, first-viewport mobile capture of the active business’s real public hub.
- Make the phone preview and a visible “View live hub” link open the same public hub with clear accessible labels.
- On mobile, order the content as headline, supporting copy, paired showcase, business/navigation controls, full-width CTA, and reassurance.
- At 360px, target a 172px phone, 124px card, and 12px gap, with the card appearing about 55–60% of the phone height and enough room for rotation and shadows.

## Matched showcase behavior
- Extend each showcase entry with an optional selected hub, resolved public URL, and independently replaceable hub-preview image.
- Initially pair Las Islas Portland with `/lasislasportland`, Space Studios with `/spacestudios`, and Las Islas Marias with `/lasislasmarias`.
- Leave Sugar Bloom card-only because no matching live hub currently exists; card-only entries remain valid until a preview is supplied.
- Keep one active entry as the source of the card, phone screenshot, business label, and link.
- Restore compact previous, next, and pause/play controls outside the canvas with 44px touch targets.
- Change both card and phone atomically only after the next front, optional back, and hub preview are decoded. Keep the current pair visible on delays or failures.
- Retain the safe edge-on automatic transition, manual mouse/touch card rotation, normal vertical mobile scrolling, reduced-motion behavior, and card-only fallback.

## Faster high-quality card loading and motion
- Keep the exact 53.98 × 85.60 × 0.76 mm geometry, 3.18 mm corners, white edge, satin material, lighting, complete artwork fit, and identical per-design scale.
- Preserve high-DPI rendering while reducing startup work: preload the first pair immediately, preload the 3D module and next complete entry early, cache decoded images/processed textures, avoid remounting the scene between businesses, and remove unnecessary readback work from the public viewer.
- Replace the current 16-second continuous cycle with a modestly faster cycle that still opens on a readable front hold and shows the matching back before switching.
- Keep a stable reserved layout and the CTA usable while the showcase initializes. Never show mismatched businesses or a broken-image flash.

## Admin extension
- Add a hub selector to each existing Card Showcase entry, drawing from existing personal and venue hubs and resolving the canonical public slug.
- Add an optional hub-preview upload with validation, preview, independent replacement, and removal.
- Preserve current front/back uploads, ordering, enabled state, reusable 3D preview, permissions, and transactional replacement sequence: upload a unique file, update the record, then remove only the superseded file.
- Keep ordinary signed-in customers and anonymous visitors unable to read disabled records or perform showcase/storage mutations.

## Technical details
- Add nullable showcase fields for hub kind, hub ID, public slug/URL, and hub-preview storage path through one additive migration with explicit grants and existing RLS protections.
- Extend the shared `CardDesign` mapping so public rendering remains storage-source independent.
- Capture initial hub previews at 390 CSS pixels with 2× device scale, using only the first mobile viewport; upload optimized sharp images through the existing showcase storage flow.
- Keep the public URL derived from the selected hub and preserve legacy hard-burned hub paths.
- Keep one mounted renderer and coordinate its cycle signal with a parent-level staged-entry state so card and phone commit together.

## Verification
- Verify the actual homepage at desktop, 390px, and 360px with no horizontal overflow, clipping, overlap, or layout shift.
- Verify first-load timing, fallback removal, high-DPI artwork quality, readable front hold, faster rotation, matching back, mouse drag, touch drag, and normal vertical scrolling.
- Observe several automatic transitions and test previous, next, pause/play, delayed/failed images, card-only entries, reduced motion, and WebGL failure.
- Confirm every phone image and “View live hub” link opens the correct live hub and no card/hub mismatch appears during transitions.
- Verify admin hub selection and independent screenshot replacement, plus anonymous and ordinary-customer denial for disabled data and all mutations.
- Run project checks and inspect browser console/network output with zero new errors or warnings.
- Provide actual completed desktop and mobile homepage screenshots and report any remaining visual or unverified issues.
