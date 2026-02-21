

# Fix iOS Text Selection During Touch Drag-and-Drop

## Problem
On iPhone (iOS Safari), long-pressing to initiate a drag triggers the native text selection/copy callout instead of (or in addition to) the drag behavior. This is because iOS uses `-webkit-touch-callout` for its long-press menu, which is not disabled by Tailwind's `select-none` or `touch-none` classes.

## Root Cause
Three things combine to cause this:
1. Tailwind's `select-none` adds `user-select: none` but does NOT add `-webkit-touch-callout: none` (the iOS-specific property that controls the copy/paste callout on long-press)
2. The `handleTouchStart` handler does not call `e.preventDefault()`, so iOS default long-press behavior fires
3. During the 200ms hold delay, iOS's own long-press detection kicks in and shows the text selection UI

## Fix (2 files)

### 1. `src/hooks/useTouchHoldDrag.ts`
- In `handleTouchStart`, call `e.preventDefault()` to block iOS default long-press behavior immediately
- When drag is enabled (after hold timer fires), add a class to `document.documentElement` that disables text selection globally during the drag
- In `handleTouchEnd`, remove that global class

### 2. `src/index.css`
- Add a global CSS rule: when a `dragging-active` class is on `<html>`, apply `-webkit-touch-callout: none` and `-webkit-user-select: none` to everything
- Add `-webkit-touch-callout: none` to all elements with Tailwind's `touch-none` class (the draggable rows) so that even without active dragging, the iOS callout is suppressed on those elements

### Changes Detail

**`src/hooks/useTouchHoldDrag.ts`:**
```typescript
// In handleTouchStart - add preventDefault to block iOS callout
const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
  e.preventDefault(); // Block iOS long-press text selection
  initialTouchYRef.current = e.touches[0].clientY;
  // ... rest unchanged

// When drag enabled (in setTimeout), add global class:
  document.documentElement.classList.add("dragging-active");

// In handleTouchEnd, remove it:
  document.documentElement.classList.remove("dragging-active");
```

**`src/index.css`:**
```css
/* Prevent iOS copy/paste callout on draggable items */
.touch-none {
  -webkit-touch-callout: none;
}

/* During active drag, suppress all text selection globally */
.dragging-active,
.dragging-active * {
  -webkit-touch-callout: none !important;
  -webkit-user-select: none !important;
  user-select: none !important;
}
```

This is a minimal, targeted fix that solves the iOS-specific issue without affecting desktop behavior or normal scrolling.
