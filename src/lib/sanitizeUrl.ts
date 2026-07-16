/**
 * Sanitize a URL to prevent javascript:, data:, vbscript: injection.
 * Only allows safe protocols: http, https, mailto, tel, sms.
 * Also allows instagram:// deep links used by the platform.
 * Returns "#" for any unsafe URL.
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (!trimmed) return "#";

  // Allow safe protocols (incl. mobile app deep links)
  if (/^(https?|mailto|tel|sms|instagram|fb|snssdk1128|intent):\/?\/?/i.test(trimmed)) {
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
