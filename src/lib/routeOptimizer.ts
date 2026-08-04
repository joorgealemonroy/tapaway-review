import { resolveLocation, type LocationSource } from "@/lib/resolveLocation";
import { resolveDisplayName } from "@/lib/displayName";

/**
 * Builds multi-stop Google Maps driving-direction URLs from a list of hubs.
 * Google's web directions URL accepts at most 9 intermediate waypoints plus a
 * destination, so longer selections are chunked into multiple "legs".
 */

export const MAX_STOPS_PER_LEG = 10;

export interface RouteLeg<T extends LocationSource = LocationSource> {
  url: string;
  /** Hubs included in this leg, in stop order. */
  stops: T[];
  /** 1-based leg counter. */
  legNumber: number;
  /** 1-based global stop range covered by this leg. */
  startIndex: number;
  endIndex: number;
  firstLabel: string;
  lastLabel: string;
}

export interface RoutePlan<T extends LocationSource = LocationSource> {
  legs: RouteLeg<T>[];
  chunked: boolean;
  totalStops: number;
}

/** Google accepts either a raw address string or "place_id:<id>" tokens. */
const stopToken = (source: LocationSource): string => resolveLocation(source).query;

const stopPlaceId = (source: LocationSource): string | null =>
  resolveLocation(source).placeId;

const labelFor = (source: LocationSource): string =>
  resolveDisplayName({
    full_name: source.full_name ?? null,
    username: source.username ?? null,
  });

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

export const buildRoutePlan = <T extends LocationSource>(stops: T[]): RoutePlan<T> => {
  const valid = stops.filter((s) => stopToken(s).length > 0);
  const legs: RouteLeg<T>[] = [];

  for (let i = 0; i < valid.length; i += MAX_STOPS_PER_LEG) {
    const chunk = valid.slice(i, i + MAX_STOPS_PER_LEG);
    if (chunk.length === 0) continue;
    legs.push({
      url: buildLegUrl(chunk),
      stops: chunk,
      legNumber: legs.length + 1,
      startIndex: i + 1,
      endIndex: i + chunk.length,
      firstLabel: labelFor(chunk[0]),
      lastLabel: labelFor(chunk[chunk.length - 1]),
    });
  }

  return {
    legs,
    chunked: legs.length > 1,
    totalStops: valid.length,
  };
};
