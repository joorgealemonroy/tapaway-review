

# Fix 3D Card Corners + Update Back Face Logos

## Changes to `src/components/TapAwayCard3D.tsx`

### 1. Fix clipped corners
The SVG image is cutting off the rounded corners. Add `border-radius: 1rem` directly on the card container div (not just `overflow-hidden` on children), and ensure the front/back face images respect the rounding by adding `rounded-2xl` to the `<img>` tags themselves.

### 2. Update restaurant names to real clients
Replace the generic names with actual client names:
- "Las Islas Marias", "Las Nuevas Islas", "Sakura Sushi", "The Golden Fork", "Bella Italia", "Blue Lagoon Café", "Smoky BBQ", "Fresh Greens"

### 3. Update tagline
Change "Trusted by 500+ businesses" → "Trusted by local restaurants"

