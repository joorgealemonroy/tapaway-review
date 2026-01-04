/**
 * Project-wide guard that blocks any client-side calls to Supabase auth methods
 * that would trigger default OTP / verification emails from Lovable/Supabase.
 *
 * This file must be imported once at app boot (e.g. in main.tsx) BEFORE any
 * component renders so the guard is active for the entire app lifecycle.
 */

import { supabase } from "@/integrations/supabase/client";

const BLOCKED_AUTH_METHODS = [
  "signUp",
  "signInWithOtp",
  "resetPasswordForEmail",
  "verifyOtp",
] as const;

type BlockedMethod = (typeof BLOCKED_AUTH_METHODS)[number];

const originals: Partial<Record<BlockedMethod, unknown>> = {};
let guardInstalled = false;

export function installAuthGuard(): void {
  if (guardInstalled) return;
  guardInstalled = true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authAny = supabase.auth as unknown as Record<string, any>;

  BLOCKED_AUTH_METHODS.forEach((method) => {
    if (typeof authAny[method] !== "function") return;

    originals[method] = authAny[method];

    authAny[method] = (...args: unknown[]) => {
      console.error(
        `[AUTH_GUARD] Blocked supabase.auth.${method}() — these methods trigger default Lovable/Supabase emails.`,
        { ts: new Date().toISOString(), args }
      );
      // Return a resolved error so callers don't explode unexpectedly
      return Promise.resolve({
        data: null,
        error: new Error(
          `supabase.auth.${method} is disabled project-wide. Use custom OTP edge functions instead.`
        ),
      });
    };
  });

  console.info("[AUTH_GUARD] Installed — blocked methods:", BLOCKED_AUTH_METHODS);
}

/**
 * Restores original methods (useful for tests or special admin flows).
 */
export function uninstallAuthGuard(): void {
  if (!guardInstalled) return;
  guardInstalled = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authAny = supabase.auth as unknown as Record<string, any>;

  BLOCKED_AUTH_METHODS.forEach((method) => {
    if (originals[method]) {
      authAny[method] = originals[method];
    }
  });

  console.info("[AUTH_GUARD] Uninstalled — original methods restored.");
}
