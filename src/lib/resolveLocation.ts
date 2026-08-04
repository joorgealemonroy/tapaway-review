/**
 * Resolves the best available physical location for a hub profile so admins
 * can build in-person drop-off routes.
 */

export interface LocationSource {
  full_name?: string | null;
  username?: string | null;
  google_place_id?: string | null;
  formatted_address?: string | null;
  contact_address?: string | null;
  place_city?: string | null;
  place_state?: string | null;
  place_zip?: string | null;
  place_lat?: number | null;
  place_lng?: number | null;
}

export interface ResolvedLocation {
  /** Best available search string for Apple/Google Maps. */
  query: string;
  /** Google Place ID when known. */
  placeId: string | null;
  /** Latitude / longitude when known. */
  lat: number | null;
  lng: number | null;
  /** Direct Apple Maps pin link. */
  mapsUrl: string;
  /** "exact" when a place id or street address is known, otherwise "fallback". */
  quality: "exact" | "fallback";
  /** Human label for the badge shown in the print queue. */
  label: string;
}

const clean = (v?: string | null) => (typeof v === "string" ? v.trim() : "");

const num = (v?: number | null): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export const resolveLocation = (source: LocationSource): ResolvedLocation => {
  const placeId = clean(source.google_place_id) || null;
  const address = clean(source.formatted_address) || clean(source.contact_address);
  const lat = num(source.place_lat);
  const lng = num(source.place_lng);

  const nameParts = [
    clean(source.full_name) || clean(source.username),
    clean(source.place_city),
    clean(source.place_state),
  ].filter(Boolean);

  const query = address || nameParts.join(" ") || clean(source.username) || "";

  // Apple Maps pin: coordinates when we have them, otherwise a text query.
  const mapsUrl =
    lat !== null && lng !== null
      ? `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(
          clean(source.full_name) || clean(source.username) || query
        )}`
      : `https://maps.apple.com/?q=${encodeURIComponent(query)}`;

  const quality: "exact" | "fallback" =
    (lat !== null && lng !== null) || placeId || address ? "exact" : "fallback";

  return {
    query,
    placeId,
    lat,
    lng,
    mapsUrl,
    quality,
    label:
      lat !== null && lng !== null
        ? "Coordinates on file"
        : placeId
        ? "Place ID attached"
        : address
        ? "Address on file"
        : "Address needed",
  };
};
