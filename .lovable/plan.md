

# Zoom Out the Phone Frame Iframes

## Problem
The phone frames are too narrow (280–300px wide, 520px tall), making the embedded pages look cramped/compacted.

## Solution
Increase the phone frame dimensions and use CSS `transform: scale()` on the iframe to render the page at a larger internal resolution, then scale it down to fit the frame — giving a "zoomed out" effect that shows more content.

## Technical details

**`src/pages/Examples.tsx`** — Update the `LivePhoneFrame` component:

1. **Widen the phone frame**: Change from `w-[280px] sm:w-[300px]` to `w-[320px] sm:w-[340px]`
2. **Increase frame height**: Change from `height: 520` to `height: 600`
3. **Scale the iframe down**: Render the iframe at a larger internal size (e.g. 430px wide × 860px tall) and apply `transform: scale(0.78)` with `transform-origin: top left` so the content appears zoomed out but fits within the frame
4. **Update fallback height** to match the new frame height

This approach makes the embedded pages render as if on a wider screen, then scales the result down to fit the phone bezel — showing more content without scrolling.

