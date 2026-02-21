

# Fix: Headline Save Requiring Multiple Attempts

## Problem
The `DashboardHeroEditor` computes `hasChanges` inside a `useEffect`, which means it updates **one render behind** the actual state change. This creates two related issues:

1. **Save button flicker/delay**: After typing, the Save button may not appear until the next render cycle, causing users to think their input wasn't registered.
2. **Stale guard in handleSave**: The `if (!hasChanges) return` check at the top of `handleSave` can read a stale `false` value if the user clicks Save before the effect has run.

## Fix

**File:** `src/components/personal/DashboardHeroEditor.tsx`

Replace the `useEffect`-based `hasChanges` with a synchronously computed `useMemo`. This ensures the Save button appears instantly when the user types, and `handleSave` never bails due to stale state.

### Changes

1. **Remove the `hasChanges` useState and its useEffect** (lines 42, 65-73) -- delete the `useState(false)` and the effect that sets it.

2. **Replace with `useMemo`**:
```tsx
const hasChanges = useMemo(() => {
  const newPublicUsername = getPublicUsername(
    isFree ? "free" : (planType as any) || "free",
    usernameInput
  );
  return (
    name !== fullName ||
    headlineValue !== (headline || "") ||
    bioValue !== (bio || "") ||
    newPublicUsername !== username
  );
}, [name, headlineValue, bioValue, usernameInput, fullName, headline, bio, username, isFree, planType]);
```

3. **Remove `setHasChanges(false)`** from `handleSave` (line 183) -- it's no longer a state setter; `hasChanges` will automatically become `false` once `onUpdate` syncs the props.

This is a small, focused refactor -- same logic, but computed synchronously instead of asynchronously.
