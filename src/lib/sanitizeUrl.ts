/**
 * Validate an absolute web destination before an automatic redirect or popup.
 * Reject executable schemes, ambiguous parsing and embedded credentials.
 * Returns null for an invalid destination.
 */
export function getSafeExternalUrl(url: string | null | undefined): string | null {
  if (typeof url !== "string" || /[\u0000-\u001f\u007f\\]/.test(url)) return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname || parsed.username || parsed.password) return null;
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** Safe href for a user-activated web, contact or supported social app link. */
export function sanitizeUrl(url: string | null | undefined): string {
  if (typeof url !== "string" || /[\u0000-\u001f\u007f\\]/.test(url)) return "#";
  const trimmed = url.trim();
  if (!trimmed) return "#";

  if (/^https?:/i.test(trimmed)) return getSafeExternalUrl(trimmed) ?? "#";

  // Allow safe protocols (incl. mobile app deep links)
  if (/^(mailto|tel|sms|instagram|fb|snssdk1128|intent):/i.test(trimmed)) {
    return trimmed;
  }

  // Block everything else (javascript:, data:, vbscript:, etc.)
  return "#";
}

/**
 * Validate a YouTube video ID to prevent iframe injection.
 * Valid IDs are exactly 11 characters of [a-zA-Z0-9_-].
 */
export function isValidYouTubeVideoId(videoId: string | null | undefined): boolean {
  if (!videoId) return false;
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}
