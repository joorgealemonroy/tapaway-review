

# Fix Touch Drag to Support Both Horizontal and Vertical Movement

## Problem
The current `handleTouchMove` in `DashboardUnifiedContent.tsx` only tracks Y-axis (vertical) movement and uses a fixed `itemHeight = 64` to calculate which item to swap with. This means:

- **Grid items** (2-column layout with square tiles) can't be dragged left/right because horizontal movement is ignored
- The fixed 64px height assumption is wrong for grid tiles (which are `aspect-square` and much taller)
- On iPhone, dragging feels broken because moving your finger sideways does nothing

## Solution
Replace the Y-only math-based approach with `document.elementFromPoint()` hit-testing. Instead of calculating index from vertical offset, we find the actual DOM element under the user's finger and determine which item it belongs to. This naturally supports any layout -- vertical lists, horizontal grids, or mixed.

## Changes (1 file)

### `src/components/personal/DashboardUnifiedContent.tsx`

**1. Add `data-drag-index` attribute to all draggable items**
Each draggable `div` (grid links, regular links, blocks) gets a `data-drag-index={index}` attribute so we can identify which item is under the touch point.

**2. Replace `handleTouchMove` logic**
Instead of:
```
const diff = currentY - touchStartY;
const indexDiff = Math.round(diff / itemHeight);
const newIndex = touchCurrentIndex + indexDiff;
```

Use:
```
// Temporarily hide dragged element so elementFromPoint sees what's underneath
const draggedEl = e.currentTarget;
draggedEl.style.pointerEvents = 'none';
const target = document.elementFromPoint(touchX, touchY);
draggedEl.style.pointerEvents = '';

// Walk up DOM to find [data-drag-index]
const dropTarget = target?.closest('[data-drag-index]');
const newIndex = Number(dropTarget?.getAttribute('data-drag-index'));
```

**3. Also track X-axis in scroll detection**
Update the scroll-vs-drag detection to check both X and Y movement (if the user moves more than 10px in any direction before the hold timer fires, cancel it).

**4. Remove unused `touchStartY` and `touchCurrentIndex` state**
These are no longer needed since we use hit-testing instead of offset math.

## Technical details

- `document.elementFromPoint(x, y)` returns the topmost element at a given coordinate
- `.closest('[data-drag-index]')` walks up the DOM tree to find the draggable parent
- We temporarily set `pointer-events: none` on the dragged element so `elementFromPoint` sees the element underneath it, not the dragged element itself
- This approach works for any layout (list, grid, mixed) without needing to know item dimensions

