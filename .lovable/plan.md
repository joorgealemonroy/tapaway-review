

# Replace Hero Phone with Rotating 3D Card

## Changes

### `src/components/landing/HeroSection.tsx`
1. Remove `heroPhone` and `heroCard` image imports
2. Import `TapAwayCard3D` from `@/components/TapAwayCard3D`
3. Replace the entire right-side visual (phone mockup + NFC card images) with `<TapAwayCard3D />`
4. Keep the rotating city social proof below it

