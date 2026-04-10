

# Fix: Lightbox Escapes Stacking Context via Portal

## Problem
The `ImageLightbox` renders inside `CollageWithLightbox`, which lives inside a container with `willChange: 'transform'`. This creates a new stacking context that traps the `fixed` positioned lightbox, causing the share buttons to overlap the lightbox close button.

## Solution — React Portal (zero re-renders, zero state lifting)
Wrap the lightbox overlay in `createPortal(…, document.body)` so it renders outside the stacking context entirely. No changes to `PersonalProfilePage` or any parent component needed.

## Changes

### `src/components/personal/ImageLightbox.tsx`
- Import `createPortal` from `react-dom`
- Wrap the entire `AnimatePresence` return in `createPortal(..., document.body)`
- Everything else stays identical — same z-index, same classes, same behavior

**Before:**
```tsx
return (
  <AnimatePresence>
    {isOpen && (<motion.div className="fixed inset-0 z-50 ...">...
```

**After:**
```tsx
import { createPortal } from "react-dom";
// ...
return createPortal(
  <AnimatePresence>
    {isOpen && (<motion.div className="fixed inset-0 z-50 ...">...
  </AnimatePresence>,
  document.body
);
```

## Files Modified

| File | Change |
|------|--------|
| `src/components/personal/ImageLightbox.tsx` | Wrap return in `createPortal` — 3 lines changed |

No other files touched. No state lifting. No re-renders. No CSS hacks.

