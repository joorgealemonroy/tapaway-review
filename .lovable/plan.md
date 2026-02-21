

# Add Sticky "Save Changes" Button to Design Tab

## Problem
Currently, every color/setting change in the Design tab saves immediately to the database. Users don't realize changes are saving, and if they navigate away accidentally, there's no clear save flow. The user wants a visible sticky "Save Changes" button that appears when changes are made, and changes should only persist when explicitly saved.

## Approach
Refactor `DashboardDesignTab` to buffer changes locally and only write to the database when the user clicks "Save Changes". A sticky floating bar (reusing the existing `UnsavedChangesBar` component) will appear at the top of the viewport when unsaved changes exist.

## Changes

**File:** `src/components/personal/DashboardDesignTab.tsx`

1. **Buffer changes locally instead of saving immediately**
   - Add local state for pending changes: `pendingHeaderColor`, `pendingHeaderType`, `pendingBgColor`
   - Replace all direct DB writes (`handleColorChange`, `handleBgColorChange`, `handleTypeChange`) with local state setters that only update the UI preview
   - Track whether any changes differ from the original props using `useMemo`

2. **Add a save function**
   - A single `handleSave` function that writes all pending changes to the database at once
   - A `handleDiscard` function that resets local state back to prop values

3. **Render the `UnsavedChangesBar`**
   - Import and render the existing `UnsavedChangesBar` component (already built and styled with sticky positioning)
   - It appears when `hasChanges` is true and disappears after save/discard

4. **Keep image uploads as immediate** -- image uploads already involve a multi-step flow (crop, upload to storage) so those will continue saving immediately. Only color/type selections get the deferred save.

## Result
- User picks colors/fades freely -- preview updates instantly, no DB writes
- A sticky "Save Changes" bar slides in from the bottom
- Clicking Save writes all changes at once
- Navigating away without saving discards changes automatically
