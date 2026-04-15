

# Fix Stale Closure in Pending Changes State Updates

## Problem
While `markPendingChange` already uses the functional updater (`setPendingChanges(prev => ...)`), all **callers** read from the stale `pendingChanges` closure to construct their Maps, Sets, and arrays *before* passing them in. Two rapid edits in the same render cycle both read the same stale `pendingChanges`, so the second overwrites the first.

Example: editing X builds `new Map(pendingChanges.updatedLinks)` → `{X}`, then editing Instagram builds `new Map(pendingChanges.updatedLinks)` → `{IG}` from the same stale value. X is lost.

## Solution
Upgrade `markPendingChange` to accept **merge semantics** — callers pass partial deltas and the function merges them into `prev` inside the updater. This eliminates all stale closure reads.

## Changes

### `src/components/personal/DashboardUnifiedContent.tsx`

**1. Rewrite `markPendingChange` (lines 163-180)**
Instead of `{ ...prev, ...changes }`, merge each field intelligently:
- `updatedLinks` / `updatedBlocks` (Maps): iterate incoming entries and merge into `prev`'s Map
- `deletedLinkIds` / `deletedBlockIds` (Sets): union with `prev`'s Set
- `addedLinks` / `addedBlocks` (arrays): concat or replace depending on caller intent
- `orderChanged`: OR with prev
- Scalar overwrites still work for full-replacement calls (addedLinks filter, etc.)

Add a second parameter `mergeMode: boolean = false` to distinguish "merge Maps/Sets into prev" from "replace entirely" (for cases like filtering `addedLinks` on delete).

**2. Update callers that build from `pendingChanges.*`** (~8 call sites at lines 525, 552-562, 578-587, 603-624, 637-644, 652-658, 722-736):
- For `updatedLinks`/`updatedBlocks`: pass just the single entry `{ id, updates }` and let `markPendingChange` merge
- For `deletedLinkIds`/`deletedBlockIds`: pass just the single ID to add
- For `addedLinks`/`addedBlocks` mutations (filter/map): these already produce complete new arrays, so they remain as full replacements

**3. Alternatively (simpler approach):** Keep `markPendingChange` signature the same but change callers to pass **lambda-style partial updates** — convert `markPendingChange` to accept `(changes: Partial<PendingChanges> | ((prev: PendingChanges) => Partial<PendingChanges>))`. Callers that need to read previous state pass a function:

```typescript
// Before (stale):
const newUpdates = new Map(pendingChanges.updatedLinks);
newUpdates.set(id, { ...existingUpdates, ...dbUpdates });
markPendingChange({ updatedLinks: newUpdates });

// After (reads prev):
markPendingChange(prev => {
  const newUpdates = new Map(prev.updatedLinks);
  const existing = prev.updatedLinks.get(id) || {};
  newUpdates.set(id, { ...existing, ...dbUpdates });
  return { updatedLinks: newUpdates };
});
```

This is the cleanest fix — minimal refactor, each caller that touches Maps/Sets/arrays reads from `prev` inside the lambda. ~12 call sites need updating.

