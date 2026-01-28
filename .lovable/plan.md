
# Plan: Fix iPhone UX Issues, Admin-Created Account Display, and Preview Functionality

## Issues to Address

1. **Discard changes causes page refresh** - The `discardChanges` function in `DashboardUnifiedContent.tsx` calls `window.location.reload()` which is jarring UX
2. **Text highlight during drag** - When holding and dragging items, text gets selected (copy/paste highlight). Need to prevent user selection during drag
3. **Touch hold delay not working correctly** - If touch hold delay hasn't elapsed and user scrolls, it should let them scroll naturally
4. **Admin-created accounts need special messaging** - Instead of showing "paid account", show something welcoming like "VIP" or "Complimentary" for accounts created by admin
5. **Live preview should show actual final output** - The preview currently shows draft state; should filter inactive items like the actual profile page does

---

## 1. Fix Discard Changes Page Refresh

**File: `src/components/personal/DashboardUnifiedContent.tsx`**

Instead of `window.location.reload()`, properly reset the local state by:
- Notifying parent to refetch data from DB
- Accepting an `onDiscardRequest` callback prop from parent
- Parent handles the refetch cleanly without full page reload

**Changes:**
- Add `onDiscardRequest?: () => void` prop to component
- In `discardChanges`, call `onDiscardRequest?.()` instead of `window.location.reload()`
- In `PersonalDashboard.tsx`, pass a callback that triggers `loadData()` to refetch from DB

---

## 2. Prevent Text Selection During Drag

**Files: Multiple drag handler components**

Add CSS `user-select: none` when drag is active and `touch-action: none` to prevent browser gestures.

**Changes to `useTouchHoldDrag.ts`:**
- Return `isDragEnabled` state (already done)

**Changes to components using drag:**
- Add `select-none` class to draggable items
- When `isDragEnabled` is true, add `touch-none` class to container

**Changes to `DashboardUnifiedContent.tsx`, `DashboardLinksManager.tsx`, `DashboardBlocksManager.tsx`, `AdminUnifiedContent.tsx`, `AdminBlocksManager.tsx`:**
- Add CSS classes: `select-none` to all draggable row elements
- Add `touch-action: none` via CSS when in drag mode

---

## 3. Improve Touch Hold Delay Logic

The current implementation is already correct in `useTouchHoldDrag.ts`:
- If movement > 10px before delay elapses, timer is cancelled and scrolling proceeds
- However, need to ensure `touchmove` doesn't call `e.preventDefault()` when not in drag mode

**Already implemented correctly** - just verify the logic works.

---

## 4. Special Messaging for Admin-Created Accounts

**File: `src/lib/personalPlanLimits.ts`**

Add a new plan category for "admin_created" or detect when account was created by admin and show special messaging.

**Option A (Simpler):** Detect when `plan_type` is `monthly` or `yearly` but `stripe_subscription_id` is null (meaning admin created without payment)

**Implementation:**
- In `PersonalBillingTab.tsx`, check if `isPaidPlan && !profile.stripe_subscription_id`
- Show "Complimentary VIP" or "Full Access" badge instead of "Pro"
- Show welcoming message: "You have full access to all features - enjoy!"

**Changes to `src/components/personal/PersonalBillingTab.tsx`:**
```tsx
const isComplementary = isPro && !profile.stripe_subscription_id;
// Show different badge and message for complimentary accounts
```

---

## 5. Preview Shows Actual Final Output

**File: `src/components/personal/ProfilePreviewPanel.tsx` and `ProfilePreviewRenderer.tsx`**

The preview should only show:
- Active links (`is_active === true`)
- Active blocks (`is_active === true`)

**Current state:** Already passes `is_active` through, but need to verify filtering happens in `ProfilePreviewRenderer.tsx`

**Changes to `ProfilePreviewRenderer.tsx`:**
- Filter out inactive items before rendering:
```tsx
const activeLinks = links.filter(l => l.is_active !== false);
const activeBlocks = blocks.filter(b => b.is_active !== false);
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/components/personal/DashboardUnifiedContent.tsx` | Add `onDiscardRequest` prop, remove `window.location.reload()`, add `select-none` class to draggable items |
| `src/pages/personal/PersonalDashboard.tsx` | Pass `onDiscardRequest` callback that calls `loadData()` |
| `src/components/personal/PersonalBillingTab.tsx` | Add special messaging for complimentary VIP accounts (paid but no stripe subscription) |
| `src/components/personal/ProfilePreviewRenderer.tsx` | Filter out inactive links and blocks before rendering |
| `src/components/personal/DashboardLinksManager.tsx` | Add `select-none` class to draggable items |
| `src/components/personal/DashboardBlocksManager.tsx` | Add `select-none` class to draggable items |
| `src/components/admin/AdminUnifiedContent.tsx` | Add `select-none` class to draggable items |
| `src/components/admin/AdminBlocksManager.tsx` | Add `select-none` class to draggable items |

---

## Technical Details

### Discard Without Refresh Pattern
```typescript
// DashboardUnifiedContent.tsx
interface Props {
  // ... existing props
  onDiscardRequest?: () => void;
}

const discardChanges = useCallback(() => {
  setPendingChanges(createEmptyPendingChanges());
  onPendingChangesChange(false);
  toast.info("Changes discarded");
  // Request parent to reload data from DB
  onDiscardRequest?.();
}, [onPendingChangesChange, onDiscardRequest]);
```

```typescript
// PersonalDashboard.tsx
const handleDiscardRequest = useCallback(() => {
  loadData(); // Refetch all data from DB
}, [loadData]);

// Pass to DashboardUnifiedContent
<DashboardUnifiedContent
  onDiscardRequest={handleDiscardRequest}
  // ... other props
/>
```

### Complimentary Account Detection
```tsx
// PersonalBillingTab.tsx
const isComplementary = isPro && !profile.stripe_subscription_id;

// Badge
<Badge variant="default" className={isComplementary ? "bg-emerald-500" : isPro ? "bg-amber-500" : ""}>
  {isComplementary ? "VIP Access" : planInfo.name}
</Badge>

// Message
{isComplementary && (
  <p className="text-sm text-emerald-600 dark:text-emerald-400">
    You have full access to all premium features - enjoy!
  </p>
)}
```

### Preview Filter Implementation
```tsx
// ProfilePreviewRenderer.tsx
const ProfilePreviewRendererComponent = ({ profile, links, blocks, isPreview, onLinkClick }: Props) => {
  // Filter to only show active items (like the real profile page does)
  const activeLinks = useMemo(() => 
    links.filter(l => l.is_active !== false),
    [links]
  );
  
  const activeBlocks = useMemo(() => 
    blocks.filter(b => b.is_active !== false),
    [blocks]
  );
  
  // Use activeLinks and activeBlocks for rendering
};
```

### CSS for Preventing Selection During Drag
```tsx
// Draggable items should have these classes:
className={`... select-none touch-none ${isDragEnabled ? 'cursor-grabbing' : ''}`}
```
