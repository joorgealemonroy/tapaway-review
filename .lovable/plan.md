

# Remove Pushy Elements and Fix Timing Copy

## What Changes

### 1. Remove the sticky bottom CTA bar
The user already has a physical card -- they're not a cold lead. The sticky bar feels like a hard sell to someone who's already committed. Remove the entire `AnimatePresence` sticky bar block and the `IntersectionObserver` logic that powers it (`showSticky` state, `heroCTARef`, `useEffect`).

### 2. Update timing claims
Replace all "30 seconds" references with "3 minutes" to be honest about the actual setup time. Specifically:
- Hero subtitle: "Takes 30 seconds. Free. No app needed." becomes "Takes about 3 minutes. Free. No app needed."

### 3. Keep the rest as-is
The funnel order (Hero, Real Hubs, Steps, Mid-CTA, Templates, Info, Bottom CTA) stays the same -- only the aggressive conversion elements are removed.

## Technical Details

### File: `src/components/card/CardOnboarding.tsx`

**Remove:**
- `useState` for `showSticky`
- `useRef` for `heroCTARef`
- `useEffect` with `IntersectionObserver`
- The `ref={heroCTARef}` prop from the hero button
- The entire `AnimatePresence` sticky bar block at the bottom
- `AnimatePresence` import (if no longer used elsewhere in the file)

**Update:**
- Hero subtitle text from "30 seconds" to "about 3 minutes"

