

# Fix: Touchpad Scrolling Not Working Across All Pages

## Root Cause

The global CSS in `src/index.css` applies `overscroll-behavior-y: none` and `overflow-x: hidden` to both `html` **and** `body`. When both elements have overflow constraints, some browsers (especially on macOS with trackpad gestures) create conflicting scroll containers, causing touchpad two-finger scroll to stop working while keyboard arrows and scrollbar dragging still function.

## Fix

Make two targeted changes in `src/index.css`:

1. **Move `overscroll-behavior-y: none` to `body` only** -- having it on `html` can interfere with the browser's native scroll chain for touchpad events.

2. **Move `overflow-x: hidden` to `body` only** -- when both `html` and `body` have overflow restrictions, browsers can get confused about which element is the scroll container, breaking touchpad scroll input.

The `html` element should remain as minimal as possible so the browser treats `body` as the primary scrollable container.

## Technical Details

**File**: `src/index.css` (lines 177-189)

Current:
```css
html, body {
  @apply min-h-screen;
  background: var(--app-bg, hsl(var(--background)));
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  overscroll-behavior-y: none;
  overflow-x: hidden;
  overflow-y: auto;
  max-width: 100vw;
}
```

Updated -- split into separate `html` and `body` selectors:
```css
html {
  @apply min-h-screen;
  background: var(--app-bg, hsl(var(--background)));
}

body {
  @apply min-h-screen;
  background: var(--app-bg, hsl(var(--background)));
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  overscroll-behavior-y: none;
  overflow-x: hidden;
  overflow-y: auto;
  max-width: 100vw;
}
```

This ensures the browser recognizes `body` as the single scroll container, restoring native touchpad scrolling while keeping all existing mobile safe-area and anti-horizontal-scroll protections intact.

