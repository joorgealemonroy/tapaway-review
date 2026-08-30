# Replace the TapAway card artwork

Swap the current card graphics for the two newly uploaded designs everywhere a TapAway card is shown, keeping the dynamic business logo overlay.

## Artwork mapping

- Front = `1-2.svg` (yellow 5-star row, centered logo circle, NFC tap + QR icons, tapaway.co footer)
- Back = `2.svg` (large logo circle with "YOUR OUR LOGO HERE" placeholder, tapaway.co footer)

Both are 153 x 248 vector files, roughly the same 1:1.586 card ratio already used in the app, so they drop into existing card frames without layout changes.

## Where it changes

1. **Onboarding card customizer** (`src/components/onboarding/CardCustomizer.tsx`) — replace the hand-built HTML `CardFront` / `CardBack` markup with the new artwork as the card face. Headline and sub-headline inputs stay and continue to render over the artwork; the uploaded logo still fills the circle.
2. **Marketing 3D card** (`src/components/TapAwayCard3D.tsx`) — point the front/back `<img>` at the new artwork, keeping the existing logo overlay positioning (re-tuned to the new circle position).
3. **Personal flip card** (`src/components/PersonalCard3D.tsx`) — front uses the new front artwork; the QR back panel stays as-is since it renders a live QR code.

## Dynamic logo

The artwork ships with a grey placeholder circle. The card components keep overlaying the business logo, absolutely positioned and clipped to a circle that matches the artwork's circle (centered, ~66% width on the front, ~88% on the back). With no logo, the artwork's own "YOUR LOGO HERE" placeholder shows through.

## Technical notes

- Upload both SVGs through the Lovable asset CLI and reference them via `.asset.json` pointers in `src/assets/`, instead of committing new binaries to `public/`.
- Leave the old `/tapaway-card-front.svg`, `/tapaway-card-back.svg`, and `/tapaway-personal-front.png` files in place for now so nothing else that may reference them breaks.
- Verify all three surfaces (onboarding preview, landing card, personal flip card) in the preview at mobile and desktop widths after the swap.
