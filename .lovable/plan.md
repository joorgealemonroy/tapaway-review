
# Plan: Fix Desktop Scrolling for Review Hubs

## The Problem

On desktop browsers, pages like `tapaway.co/jor` (ReviewHub) are unscrollable with the mouse wheel. Users can only scroll by dragging the scrollbar, which is inconvenient.

**Root cause**: The global CSS in `index.css` has:
- `overscroll-behavior-y: none` on html/body
- No explicit `overflow-y: auto` set

This combination can interfere with native mouse wheel scrolling on desktop browsers, especially when combined with the `minHeight: 100vh` container in ReviewHub.

---

## The Solution

Add explicit `overflow-y: auto` to the html/body styles in `index.css` to ensure native scrolling works properly with mouse wheel on desktop.

---

## Changes Required

### File: `src/index.css`

**Lines 177-188** - Update the html/body styles:

| Current | Updated |
|---------|---------|
| No explicit `overflow-y` | Add `overflow-y: auto` |

```css
/* Current */
html, body {
  @apply min-h-screen;
  background: var(--app-bg, hsl(var(--background)));
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  overscroll-behavior-y: none;
  overflow-x: hidden;
  max-width: 100vw;
}

/* Updated */
html, body {
  @apply min-h-screen;
  background: var(--app-bg, hsl(var(--background)));
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  overscroll-behavior-y: none;
  overflow-x: hidden;
  overflow-y: auto;  /* Add this - enables native scrolling */
  max-width: 100vw;
}
```

---

## Why This Works

1. **`overflow-y: auto`** explicitly tells the browser to enable vertical scrolling when content overflows
2. This ensures mouse wheel events are properly captured and handled for scrolling
3. The scrollbar will still appear only when needed (auto behavior)
4. Mobile and touch scrolling remain unaffected

---

## Files to Modify

| File | Change |
|------|--------|
| `src/index.css` | Add `overflow-y: auto` to html/body styles (line ~186) |

---

## Impact

- **Desktop**: Mouse wheel scrolling will work on all pages including ReviewHub
- **Mobile**: No change - touch scrolling already works
- **All other pages**: Will benefit from explicit scroll behavior
- **No visual changes**: Pages will look identical, just scroll properly
