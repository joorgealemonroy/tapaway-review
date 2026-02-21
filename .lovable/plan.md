
# Fix iOS Drag Selection in DashboardUnifiedContent

## Root Cause
The file `src/components/personal/DashboardUnifiedContent.tsx` implements its own touch drag handlers (lines 356-437) independently from the shared `useTouchHoldDrag` hook. These inline handlers are missing the two iOS fixes that were added to the hook:

1. `e.preventDefault()` in `handleTouchStart` to block iOS long-press callout
2. Adding/removing the `dragging-active` CSS class on `document.documentElement` during active drags

This is why blocks with images still turn blue on iPhone -- they use the unfixed handlers.

## Fix (1 file)

### `src/components/personal/DashboardUnifiedContent.tsx`

**Change 1 -- `handleTouchStart` (line 356):** Add `e.preventDefault()` at the start of the function to block iOS native long-press behavior.

**Change 2 -- Inside the setTimeout callback (line 362):** Add `document.documentElement.classList.add("dragging-active")` when drag mode activates.

**Change 3 -- `handleTouchEnd` (line 425):** Add `document.documentElement.classList.remove("dragging-active")` to clean up.

These are the exact same three changes that were previously applied to the `useTouchHoldDrag` hook, now applied to the duplicate inline implementation.
