# Fix: reordered half-width tiles sometimes don't persist

## What's actually happening

The editor tracks "you reordered something" as a single boolean flag (`orderChanged`). When autosave runs, it snapshots that flag, writes every item's new `sort_order` to the DB, and then clears the flag. If the user drags again while that save is still in flight (very easy with a 1.5s debounce + sequential Supabase updates), the second drag re-sets the flag — but the post-save cleanup unconditionally clears it back to `false`. Result: the second reorder is silently dropped, `hasPendingChanges` reports nothing to save, and the live page keeps serving the stale `sort_order`.

The editor still *looks* correct because it renders from local state. The live page renders from the DB, where the full-width row is still sitting between the two halves — so the "consecutive halves" grouping breaks and they render as two singletons instead of a paired row. Deleting + re-adding works around it because add/delete are tracked per-id and can't be clobbered the same way.

Root cause pinpointed in `src/components/personal/DashboardUnifiedContent.tsx`:
- `executeSave` captures `linksRef.current` / `blocksRef.current` once at entry (before any `await`), so mid-save reorders aren't written.
- Post-save cleanup at the `orderChanged` reconciliation clears the flag whenever the snapshot had it set, regardless of whether a newer reorder arrived meanwhile.

## The fix

Make reorder tracking identity-aware instead of a single boolean, in `src/components/personal/DashboardUnifiedContent.tsx`:

1. **Snapshot the actual order that was saved.** In `executeSave`, when writing `sort_order`s, build a map `{ linkId|blockId → sort_order }` of exactly what was persisted, and return it alongside the rest of the save result.
2. **Re-read the latest order right before the write loop** (not at function entry), so any reorder that happened between save-scheduling and the loop is included in this pass.
3. **Only clear `orderChanged` if the current live order still matches the saved snapshot.** In the post-save reconciliation, compare the saved id→order map to the current `linksRef.current` / `blocksRef.current` order. If they match, clear the flag. If a newer drag has changed anything, leave `orderChanged: true` so the debounced autosave fires again and persists the newer order.
4. **Keep the existing field/add/delete reconciliation untouched** — those paths are already id-scoped and correct.

No schema changes, no changes to rendering or to the live page. This is a persistence-layer race fix scoped to one file.

## Verification

- Typecheck.
- Manual repro in the dashboard as the affected rep view: create `[half, full-row, half]`, drag the trailing half up so the layout becomes `[half, half, full-row]`, wait for the autosave toast, hard-refresh the live hub — the two halves should render as a paired grid row.
- Repeat with a rapid double-drag (drag, then drag again within ~1s) to exercise the race path; confirm the second order still lands in the DB and the live page reflects it.
- Confirm add/edit/delete flows still save correctly (no regression to the id-scoped paths).
