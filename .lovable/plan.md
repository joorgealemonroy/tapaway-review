
# Fix Mobile Block Editing and Drag-and-Drop in Signup Flow

## Problem 1: Cannot edit blocks on mobile
The signup flow's `BlocksManager.tsx` always uses a `Dialog` component for the block editor. On mobile, dialogs can be clipped or have unreachable content. The dashboard already solved this — `BlockModal.tsx` uses a `Drawer` (bottom sheet) on mobile and `Dialog` on desktop.

**Fix:** Replace the `BlocksManager` usage in `LinksStep.tsx` with the full-featured `BlockModal` component (which already has mobile Drawer support and `deferSave` mode). Pass `deferSave={true}` so it returns block data without hitting the database.

### Files changed
- `src/components/personal/signup/LinksStep.tsx` — Import `BlockModal` instead of `BlocksManager`. Wire up `onBlockSaved` to call `addBlock` or `updateBlock` with the returned data. Map the `editingBlock` from onboarding format to `BlockModal`'s expected `PersonalBlock` shape (with `block_type` instead of `type`).

---

## Problem 2: Drag-and-drop copies text instead of reordering on mobile
`LinksStep.tsx` uses HTML5 `draggable` + `onDragStart/onDragOver/onDragEnd` — these events do not fire on touch devices. The app already has a `useTouchHoldDrag` hook (used in the dashboard) that implements touch-hold-to-drag with haptic feedback and scroll conflict prevention.

**Fix:** Integrate `useTouchHoldDrag` into the unified content list in `LinksStep.tsx`.

### Files changed
- `src/components/personal/signup/LinksStep.tsx`:
  1. Import `useTouchHoldDrag`
  2. Initialize the hook with the `unifiedContent` array and a reorder callback
  3. Add `onTouchStart`, `onTouchMove`, `onTouchEnd` handlers to each draggable row
  4. Add `select-none` class to rows during drag to prevent text selection
  5. Remove the manual `draggedIndex` state (the hook manages it)

---

## Technical Details

### BlockModal integration mapping
The onboarding `PersonalBlock` uses `{ type, content, sortOrder }` while `BlockModal` expects `{ block_type, content, sort_order, alignment }`. The conversion is:
- `block.type` maps to `block_type`
- `block.sortOrder` maps to `sort_order`
- `block.content.alignment` maps to `alignment`

When `BlockModal` returns a saved block, convert back before calling `addBlock`/`updateBlock`.

### Touch drag reorder callback
The `useTouchHoldDrag` hook calls `onReorder` with the full reordered array. Since the unified content list mixes links and blocks, the reorder callback needs to call `reorderContent(newItems)` (same as the existing desktop `handleDragOver` logic).
