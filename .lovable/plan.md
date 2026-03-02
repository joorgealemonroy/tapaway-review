

# Fix: Dashboard Content Save Reliability

## Root Cause
The `saveAllChanges` method in `DashboardUnifiedContent.tsx` has two critical bugs:

1. **Silent failures**: All insert/update/delete operations ignore their return `error`. The toast shows "Changes saved!" even when DB operations fail. Users are told their changes saved when nothing actually persisted.

2. **Block double-insert**: `BlockModal` has `deferSave={false}`, meaning blocks get inserted into the DB immediately when created. But `saveAllChanges` also tries to insert them again from `pendingChanges.addedBlocks`, causing a duplicate key error that's silently swallowed.

## Fixes in `src/components/personal/DashboardUnifiedContent.tsx`

### 1. Add error handling to all DB operations in `saveAllChanges`
- Check `error` on every `supabase.from()` call (delete, insert, update)
- Collect all errors and only show "Changes saved!" if zero errors
- Show "Some changes failed to save" with details if any errors occurred
- Throw on first critical error so the user knows something went wrong

### 2. Fix block double-insert
- Change `deferSave` to `true` on the `BlockModal` (line 960) so blocks are NOT saved immediately
- OR remove blocks from `pendingChanges.addedBlocks` tracking when they're already saved by BlockModal
- The cleaner fix is `deferSave={true}` since the entire component's design is "buffer then save"

### 3. Ensure delete operations actually succeed before proceeding
- Currently deletes run with no error check — if RLS blocks the delete, the old link stays and the user never knows

## Files to modify (1):
- `src/components/personal/DashboardUnifiedContent.tsx`
  - Add error checking to every DB call in `saveAllChanges`
  - Change `deferSave={false}` to `deferSave={true}` on BlockModal (line 960)
  - Abort and report on first error instead of silently continuing

