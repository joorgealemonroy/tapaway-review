## Goal

Autosave every edit in the hub dashboard and give the user an Undo instead of a manual Save button, so heavy editing sessions never lose data.

## New behavior

1. **Debounced autosave (1.5s idle, reset on every edit).**
   - `DashboardHeroEditor` and `DashboardUnifiedContent` each expose a `lastEditedAt: number` (timestamp) via their imperative refs, bumped inside every state setter that currently flips `hasPendingChanges`.
   - `PersonalDashboard` reads both `lastEditedAt` values through a small subscription (ref + `useSyncExternalStore`-style callback, or a `tick` state the children call via a new `onEdit` prop). On each tick it clears and restarts a 1.5s `setTimeout` (`ReturnType<typeof setTimeout>`).
   - Only when the user truly pauses for 1.5s does the timer fire → autosave flush.
2. **Flush triggers besides the debounce.**
   - `visibilitychange` → hidden: run the flush.
   - `beforeunload`: fire-and-forget — call `saveAllChanges()` without awaiting, don't try to block the unload or read a response. This is best-effort only; the debounce + visibility flush are the real guarantees.
   - Component unmount / route change: flush.
3. **Concurrency guard.** A `savingRef` prevents overlapping saves. If edits arrive during a save, the debounce restarts after it finishes.
4. **Autosave status pill** replaces `UnsavedChangesBar`:
   - `Editing…` (pending debounce)
   - `Saving…` (in-flight)
   - `Saved · Undo` (visible ~8s after success)
   - `Save failed · Retry` (on error, pending changes are kept — matches existing behavior at `DashboardUnifiedContent.tsx:325`)
   - No more per-save toast spam.
5. **Safe Undo (pure client state, no DELETEs).**
   - Immediately before each flush, snapshot the *current in-memory state* of both editors: hero fields + the full links/blocks arrays and their `pendingChanges` maps as they exist in React.
   - Undo re-hydrates those snapshots into the children via new `restoreSnapshot(snapshot)` imperative methods, which overwrite local state.
   - That flips `hasPendingChanges` back to true against the just-saved DB rows, so the normal diffing `saveAllChanges()` path pushes the reversion — no destructive delete/insert, no risk of orphaning rows if the network drops.
   - Single-level undo only; snapshot is dropped after 8s or after a new edit.

## Files

- `src/pages/personal/PersonalDashboard.tsx`
  - Replace `UnsavedChangesBar` with new `AutosaveStatusBar`.
  - Add debounce effect keyed on `heroLastEditedAt + contentLastEditedAt`.
  - Add `visibilitychange` + `beforeunload` listeners; unmount flush.
  - Add snapshot capture before flush, `undoLastSave()` handler that calls `restoreSnapshot()` on both refs then schedules the next autosave.
- `src/components/personal/DashboardHeroEditor.tsx`
  - Add `lastEditedAt: number` and `restoreSnapshot(snap)` / `getSnapshot()` to the imperative handle. Bump `lastEditedAt` in the setters that already mark pending.
- `src/components/personal/DashboardUnifiedContent.tsx`
  - Same additions: `lastEditedAt`, `getSnapshot()`, `restoreSnapshot()` covering `links`, `blocks`, and `pendingChanges`.
- `src/components/personal/AutosaveStatusBar.tsx` (new)
  - Small fixed pill, same positioning as `UnsavedChangesBar` (`bottom-16 md:bottom-0 …`). Props: `status`, `onUndo`, `onRetry`.
- `src/components/personal/UnsavedChangesBar.tsx` — leave file; grep for other usages before removing.

## Non-goals

- No DB schema changes, no changes to child components' diffing/save logic beyond exposing snapshot + edit-timestamp.
- Multi-step undo history.
- No new toasts on every autosave.

## Edge cases

- Save in flight + new edit → queue; do not start a second save concurrently.
- Undo clicked while a debounce is pending → cancel the pending timer, restore snapshot, let the next debounce push the correction.
- Admin impersonation and rep demo flows use the same dashboard and inherit autosave automatically.
- Timers use `ReturnType<typeof setTimeout>` per project convention.
