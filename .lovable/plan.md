

# Mobile-First Carousel Polish

## Changes — `src/pages/personal/VibeSelection.tsx`

### 1. Embla Config — Heavier snap physics
Add `dragFree: false` (already default) and `duration: 30` for a slower, premium settle animation.

### 2. Transform logic — 3D perspective with rotateY
Update `updateStyles` to compute `rotateY` based on signed diff (positive = left side = `20deg`, negative = right side = `-20deg`). New values:
- **Active**: `scale(1.0)`, `opacity(1)`, `rotateY(0)`, `blur(0)`
- **Sides**: `scale(0.75)`, `opacity(0.4)`, `rotateY(±20deg)`, `blur(2px)`

Add `perspective(1200px)` on the carousel container to enable 3D depth.

### 3. Slide sizing — Mobile-optimized
Change slide basis from `flex-[0_0_70%]` to `flex-[0_0_75vw]` on mobile, keeping `sm:flex-[0_0_45%] md:flex-[0_0_33%]` for larger screens. This gives a clear "peek" of adjacent vibes.

### 4. Visual polish
- **Radial glow**: Shrink from `50% 40%` to `40% 30%` and move to `50% 60%` (below header text) so it doesn't bleed into the title.
- **Box shadow glow**: Reduce spread slightly for a softer effect.
- **Notification bubble**: Already positioned at `top-7 right-3` with `text-[8px]` — will scale down to `text-[7px]` and add `max-w-[90px]` to prevent notch overlap.
- **Bezel**: No changes needed — the bezel is a fixed `p-3` padding that won't distort with the outer scale transform.

### Files
- **Edit**: `src/pages/personal/VibeSelection.tsx` (transform logic, Embla config, slide sizing, glow position)
- **Edit**: `src/components/personal/PhoneMockup.tsx` (notification bubble sizing)

