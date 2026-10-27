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

    authAny[method] = () => {
      console.error(
        `[AUTH_GUARD] Blocked supabase.auth.${method}(). These methods trigger default Lovable/Supabase emails.`,
        { ts: new Date().toISOString() }
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

  console.info("[AUTH_GUARD] Installed. Blocked methods:", BLOCKED_AUTH_METHODS);
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

  console.info("[AUTH_GUARD] Uninstalled. Original methods restored.");
}

/**
 * Exchanges a server-issued one-time token hash for a session. Verifying a
 * token hash never sends an email, so it is allowed through the guard.
 */
export function verifyTokenHash(tokenHash: string, type: "email" | "magiclink" | "recovery" = "email") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (originals.verifyOtp ?? (supabase.auth as any).verifyOtp) as (args: { token_hash: string; type: string }) => Promise<{ error: Error | null }>;
  return fn.call(supabase.auth, { token_hash: tokenHash, type });
}
