# Homepage Showcase Visual Correction

## Goal
Match the approved showcase reference without changing the homepage copy, card artwork, physical card geometry, business synchronization, or admin workflow.

## Changes
- Build one reusable 1:2 phone frame whose height always derives from its width: 168 × 336 at 360px, 180 × 360 at 390px, and 250 × 500 on desktop, scaling proportionally between those sizes.
- Scale the card from its exact 53.98 × 85.60 mm face ratio to approximately 148 × 235, 158 × 251, and 220 × 349, with 12px, 14px, and 20px gaps respectively.
- Bottom-align the visible card and phone. Adjust the Three.js camera and canvas framing so the rendered card, not empty canvas space, fills the intended footprint without stretching.
- Replace the stored screenshot inside the homepage phone with a dedicated, passive hub preview populated from each selected hub’s existing public data.
- Show a warm-white mobile layout with the real logo, name, short description, and up to four enabled actions using their real labels and destinations, plus a small TapAway footer.
- Restyle the phone with a thin metallic rim, scaled black bezel, integrated camera notch, rounded screen, restrained highlight, and soft device shadow.
- Tune the existing card materials, neutral lighting, reflections, and shared grounding shadows while preserving the current renderer, textures, drag, rotation, and timing.
- Keep the business label, live-hub link, previous/next controls, pause/play, preloading, safe synchronized switch, fallbacks, reduced-motion behavior, and admin management unchanged.

## Technical Details
- Add a focused homepage hub-preview data hook that reads existing public personal or restaurant hub data and normalizes logo, description, and enabled action links.
- Add reusable phone and hub-preview components under the existing card showcase feature.
- Keep the phone and card in one responsive pair governed by shared CSS sizing variables and exact aspect ratios.
- Remove the stored hub screenshot from homepage rendering and preloading only. Keep screenshot upload and stored paths available in admin management.
- Preserve semantic design tokens for the surrounding interface. Use the hub preview’s controlled presentation palette only inside the simulated phone screen.

## Verification and Evidence
- Capture matching before and after screenshots at desktop, 390px, and 360px.
- Measure the phone’s rendered 1:2 ratio, card face footprint during the front hold, bottom alignment, object gap, and page overflow.
- Exercise several automatic rotations, manual previous/next selection, pause/play, card drag, reduced motion, loading/error fallback, hub links, and synchronized business pairing.
- Record a working rotation and matched card/hub transition.
- Report any remaining visual differences from the approved reference.
