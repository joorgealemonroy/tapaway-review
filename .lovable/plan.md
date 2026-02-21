
# Fix Auto-Match Toast + Save Button Visibility

## Two Bugs

### Bug 1: "Background auto-matched" toast fires on every tab entry
The ambient `useEffect` (line 178) runs on mount because `backgroundColor` is in its dependency array. On first render, if the current background is already a gradient, `shouldAutoApply` is `true`, so it overwrites the value and shows the toast -- even though nothing changed. 

**Fix:** Add a `hasInitialized` ref that starts `false`, is set to `true` after the first run, and skips the toast + overwrite on the initial mount.

### Bug 2: Save button never appears for background changes
`handleBgColorChange` calls `onUpdate({ backgroundColor: color })`, which tells the parent to update. The parent passes the new value back as the `backgroundColor` prop. The sync `useEffect` (line 95-98) then resets `pendingBgColor` to match the prop. This means `pendingBgColor === backgroundColor` is always true, so `hasChanges` stays `false`.

**Fix:** Stop calling `onUpdate` from `handleBgColorChange` (and `handleColorChange` / `handleTypeChange`). These handlers should ONLY update local pending state. The preview panel should read from the pending values, not the parent prop. `onUpdate` should only be called inside `handleSave`.

## Changes

**File:** `src/components/personal/DashboardDesignTab.tsx`

### 1. Add initialization ref to prevent auto-match on mount
```tsx
const hasInitialized = useRef(false);
```
In the ambient `useEffect`, on the first run set `hasInitialized.current = true` and return early (skip auto-apply). This prevents the toast from firing every time the design tab loads.

### 2. Remove `onUpdate` calls from local handlers
Remove `onUpdate(...)` from:
- `handleColorChange` (line 159)
- `handleBgColorChange` (line 166)
- `handleTypeChange` (line 171)

These should only set local pending state. The preview should reflect pending values without writing to the parent until save.

### 3. Remove sync effects that reset pending state
Remove or guard the three `useEffect` blocks (lines 88-98) that sync pending state from props. These are resetting pending values whenever the parent re-renders, defeating the purpose of buffering. Instead, only reset pending state inside `handleDiscard` and after a successful `handleSave` (which is already done).

### 4. Pass pending values to preview
If the preview panel reads from parent props, update it to read from `pendingHeaderType`, `pendingHeaderColor`, and `pendingBgColor` instead, so users see their selection immediately without a DB write.

## Result
- Auto-match toast only fires once when user first uploads a profile photo, not on every tab visit
- Selecting any color (solid or fade) for background or header immediately shows the sticky "Save Changes" bar
- Changes are only persisted when the user clicks Save
- Discarding resets everything to the last saved state
