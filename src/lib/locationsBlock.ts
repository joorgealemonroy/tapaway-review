import { sanitizeUrl } from "@/lib/sanitizeUrl";

export interface LocationEntry {
  /** Business / location name, e.g. "Las Islas Marias" */
  name: string;
  /** City or short location label, e.g. "Los Angeles, CA" */
  city?: string;
  /** Optional one-line subtitle */
  subtitle?: string;
  /** Image URL for the card */
  imageUrl?: string;
  /** Destination: an internal TapAway slug ("islasmarias" / "/islasmarias") or a full external URL */
  destination: string;
}

export interface LocationsBlockContent {
  title: string;
  subtitle: string;
  locations: LocationEntry[];
  ctaLabel: string;
}

export const DEFAULT_LOCATIONS_CTA = "View Location";

/** Parse a stored block content payload into a normalized shape. */
export function parseLocationsContent(raw: unknown): LocationsBlockContent {
  const content = (raw ?? {}) as Record<string, unknown>;

  let locations: LocationEntry[] = [];
  try {
    const rawLocations = content.locations;
    const parsed =
      typeof rawLocations === "string" ? JSON.parse(rawLocations) : rawLocations;
    if (Array.isArray(parsed)) {
      locations = parsed
        .map((item) => {
          const entry = (item ?? {}) as Record<string, unknown>;
          return {
            name: String(entry.name ?? "").trim(),
            city: String(entry.city ?? "").trim(),
            subtitle: String(entry.subtitle ?? "").trim(),
            imageUrl: String(entry.imageUrl ?? "").trim(),
            destination: String(entry.destination ?? "").trim(),
          } as LocationEntry;
        })
        .filter((entry) => entry.name.length > 0 || entry.destination.length > 0);
    }
  } catch {
    locations = [];
  }

  return {
    title: String(content.title ?? "").trim(),
    subtitle: String(content.subtitle ?? "").trim(),
    ctaLabel: String(content.ctaLabel ?? "").trim() || DEFAULT_LOCATIONS_CTA,
    locations,
  };
}

export function serializeLocationsContent(
  content: LocationsBlockContent
): Record<string, string> {
  return {
    title: content.title.trim(),
    subtitle: content.subtitle.trim(),
    ctaLabel: content.ctaLabel.trim() || DEFAULT_LOCATIONS_CTA,
    locations: JSON.stringify(
      content.locations.map((l) => ({
        name: l.name.trim(),
        city: (l.city ?? "").trim(),
        subtitle: (l.subtitle ?? "").trim(),
        imageUrl: (l.imageUrl ?? "").trim(),
        destination: (l.destination ?? "").trim(),
      }))
    ),
  };
}

export type LocationDestination =
  | { kind: "internal"; path: string }
  | { kind: "external"; href: string }
  | { kind: "none" };

const EXTERNAL_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Decide how a destination should be opened.
 * - A bare slug or "/slug" stays inside the app (React Router navigation).
 * - Anything with a protocol (or "www."/host-looking value) is treated as external.
 */
export function resolveLocationDestination(
  destination: string | undefined | null
): LocationDestination {
  const value = (destination ?? "").trim();
  if (!value) return { kind: "none" };

  const isAbsolute = EXTERNAL_PROTOCOL.test(value) || value.startsWith("//");
  const looksLikeHost = /^(www\.|[a-z0-9-]+\.[a-z]{2,})(\/|$)/i.test(value);

  if (isAbsolute || looksLikeHost) {
    const withProtocol = isAbsolute ? value : `https://${value}`;

    // Same-origin links to our own app should still route internally.
    try {
      const url = new URL(withProtocol, window.location.origin);
      if (
        (url.protocol === "http:" || url.protocol === "https:") &&
        url.host === window.location.host
      ) {
        return { kind: "internal", path: url.pathname + url.search };
      }
    } catch {
      /* fall through to external handling */
    }

    const safe = sanitizeUrl(withProtocol);
    return safe === "#" ? { kind: "none" } : { kind: "external", href: safe };
  }

  const slug = value.replace(/^\/+/, "").replace(/\s+/g, "");
  if (!slug) return { kind: "none" };
  return { kind: "internal", path: `/${slug}` };
}
