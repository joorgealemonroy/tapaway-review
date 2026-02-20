

# Add "Undo Copy" to Hub Showcase

## What Changes

When a user taps "Copy Layout" on a hub, the button currently changes to a teal "Copied" state. We'll make that "Copied" button act as an undo -- tapping it again clears the copied layout from sessionStorage, resets the visual state, and shows a toast confirming the undo.

This way users can change their mind without any friction. No new UI elements needed -- the existing button just toggles.

## Behavior

- **First tap**: Copies layout to sessionStorage, button turns teal with checkmark and "Copied" label (current behavior)
- **Second tap on same card**: Clears `tapaway_copied_layout` from sessionStorage, resets `copiedId` to `null`, shows toast "Layout removed"
- **Tap a different card while one is already copied**: Replaces the previous copy with the new one (current behavior, unchanged)

## Technical Details

### File: `src/components/card/HubShowcase.tsx`

In the button's `onClick` handler, add a check: if the clicked profile is already the `copiedId`, clear sessionStorage and reset state instead of copying again.

```
onClick={() => {
  if (copiedId === p.id) {
    sessionStorage.removeItem("tapaway_copied_layout");
    setCopiedId(null);
    toast("Layout removed");
  } else {
    handleCopyLayout(p);
  }
}}
```

The "Copied" button text and teal styling already exist -- they just become the visual indicator that tapping again will undo. No other files need changes.

