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
}

export interface ResolvedLocation {
  /** Best available search string for Google Maps. */
  query: string;
  /** Google Place ID when known. */
  placeId: string | null;
  /** Direct Google Maps pin link. */
  mapsUrl: string;
  /** "exact" when a place id or street address is known, otherwise "fallback". */
  quality: "exact" | "fallback";
  /** Human label for the badge shown in the print queue. */
  label: string;
}

const clean = (v?: string | null) => (typeof v === "string" ? v.trim() : "");

export const resolveLocation = (source: LocationSource): ResolvedLocation => {
  const placeId = clean(source.google_place_id) || null;
  const address = clean(source.formatted_address) || clean(source.contact_address);

  const nameParts = [
    clean(source.full_name) || clean(source.username),
    clean(source.place_city),
    clean(source.place_state),
  ].filter(Boolean);

  const query = address || nameParts.join(" ") || clean(source.username) || "";

  const params = new URLSearchParams({ api: "1", query });
  if (placeId) params.set("query_place_id", placeId);

  const quality: "exact" | "fallback" = placeId || address ? "exact" : "fallback";

  return {
    query,
    placeId,
    mapsUrl: `https://www.google.com/maps/search/?${params.toString()}`,
    quality,
    label: placeId ? "Place ID attached" : address ? "Address on file" : "Address needed",
  };
};
