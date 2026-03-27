/**
 * Subscription status helpers - single source of truth for gating logic.
 */

/** Statuses that allow full access (trial or paid). */
const ALLOWED_STATUSES = new Set([
  'active',
  'trialing',
  'pending_payment',
  'pending_setup',
]);

/** Statuses that require paywall intervention. */
const BLOCKED_STATUSES = new Set([
  'canceled',
  'incomplete_expired',
  'unpaid',
  'past_due',
]);

/** Routes that should NEVER redirect to /paywall. */
export const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/start',
  '/paywall',
  '/onboarding-start',
  '/onboarding/start',
  '/terms',
  '/privacy',
  '/refund',
  '/support',
  '/rep/apply',
  '/rep/setup-password',
  '/demo',
  '/personal/signup',
  '/personal/signup/complete',
  '/personal/pricing',
  '/affiliate',
];

/** Check if a subscription status grants access (true = allowed). */
export function isSubscriptionAllowed(status: string | null | undefined): boolean {
  if (!status) return false;
  return ALLOWED_STATUSES.has(status);
}

/** Check if a subscription status is explicitly blocked (true = blocked). */
export function isSubscriptionBlocked(status: string | null | undefined): boolean {
  if (!status) return true; // no status = blocked
  return BLOCKED_STATUSES.has(status);
}

/** Check if path is a public route that bypasses paywall checks. */
export function isPublicRoute(pathname: string): boolean {
  // Exact match or prefix match for dynamic routes
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}?`) || pathname.startsWith(`${route}/`)
  );
}

/** Check localStorage flags that indicate user is mid-setup. */
export function hasPendingSetupFlags(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    localStorage.getItem('tapaway_pending_setup') === 'true' ||
    localStorage.getItem('tapaway_pending_trial') === 'true' ||
    localStorage.getItem('tapaway_trial_intent') === 'true'
  );
}
