/**
 * Normalizes a Google Place ID input.
 * Accepts either:
 * - A full URL like "https://search.google.com/local/writereview?placeid=ChIJ..."
 * - A bare Place ID like "ChIJV_SjbZJMw4ARZINlm2uAaoE"
 * 
 * Returns the bare Place ID string, or null if input is empty/invalid.
 */
export function normalizeGooglePlaceId(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Case 1: Full URL with placeid parameter
  const match = trimmed.match(/[?&]placeid=([^&]+)/i);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }

  // Case 2: Already a bare Place ID (not a URL)
  // Google Place IDs typically start with "ChIJ" and are alphanumeric with underscores/hyphens
  if (!trimmed.includes('/') && !trimmed.includes('?')) {
    return trimmed;
  }

  // Case 3: Some other URL format we don't recognize - return null
  return null;
}

/**
 * Builds a canonical Google Review URL from a Place ID.
 */
export function buildGoogleReviewUrl(placeId: string | null | undefined): string | null {
  if (!placeId) return null;
  const normalized = normalizeGooglePlaceId(placeId);
  if (!normalized) return null;
  return `https://search.google.com/local/writereview?placeid=${normalized}`;
}
