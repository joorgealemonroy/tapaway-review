/**
 * Unsaved-changes guard registry for the business dashboard.
 *
 * Tabs like Menu and Settings hold local edits that live only in component
 * state — switching tabs unmounts the Radix TabsContent and discards them
 * silently. Each editable tab registers a dirty-checker here; the dashboard
 * shell (src/pages/Dashboard.tsx) consults it before switching tabs and on
 * beforeunload.
 */

/** A tab's dirty-checker. */
export interface UnsavedGuard {
  /** True when the tab currently holds edits that have not been saved. */
  isDirty: () => boolean;
}

const guards = new Map<string, UnsavedGuard>();

/**
 * Register a tab's dirty-checker. Returns an unregister function —
 * call it from the registering component's effect cleanup.
 */
export function registerUnsavedGuard(tab: string, guard: UnsavedGuard): () => void {
  guards.set(tab, guard);
  return () => {
    if (guards.get(tab) === guard) guards.delete(tab);
  };
}

/** True when the given tab currently has unsaved edits. */
export function isTabDirty(tab: string): boolean {
  const guard = guards.get(tab);
  if (!guard) return false;
  try {
    return guard.isDirty();
  } catch {
    return false;
  }
}

/** True when ANY registered tab currently has unsaved edits. */
export function anyTabDirty(): boolean {
  for (const guard of guards.values()) {
    try {
      if (guard.isDirty()) return true;
    } catch {
      // A broken checker must never block navigation.
    }
  }
  return false;
}
