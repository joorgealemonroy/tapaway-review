

# Fix: Mobile Block Editing Form Not Rendering

## Problem
The `BlockModal.tsx` component has a critical bug: on mobile, when a block type is selected (either by choosing a new type or editing an existing block), the form fields are **not rendered**. 

The mobile `Drawer` branch (line 541-557) only shows the block type picker when `!selectedType`, and renders `null` otherwise. All the actual form fields (YouTube URL, image upload, text editor, button config, email capture, photo collage) only exist inside the desktop `Dialog` branch.

This is why you see "Edit block" as the title but no form below it.

## Fix

**File:** `src/components/personal/BlockModal.tsx`

Extract the form content (the block type selector + all form fields + save button) into a shared helper function or variable, then render it in both the mobile Drawer and desktop Dialog branches. This eliminates the duplication issue and ensures both paths show identical content.

### Step-by-step:

1. **Extract shared content** (lines ~570-1020): Pull the entire form body (type selector grid, YouTube/Image/Text/Button/EmailCapture/PhotoCollage forms, alignment picker, and Save button) into a local `renderFormContent()` function.

2. **Update the mobile Drawer branch** (lines 540-558): Replace the partial content (`!selectedType ? ... : null`) with a call to `renderFormContent()`.

3. **Update the desktop Dialog branch** (lines 562-end): Replace the inline form JSX with the same `renderFormContent()` call.

This is a refactor that moves ~450 lines of duplicated-but-missing JSX into a single shared function, fixing the bug where mobile shows an empty drawer.

### Technical Detail

Current mobile branch:
```tsx
<div className="overflow-y-auto flex-1 px-4 pb-8">
  {!selectedType ? (
    <div className="space-y-2 pt-2">
      {BLOCK_TYPES.map(...)}
    </div>
  ) : null}   // <-- BUG: no form rendered
</div>
```

Fixed mobile branch:
```tsx
<div className="overflow-y-auto flex-1 px-4 pb-8">
  {renderFormContent()}
</div>
```

Where `renderFormContent()` contains the full type selector + form fields + save button (currently only in the Dialog branch).
