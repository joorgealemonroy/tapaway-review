## Goal

Only fix the corner rounding of the TapAway card so it looks clean on dark backgrounds. Do not change the card art, colors, or layout.

## Problem

On dark backgrounds, faint white pixels/seams show at the card corners. The SVG has its own baked-in rounded corners, but the wrapper also clips with `border-radius: 1.5rem`. Because the two radii don't match exactly, the SVG's white corner background peeks out — invisible on light bg, obvious on dark bg.

## Fix

In `src/components/TapAwayCard3D.tsx` (and mirror the same in `src/components/PersonalCard3D.tsx` if it uses the same pattern):

- Match the wrapper's `border-radius` to the SVG's actual corner radius so the clip and the art align pixel-perfectly.
- Add `overflow: hidden` on the front/back face wrappers (already present) and ensure the `<img>` inherits the same radius.
- Nudge the SVGs' outer `<rect>` to be fully opaque card-colored to the very edge (no anti-aliased white halo). If needed, add a 1px inset so the wrapper's radius fully covers the SVG edge.

No changes to card art, copy, logo overlay, business-name text, animation, or the light-mode look.

## Files touched

- `src/components/TapAwayCard3D.tsx` — corner radius alignment only
- `src/components/PersonalCard3D.tsx` — same, if it shares the pattern
- `public/tapaway-card-front.svg` / `public/tapaway-card-back.svg` — only if a tiny edge tweak is required to remove the halo

## Validation

- On a light page: card looks identical to today.
- On a dark page (rep portal / admin cockpit): no visible white pixels at any corner; rounding reads clean.
