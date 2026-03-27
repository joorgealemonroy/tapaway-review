

# Update 3D Card with New SVG Assets

## Summary
Replace the current card front image with `1.svg` from the uploaded zip, and add `2.svg` to the back of the card (alongside the existing rotating client logos, or as a static element).

## Steps

### 1. Extract and copy SVGs from zip
- Extract `1.svg` and `2.svg` from the uploaded zip
- Copy `1.svg` to `public/tapaway-card-front.svg` (new front design)
- Copy `2.svg` to `public/tapaway-card-back.svg` (new back design)

### 2. Update `src/components/TapAwayCard3D.tsx`
- **Front face**: Change the `img src` from `/tapaway-card-front.png` to `/tapaway-card-front.svg`
- **Back face**: Replace the rotating client logos with `2.svg` as the card back image — a single full-bleed image covering the back face

### Technical detail
- SVGs will render crisply at any size, improving the 3D card visual quality
- The back will show the new design (`2.svg`) instead of cycling through restaurant logos

