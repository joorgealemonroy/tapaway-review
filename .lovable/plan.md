
# Fix: Add Block Button, Link Pills in Preview, and Card Step Redesign

## Issues

1. **"Add block" button does nothing** -- When the block modal is closed via the X button or clicking outside, the Dialog's `onOpenChange` sets `modalOpen=false` but never calls `onExternalModalClose`. This leaves `blockModalOpen` stuck at `true` in LinksStep, so clicking "Add block" again doesn't change the value, and the useEffect never re-fires.

2. **Link pills in preview don't match real profile** -- The preview currently renders correctly for standard pills, but the compact scaled preview (scale 0.38) makes it hard to see. The main issue is ensuring `display_style` is properly defaulted so links show as pills with platform icons matching the real profile styling.

3. **"Get a physical card" step is too skippable** -- Currently it's a plain list of radio-style options that users can breeze through. It needs to be more visually engaging to drive card orders.

---

## Changes

### File: `src/components/personal/BlocksManager.tsx`

**Fix the modal close handler** -- Replace the Dialog's `onOpenChange={setModalOpen}` with a proper handler that also calls `onExternalModalClose` when closing. This ensures `blockModalOpen` resets to `false` in LinksStep so the next click works.

```typescript
// Line 324: Change onOpenChange handler
<Dialog open={modalOpen} onOpenChange={(open) => {
  if (!open) {
    handleCloseModal(); // calls resetForm + onExternalModalClose
  } else {
    setModalOpen(true);
  }
}}>
```

### File: `src/components/personal/signup/LinksStep.tsx`

**Ensure link pills render with correct default display_style** -- Set `display_style` to `"pill"` instead of `null` when no explicit style is set, so the renderer treats them as standard pill buttons (matching the real profile behavior).

```typescript
display_style: link.displayStyle || "pill",
```

### File: `src/components/personal/signup/PreviewStep.tsx`

**Complete redesign to make the card step more appealing and harder to skip:**

- Add a hero section at the top with a visual of the NFC card with a tap animation (pulsing ring effect)
- Add a compelling headline: "Complete your TapAway" with subtext about tap-to-share
- Show the card benefits inline (not hidden behind a dialog) as a visual checklist
- Make "Custom Card" the default selected option (pre-select it instead of "none")
- Add a mini stat line like "87% of users get a card" (social proof nudge)
- Show the card preview larger and more prominently for the custom option
- Change "Not now" to a less prominent text link at the bottom instead of a full radio option
- Replace the "Why get a physical card?" info dialog with the benefits always visible
- Add a subtle animation/glow to the card preview to draw attention

The layout becomes:
1. Hero visual (NFC card with animated tap rings)
2. "Complete your TapAway" headline
3. Benefit bullets (always visible, not hidden)
4. Card choice: Custom (default, prominent) / Basic (secondary) 
5. Continue button (primary CTA)
6. "Skip for now" as a small text link below

### No other files change
