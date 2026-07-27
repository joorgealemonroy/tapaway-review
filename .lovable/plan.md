## Problem

Reps report two related bugs when editing a demo hub (e.g. `elchilitosmexicanrestaurant`):

1. **Deletes don't persist / live preview keeps the removed item.** They remove a link or block, autosave fires, but the deleted item is still on the public hub and reappears in the editor after a reload.
2. **Adds get dropped and the page appears to "reset"**, forcing them to redo work they already did.

Some links also occasionally seed as half-width tiles instead of full-width pills — that's a seeding side-effect of the drop above (freshly re-fetched state overwrites their in-progress cleanup).

## Root cause (confirmed by reading the code)

`src/components/personal/DashboardUnifiedContent.tsx` exposes `saveAllChanges` to the parent via `useImperativeHandle`. The handle's dependency array is:

```
[hasPendingChanges, getSnapshot, restoreSnapshot]
```

`hasPendingChanges` is a boolean — once the user makes the first edit it flips `false → true` and stays `true` until the debounced autosave completes and clears `pendingChanges`. Between those two moments, `useImperativeHandle` does **not** re-register, so the parent keeps calling the *first* `saveAllChanges` closure, which captured the *first* `pendingChanges` snapshot.

Concrete failure sequences that match the reports:

- **Delete → quick add** (within one 1.5s debounce window). Closure sees `{deletedLinkIds: {A}}` only. The delete runs; the newly added link is never persisted. The link vanishes on the next refetch → "page reset, redo the section".
- **Add → delete of an existing item**. Closure sees `{addedLinks: [X]}` only. X is inserted; the deletion is silently skipped. The removed item stays live → "live preview thinks it's still there".
- Same class of bug applies to updates/reorders that arrive after the first edit in a batch.

After the stale closure runs, the child's `setPendingChanges(createEmptyPendingChanges())` clears the real pending set, so those dropped edits are lost forever with no visible error.

Secondary contributor: in `src/pages/personal/PersonalDashboard.tsx`, `loadData` is memoized with `searchParams` in its dep array. Any code path that calls `setSearchParams(...)` (welcome flag, upgrade success handler, profile switcher) re-runs `loadData` and overwrites in-flight local `links`/`blocks`/`profile` state, which is another way an edit-in-progress can disappear.

## Fix

Change the child so `saveAllChanges` always reads the current `pendingChanges` and current `links`/`blocks`, and change the parent so ordinary URL cleanups don't wipe local state.

### 1. `src/components/personal/DashboardUnifiedContent.tsx`

- Add refs that mirror the latest values:
  - `pendingChangesRef` updated in a `useEffect` on every `pendingChanges` change.
  - `linksRef` / `blocksRef` updated on every `links` / `blocks` change (needed by the reorder branch of `executeSave`).
- Rewrite `executeSave` and `saveAllChanges` to read from those refs instead of the closure variables.
- Change `useImperativeHandle` to expose stable methods that also read from refs. Either:
  - drop the dep array (recreate the handle every render — cheap here), or
  - keep deps but rely on the refs so a stale closure is still correct.
- After a successful save, snapshot the ref values (not closure) before calling `setPendingChanges(createEmptyPendingChanges())`, so anything that landed between the save starting and the state clear is preserved as a fresh pending batch. Concretely: diff `pendingChangesRef.current` against the set we just persisted and re-seed the leftover into `pendingChanges`.

### 2. `src/pages/personal/PersonalDashboard.tsx`

- Narrow `loadData`'s dependencies from the whole `searchParams` object to just the values it actually reads: `adminViewId` and `searchParams.get("profile_id")` (stored in a memoized primitive). This stops `setSearchParams({})` (welcome cleanup, upgrade cleanup) from re-running the full profile+links+blocks fetch mid-edit.
- Before any `setSearchParams({...})` call that is *not* a profile switch (the welcome-cleanup on line ~364 and the upgrade-cleanup on line ~418), guard against clobbering unsaved work: if `unifiedContentRef.current?.hasPendingChanges || heroEditorRef.current?.hasPendingChanges`, flush autosave first (`await flushAutosave()`), then clear the param.
- Profile switcher (`setSearchParams({ profile_id: ... })`) already intentionally reloads — keep that behavior but call `flushAutosave()` first so pending edits on the outgoing profile aren't lost.

### 3. Half-width vs pill seeding regression

Reps saw core links seed as half-width tiles again. That's the same class of issue: an in-progress save dropped their edits and the refetch showed the freshly seeded defaults. No seeding logic change is needed — once fix #1 lands, their manual pill choice will persist. Verify by opening `RepDemoCreate.tsx`'s seed for Website/Google Review and confirming they still write `display_style: 'pill'` and no `grid_size`/`cover_image_url` (they do today).

## Verification

1. On a rep demo hub, add link A, immediately delete existing link B, wait 2s. Reload — A is present, B is gone.
2. Delete a block, then within the debounce window add a YouTube block, wait 2s. Reload — both changes stuck.
3. Add 6 links back-to-back, wait for autosave "Saved" toast, reload — all 6 present.
4. Trigger the welcome banner flow (`?welcome=true`) while an unsaved edit is in flight; confirm the edit persists after the URL cleans up.
5. Public hub (`/elchilitosmexicanrestaurant`) reflects deletions immediately after the "Saved" indicator, with no stale items.

## Technical notes

- No schema changes, no RLS changes.
- No UI redesign — behavior fix only.
- Files touched: `src/components/personal/DashboardUnifiedContent.tsx`, `src/pages/personal/PersonalDashboard.tsx`.
