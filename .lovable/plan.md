

# Revert 3D Card: Portrait Credit Card + Rotating Restaurant Logos

## Changes

### `src/components/TapAwayCard3D.tsx`

1. **Keep portrait credit card ratio** — aspect ratio `2.125 / 3.375` (standard credit card standing up), width `min(240px, 70vw)`, with rounded corners
2. **Front face** — keep the current `/tapaway-card-front.svg`
3. **Back face** — remove the static SVG back image. Replace with a dark gradient background showing:
   - A grid/marquee of ~8 sample restaurant logos (styled text logos since we don't have actual images): "Joe's Pizza", "Sakura Sushi", "The Golden Fork", "Bella Italia", "Blue Lagoon Café", "Smoky BBQ", "Fresh Greens", "Casa del Sol"
   - Each displayed as a styled text badge in a grid, fading/cycling with a subtle animation
   - Small "Trusted by 500+ businesses" tagline at bottom
4. **Animation** — keep the existing continuous `spin-3d` rotation

