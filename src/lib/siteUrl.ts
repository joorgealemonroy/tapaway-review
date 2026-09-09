/**
 * Canonical public site URL.
 * Always tapaway.co — never window.location.origin, which can be a
 * lovable.app preview host. Client-facing links (SMS, emails, claim links,
 * hub links) must never expose Lovable.
 */
export const TAPAWAY_SITE_URL = "https://tapaway.co";

/** Build an absolute tapaway.co URL from a path. */
export const tapawayUrl = (path: string): string =>
  `${TAPAWAY_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
