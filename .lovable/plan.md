

# Use Back SVG (2.svg) as Card Back

## Change to `src/components/TapAwayCard3D.tsx`

1. Remove the `restaurants` array, `useState`, `useEffect`, and all cycling logo logic
2. Replace the back face content with a single full-bleed `<img>` using `/tapaway-card-back.svg` (already exists from earlier extraction)
3. Keep the front face, dimensions (`2.125 / 3.375`), rounded corners, and `spin-3d` animation unchanged

