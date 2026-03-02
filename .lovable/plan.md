

# Fix: Touch Drag Reordering Not Working Properly

## Root Cause

The touch drag handler (`onTouchMove`) is attached to each individual item `<div>`. Once the user's finger moves beyond that element's bounds, touch events stop firing reliably on it. The `elementFromPoint` lookup then either fails to find the right target or returns stale results, causing items to snap to the bottom instead of the intended position.

## Fix

Move the touch move and touch end handlers from individual items to the **parent container** `<div className="space-y-2">` that wraps all items. This ensures touch events continue to fire as the finger moves across different items.

### Changes in `src/components/personal/DashboardUnifiedContent.tsx`:

1. **Attach `onTouchMove` and `onTouchEnd` to the parent container** (the `<div className="space-y-2">` at line 714) instead of on each individual item.

2. **Keep `onTouchStart` on each item** so we know which item index started the drag.

3. **Remove `onTouchMove` and `onTouchEnd`** from every individual item div (grid links at ~738-739, regular links at ~839-840, blocks at ~910-911).

4. **Fix `elementFromPoint` logic** — instead of toggling `e.currentTarget.style.pointerEvents`, track the dragged element via a ref and toggle its pointer events. This ensures the correct element is hidden during hit-testing.

### Files to modify (1):
- `src/components/personal/DashboardUnifiedContent.tsx`

