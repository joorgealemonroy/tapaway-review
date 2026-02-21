

# Fix Background Color Bugs + Add More Colors

## Bugs Found

### Bug 1: "Background auto-matched to your profile photo" on manual selection
The `useEffect` on line 171-200 runs whenever the `backgroundColor` prop changes. When a user picks a background fade (a `linear-gradient`), the flow is:
1. `handleBgColorChange` sets `pendingBgColor` and calls `onUpdate`
2. Parent re-renders, passing the new value back as the `backgroundColor` prop
3. The ambient `useEffect` fires because `backgroundColor` (a dependency) changed
4. It checks `pendingBgColor` -- sees it starts with `linear-gradient` -- decides to auto-apply
5. Overwrites the user's selection with the ambient gradient and shows the incorrect toast

### Bug 2: Save button doesn't appear
Because the ambient effect immediately overwrites `pendingBgColor` with its own gradient AND calls `onUpdate` (which syncs the prop), `pendingBgColor === backgroundColor` becomes true instantly, so `hasChanges` stays `false`.

## Fix

**File:** `src/components/personal/DashboardDesignTab.tsx`

### 1. Track manual user selections with a ref
Add a `userPickedBg` ref that is set to `true` whenever the user manually picks a background color, and reset to `false` after save/discard. In the ambient `useEffect`, skip auto-apply when `userPickedBg.current` is true.

### 2. Add more background color and fade presets

Expand `BG_PRESETS` from 6 to 8 colors:
```
"#ffffff", "#f5f5f5", "#fafafa", "#1a1a1a",
"#0a0a0a", "#1e293b", "#fef3c7", "#ecfdf5"
```

Expand `BG_FADE_PRESETS` from 3 to 6 fades:
```
Warm, Sky, Rose (existing)
+ Sunset, Ocean, Midnight
```

### 3. Detailed changes

- Add `const userPickedBg = useRef(false);` near other state declarations
- In `handleBgColorChange`: set `userPickedBg.current = true` before updating state
- In `handleDiscard`: reset `userPickedBg.current = false`
- In `handleSave` (after success): reset `userPickedBg.current = false`
- In the ambient `useEffect` (line 171-200): add `if (userPickedBg.current) return;` at the top so it never overwrites a manual pick
- Update `BG_PRESETS` and `BG_FADE_PRESETS` constants with additional options

