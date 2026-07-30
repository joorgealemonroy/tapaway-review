/**
 * Detects legacy "recursive" social links produced by the old scheme-less URL
 * parsing bug, e.g. `https://facebook.com/facebook.com`.
 *
 * Detection only — nothing here mutates or deletes data. Affected links are
 * surfaced in the rep, personal and admin dashboards so a human can re-enter
 * the correct page name.
 */

export interface BrokenLinkCandidate {
  id?: string;
  link_type?: string | null;
  type?: string | null;
  label?: string | null;
  url?: string | null;
}

/** Hosts that indicate the saved "handle" is really just the platform domain. */
const PLATFORM_DOMAIN_RE =
  /^(?:www\.)?(?:facebook|fb|instagram|tiktok|twitter|x|threads|linkedin|discord|twitch|snapchat|pinterest|telegram|venmo|yelp|t)\.(?:com|net|tv|gg|me)$/i;

/** Platform link types we validate (free-form custom/website links are skipped). */
const CHECKED_TYPES = new Set([
  "facebook",
  "instagram",
  "tiktok",
  "x",
  "twitter",
  "threads",
  "linkedin",
  "discord",
  "twitch",
  "snapchat",
  "pinterest",
  "telegram",
  "venmo",
  "yelp",
]);

/**
 * Path prefixes that were permanently truncated by the old single-segment
 * parser (facebook.com/people/… → facebook.com/people). A URL whose whole path
 * is just one of these is unusable and needs manual re-entry.
 */
const TRUNCATED_SEGMENTS = new Set([
  "people",
  "pages",
  "p",
  "profile.php",
  "company",
  "in",
  "biz",
]);

const pathParts = (url: string): string[] => {
  const withoutScheme = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const path = withoutScheme.split(/[?#]/)[0];
  return path.split("/").filter(Boolean);
};

const lastSegment = (url: string): string => {
  const parts = pathParts(url);
  return parts.length > 1 ? parts[parts.length - 1] : "";
};

/**
 * True when a platform link's path segment is the platform's own domain
 * (the `facebook.com/facebook.com` signature), the path was truncated to a
 * bare prefix like `/people`, or the URL is missing entirely.
 */
export const isBrokenPlatformUrl = (link: BrokenLinkCandidate | null | undefined): boolean => {
  if (!link) return false;
  const type = String(link.link_type || link.type || "").toLowerCase();
  if (!CHECKED_TYPES.has(type)) return false;

  const url = (link.url || "").trim();
  if (!url) return true;

  if (PLATFORM_DOMAIN_RE.test(lastSegment(url))) return true;

  // Host + exactly one path segment that is only a prefix keyword.
  const parts = pathParts(url);
  const handle = parts.length > 1 ? parts.slice(1).join("/") : "";
  return TRUNCATED_SEGMENTS.has(handle.toLowerCase());
};


/** Returns only the broken links from a list. */
export const getBrokenLinks = <T extends BrokenLinkCandidate>(links: T[] | null | undefined): T[] =>
  (links || []).filter((l) => isBrokenPlatformUrl(l));

/** Convenience: does this list contain any broken platform link? */
export const hasBrokenLinks = (links: BrokenLinkCandidate[] | null | undefined): boolean =>
  (links || []).some((l) => isBrokenPlatformUrl(l));

export const BROKEN_LINK_TOOLTIP = "This link is broken — re-enter your page name";
