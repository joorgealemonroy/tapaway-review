import { resolveLocation, type LocationSource } from "@/lib/resolveLocation";
import { resolveDisplayName } from "@/lib/displayName";

/**
 * Builds multi-stop Apple Maps driving-direction URLs from a list of hubs.
 *
 * Apple Maps accepts a chain of stops via `daddr=A+to:B+to:C`. We cap each leg
 * at 15 stops, order the whole selection by shortest driving path (greedy
 * nearest-neighbor + 2-opt cleanup over coordinates), and chain the legs so
 * leg N+1 starts where leg N ended — one continuous day of drop-offs.
 */

export const MAX_STOPS_PER_LEG = 15;

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
  /** Where this leg departs from (previous leg's final stop, if any). */
  originLabel: string | null;
}

export interface RoutePlan<T extends LocationSource = LocationSource> {
  legs: RouteLeg<T>[];
  chunked: boolean;
  totalStops: number;
  /** Stops with no coordinates — appended at the end, not distance-optimized. */
  unoptimizedCount: number;
  /** Optimized stop order (flat), matching the leg sequence. */
  ordered: T[];
}

const stopToken = (source: LocationSource): string => {
  const loc = resolveLocation(source);
  if (loc.lat !== null && loc.lng !== null) return `${loc.lat},${loc.lng}`;
  return loc.query;
};

const labelFor = (source: LocationSource): string =>
  resolveDisplayName({
    full_name: source.full_name ?? null,
    username: source.username ?? null,
  });

const coordsOf = (s: LocationSource): [number, number] | null => {
  const { lat, lng } = resolveLocation(s);
  return lat !== null && lng !== null ? [lat, lng] : null;
};

/** Squared euclidean distance on lat/lng, longitude scaled by latitude. */
const dist2 = (a: [number, number], b: [number, number]): number => {
  const scale = Math.cos(((a[0] + b[0]) / 2) * (Math.PI / 180));
  const dLat = a[0] - b[0];
  const dLng = (a[1] - b[1]) * scale;
  return dLat * dLat + dLng * dLng;
};

/**
 * Greedy nearest-neighbor from the westernmost stop, then a 2-opt pass to
 * remove path crossings. Stops without coordinates keep their relative order
 * and are appended at the end, grouped by city.
 */
export const optimizeStopOrder = <T extends LocationSource>(
  stops: T[]
): { ordered: T[]; unoptimizedCount: number } => {
  const withCoords: { stop: T; c: [number, number] }[] = [];
  const withoutCoords: T[] = [];

  stops.forEach((s) => {
    const c = coordsOf(s);
    if (c) withCoords.push({ stop: s, c });
    else withoutCoords.push(s);
  });

  // Nearest neighbor.
  const remaining = [...withCoords];
  const path: typeof withCoords = [];
  if (remaining.length > 0) {
    let currentIdx = remaining.reduce(
      (best, item, i) => (item.c[1] < remaining[best].c[1] ? i : best),
      0
    );
    path.push(remaining.splice(currentIdx, 1)[0]);
    while (remaining.length > 0) {
      const last = path[path.length - 1].c;
      currentIdx = remaining.reduce(
        (best, item, i) => (dist2(item.c, last) < dist2(remaining[best].c, last) ? i : best),
        0
      );
      path.push(remaining.splice(currentIdx, 1)[0]);
    }
  }

  // 2-opt cleanup (bounded passes so large selections stay snappy).
  const total = (p: typeof path) =>
    p.reduce((sum, item, i) => (i === 0 ? 0 : sum + Math.sqrt(dist2(item.c, p[i - 1].c))), 0);

  for (let pass = 0; pass < 4; pass++) {
    let improved = false;
    for (let i = 1; i < path.length - 1; i++) {
      for (let k = i + 1; k < path.length; k++) {
        const before = total(path);
        const candidate = [
          ...path.slice(0, i),
          ...path.slice(i, k + 1).reverse(),
          ...path.slice(k + 1),
        ];
        if (total(candidate) < before - 1e-12) {
          path.splice(0, path.length, ...candidate);
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  // Group the coordinate-less remainder by city so they at least cluster.
  const byCity = [...withoutCoords].sort((a, b) =>
    (a.place_city ?? "").localeCompare(b.place_city ?? "")
  );

  return {
    ordered: [...path.map((p) => p.stop), ...byCity],
    unoptimizedCount: byCity.length,
  };
};

const buildLegUrl = (chunk: LocationSource[], origin: LocationSource | null): string => {
  const params = new URLSearchParams({ dirflg: "d" });
  if (origin) params.set("saddr", stopToken(origin));
  params.set("daddr", chunk.map(stopToken).join(" to:"));
  return `https://maps.apple.com/?${params.toString()}`;
};

export const buildRoutePlan = <T extends LocationSource>(stops: T[]): RoutePlan<T> => {
  const valid = stops.filter((s) => stopToken(s).length > 0);
  const { ordered, unoptimizedCount } = optimizeStopOrder(valid);
  const legs: RouteLeg<T>[] = [];

  for (let i = 0; i < ordered.length; i += MAX_STOPS_PER_LEG) {
    const chunk = ordered.slice(i, i + MAX_STOPS_PER_LEG);
    if (chunk.length === 0) continue;
    const origin = i === 0 ? null : ordered[i - 1];
    legs.push({
      url: buildLegUrl(chunk, origin),
      stops: chunk,
      legNumber: legs.length + 1,
      startIndex: i + 1,
      endIndex: i + chunk.length,
      firstLabel: labelFor(chunk[0]),
      lastLabel: labelFor(chunk[chunk.length - 1]),
      originLabel: origin ? labelFor(origin) : null,
    });
  }

  return {
    legs,
    chunked: legs.length > 1,
    totalStops: ordered.length,
    unoptimizedCount,
    ordered,
  };
};
