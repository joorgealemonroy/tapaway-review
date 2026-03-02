

# Plan: Add Auto-Retry on Save Failure + End-to-End Test

## Current State
The save flow now properly detects errors and shows them to the user. When a save fails, pending changes are preserved (the `return` before clearing `pendingChanges` keeps them intact), so the Save bar stays visible. However, the user must manually click Save again — there is no automatic retry.

## Changes

### 1. Add automatic retry logic to `saveAllChanges`
**File**: `src/components/personal/DashboardUnifiedContent.tsx`

When a save operation fails:
- Wait 2 seconds, then automatically retry once
- Show a toast like "Retrying save..." during the retry
- If the retry also fails, show the error toast and keep the Save bar visible (as it does now)
- Track retry state so the Save button shows "Retrying..." spinner during the automatic attempt
- Maximum 1 automatic retry to avoid infinite loops

Implementation: wrap the core save logic in a helper, call it from `saveAllChanges`, and if it returns errors, schedule one retry via `setTimeout`. Use a `retryCount` parameter to cap retries at 1.

### 2. Browser test after implementation
- Navigate to the personal dashboard
- Verify the save bar appears when changes are made
- Confirm successful saves clear the bar and persist to DB

### Files to modify (1):
- `src/components/personal/DashboardUnifiedContent.tsx` — add retry wrapper around save logic

