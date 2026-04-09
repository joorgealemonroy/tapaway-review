

# Fix Dashboard UX: Unified Save, Google Review Pill, Preview Colors

## Issue 1: Unified Save Flow

**Problem**: DashboardHeroEditor has its own Save button (line 197-205). Users must save hero fields and links/blocks separately.

**Fix**: Convert DashboardHeroEditor to a ref-based pattern (like DashboardUnifiedContent) so PersonalDashboard can trigger both saves via `Promise.all`.

### DashboardHeroEditor.tsx
- Add `forwardRef` + `useImperativeHandle` exposing `{ saveAllChanges, discardChanges, hasPendingChanges }`
- `saveAllChanges` = the existing `handleSave` logic but **without** its own toast (parent handles toast)
- `discardChanges` = reset local state back to props
- Remove the standalone Save button from the JSX
- Report `hasChanges` to parent via an `onPendingChangesChange` callback (same pattern as DashboardUnifiedContent)

### PersonalDashboard.tsx
- Add a `heroEditorRef` alongside existing `unifiedContentRef`
- Wire `hasPendingChanges` to combine both: `heroHasPending || contentHasPending`
- Update `handleSaveChanges`:
  ```ts
  const saves: Promise<void>[] = [];
  if (heroEditorRef.current?.hasPendingChanges) saves.push(heroEditorRef.current.saveAllChanges());
  if (unifiedContentRef.current?.hasPendingChanges) saves.push(unifiedContentRef.current.saveAllChanges());
  const results = await Promise.allSettled(saves);
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    toast.error("Some changes failed to save");
    // Don't clear save bar
  } else {
    toast.success("Changes saved!");
  }
  ```
- Update `handleDiscardChanges` to call both refs' `discardChanges()`

## Issue 2: Google Review Pill Styling

**Problem**: Sugar Bloom's Google Review link has no `pill_color`, no `is_featured`, so it renders as a semi-transparent row on the dark background — barely visible.

**Data fix**: Update Sugar Bloom's Google Review link to set `pill_color = '#ffffff'` and `is_featured = true`.

**Code fix (create-rep-onboarding)**: Line 174-181 — add `pill_color: '#ffffff'` and `is_featured: true` to the auto-created Google Review link insert.

**Renderer fix (ProfilePreviewRenderer.tsx)**: In `renderLink`, for the non-featured pill path (line 459-484), add a special case: if `link.link_type === 'google_review'` and no `pill_color`, default to white background with dark text instead of the translucent style.

## Issue 3: Preview Panel Colors

**Problem**: `ProfilePreviewPanel.tsx` line 68 has `bg-white` hardcoded on the screen div. Dark-themed profiles show a white flash behind content.

**Fix**: Change `bg-white` to `bg-black` (or use the profile's `background_color`). Since most profiles with dark themes have dark content that fills the viewport, `bg-black` is a safe neutral that won't flash white.

## Files Modified

| File | Change |
|------|--------|
| `DashboardHeroEditor.tsx` | Convert to `forwardRef`, expose `saveAllChanges/discardChanges/hasPendingChanges`, remove standalone Save button, add `onPendingChangesChange` prop |
| `PersonalDashboard.tsx` | Add `heroEditorRef`, combine pending states, use `Promise.allSettled` in save handler, single toast |
| `ProfilePreviewPanel.tsx` | Change `bg-white` → profile's `background_color` or `bg-black` fallback |
| `ProfilePreviewRenderer.tsx` | Default `google_review` links to white pill on dark backgrounds |
| `create-rep-onboarding/index.ts` | Add `pill_color: '#ffffff'`, `is_featured: true` to auto-created review link |
| Database | Update Sugar Bloom's review link: `pill_color`, `is_featured` |

