import { resolveLocation, type LocationSource } from "@/lib/resolveLocation";

/**
 * Builds multi-stop Google Maps driving-direction URLs from a list of hubs.
 * Google's web directions URL supports roughly 10-15 waypoints, so longer
 * selections are chunked into multiple "legs".
 */

export const MAX_STOPS_PER_LEG = 15;

export interface RouteLeg {
  url: string;
  stops: number;
}

export interface RoutePlan {
  legs: RouteLeg[];
  chunked: boolean;
  totalStops: number;
}

/** Google accepts either a raw address string or "place_id:<id>" tokens. */
const stopToken = (source: LocationSource): string => {
  const { query } = resolveLocation(source);
  return query;
};

const stopPlaceId = (source: LocationSource): string | null =>
  resolveLocation(source).placeId;

const buildLegUrl = (chunk: LocationSource[]): string => {
  const destination = chunk[chunk.length - 1];
  const waypoints = chunk.slice(0, -1);

  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    destination: stopToken(destination),
  });

  const destinationPlaceId = stopPlaceId(destination);
  if (destinationPlaceId) params.set("destination_place_id", destinationPlaceId);

  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.map(stopToken).join("|"));
    const waypointPlaceIds = waypoints.map((w) => stopPlaceId(w) ?? "");
    if (waypointPlaceIds.some(Boolean)) {
      params.set("waypoint_place_ids", waypointPlaceIds.join("|"));
    }
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export const buildRoutePlan = (stops: LocationSource[]): RoutePlan => {
  const valid = stops.filter((s) => stopToken(s).length > 0);
  const legs: RouteLeg[] = [];

  for (let i = 0; i < valid.length; i += MAX_STOPS_PER_LEG) {
    const chunk = valid.slice(i, i + MAX_STOPS_PER_LEG);
    if (chunk.length === 0) continue;
    legs.push({ url: buildLegUrl(chunk), stops: chunk.length });
  }

  return {
    legs,
    chunked: legs.length > 1,
    totalStops: valid.length,
  };
};
