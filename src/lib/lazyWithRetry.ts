import { lazy, type ComponentType } from "react";

/**
 * A dynamic import fails with "Failed to fetch dynamically imported module" /
 * "Importing a module script failed" when the browser still holds the old
 * build's chunk names after a new version ships. Retrying once handles a
 * flaky network; a single guarded reload picks up the new manifest.
 */
const RELOAD_FLAG = "lovable:chunk-reloaded";

export const isChunkLoadError = (message: string) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
    message,
  );

export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isChunkLoadError(message)) throw error;

      try {
        // One immediate retry — covers a transient network blip.
        return await factory();
      } catch {
        /* fall through to the reload path */
      }

      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
        if (!alreadyReloaded) sessionStorage.setItem(RELOAD_FLAG, "1");
      } catch {
        /* storage unavailable — fall back to throwing */
      }

      if (!alreadyReloaded) {
        window.location.reload();
        // Keep the promise pending while the page reloads so no error UI flashes.
        return await new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}

/** Clear the reload guard once the app has successfully booted. */
export const clearChunkReloadGuard = () => {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* ignore */
  }
};
