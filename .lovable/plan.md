

# Move "Changes saved!" Toast to Top

## Problem
The Sonner toast defaults to `bottom-right`, which on mobile overlaps the bottom navigation bar and the unsaved changes bar, hiding important UI elements.

## Fix

**File:** `src/components/ui/sonner.tsx`

Add `position="top-center"` to the Sonner `Toaster` component. This moves all toasts (including "Changes saved!") to the top of the screen, clearing the bottom bar on mobile.

```tsx
<Sonner
  theme={theme as ToasterProps["theme"]}
  className="toaster group"
  position="top-center"
  // ... rest stays the same
/>
```

This is a one-line change that affects the global toast position. All toasts in the app will appear at the top instead of the bottom.
