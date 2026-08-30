import { Component, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map,
  useApiIsLoaded,
  useMap,
} from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { Marker } from "@googlemaps/markerclusterer";
import { AlertTriangle, ExternalLink, MapPin, Navigation, Route, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessLocation, badgeFor } from "@/hooks/useLocationIntel";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
/** Real vector Map ID from the project — required for AdvancedMarker rendering. */
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;

export type MarkerTone =
  | "paid"
  | "complimentary"
  | "trial"
  | "attention"
  | "failed"
  | "inactive"
  | "unknown";

const TONE_COLOR: Record<MarkerTone, string> = {
  paid: "#15803d",
  complimentary: "#8b5cf6",
  trial: "#3b82f6",
  attention: "#f97316",
  failed: "#ef4444",
  inactive: "#9ca3af",
  unknown: "#64748b",
};

export const LEGEND: Array<{ tone: MarkerTone; label: string }> = [
  { tone: "paid", label: "Active paid" },
  { tone: "complimentary", label: "Active complimentary" },
  { tone: "trial", label: "Trial" },
  { tone: "attention", label: "Payment attention" },
  { tone: "failed", label: "Failed trial / expired" },
  { tone: "inactive", label: "Inactive / archived" },
  { tone: "unknown", label: "Billing unknown" },
];

export const toneFor = (l: BusinessLocation): MarkerTone => {
  if (l.payment_state === "past_due" || l.payment_attention) return "attention";
  if (l.access_status === "trial") return "trial";
  if (l.access_status === "expired" && l.subscription_status_snapshot === "trialing") return "failed";
  if (l.access_status === "active" && l.payment_state === "paying") return "paid";
  if (l.access_status === "active" && l.payment_state === "complimentary") return "complimentary";
  if (l.access_status === "active" && l.payment_state === "unknown_manual") return "unknown";
  return "inactive";
};

const Pin = ({ tone, active }: { tone: MarkerTone; active: boolean }) => (
  <div
    className="rounded-full border-2 shadow-md transition"
    style={{
      width: active ? 20 : 14,
      height: active ? 20 : 14,
      background: tone === "unknown" ? "transparent" : TONE_COLOR[tone],
      borderColor: TONE_COLOR[tone],
      boxShadow: active ? `0 0 0 6px ${TONE_COLOR[tone]}33` : undefined,
    }}
  />
);

/**
 * Advanced markers may only be constructed once the map reports the capability.
 * Deliberately NOT gated on getRenderingType() === VECTOR: advanced markers are
 * supported on raster maps too, and gating on render type would hide valid pins.
 * Capabilities are asynchronous, so we subscribe until they initialise.
 */
const useAdvancedMarkersReady = (): { ready: boolean; settled: boolean } => {
  const map = useMap();
  const [ready, setReady] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    const read = () => {
      if (cancelled) return;
      let available = false;
      try {
        available = map.getMapCapabilities?.().isAdvancedMarkersAvailable === true;
      } catch {
        available = false;
      }
      setReady(available);
      if (available) setSettled(true);
    };
    read();
    const listener = map.addListener("mapcapabilities_changed", read);
    // If capabilities never turn on, stop waiting so a diagnostic can be shown.
    const timer = setTimeout(() => {
      if (!cancelled) setSettled(true);
    }, 10000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      listener.remove();
      window.clearTimeout(timer);
    };
  }, [map]);

  return { ready, settled };
};

/**
 * Flood protection: a failing marker library used to throw once per marker
 * (137 identical reports). This reports at most one occurrence per mount.
 */
class MarkerBoundary extends Component<
  { children: ReactNode; onFail: (message: string) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onFail(error?.message ?? "Marker rendering failed");
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface MarkersProps {
  locations: BusinessLocation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCapabilityIssue: (issue: string | null) => void;
}

/** Renders clustered markers and keeps the viewport fitted to the current filter. */
const Markers = ({ locations, selectedId, onSelect, onCapabilityIssue }: MarkersProps) => {
  const map = useMap();
  const clusterer = useRef<MarkerClusterer | null>(null);
  // Marker instances never affect rendered output, so they live in a ref.
  const markersRef = useRef<globalThis.Map<string, Marker>>(new globalThis.Map());
  // One stable callback per id — a new function identity per render would make
  // React detach/reattach every ref on every render.
  const refCallbacks = useRef<globalThis.Map<string, (m: Marker | null) => void>>(
    new globalThis.Map(),
  );

  useEffect(() => {
    if (!map) return;
    const c = new MarkerClusterer({ map });
    clusterer.current = c;
    // Refs can attach before this effect runs; seed whatever is already stored.
    const existing = Array.from(markersRef.current.values());
    if (existing.length) c.addMarkers(existing, true);
    c.render();
    return () => {
      clusterer.current = null;
      c.clearMarkers(true);
      c.setMap(null);
    };
  }, [map]);

  const getRef = useCallback((id: string) => {
    let cb = refCallbacks.current.get(id);
    if (!cb) {
      cb = (marker: Marker | null) => {
        const store = markersRef.current;
        const prev = store.get(id);
        if (marker) {
          if (prev === marker) return;
          if (prev) clusterer.current?.removeMarker(prev, true);
          store.set(id, marker);
          clusterer.current?.addMarker(marker, true);
        } else {
          if (!prev) return;
          store.delete(id);
          clusterer.current?.removeMarker(prev, true);
        }
        clusterer.current?.render();
      };
      refCallbacks.current.set(id, cb);
    }
    return cb;
  }, []);

  // Drop cached callbacks for ids that are no longer rendered.
  useEffect(() => {
    const live = new Set(locations.map((l) => l.id));
    refCallbacks.current.forEach((_, id) => {
      if (!live.has(id)) refCallbacks.current.delete(id);
    });
  }, [locations]);

  // fitBounds runs only when the actual set of pins changes, never in response
  // to a camera/bounds event (which would re-trigger itself).
  const signature = useMemo(
    () =>
      locations
        .map((l) => `${l.id}:${(l.lat as number).toFixed(5)},${(l.lng as number).toFixed(5)}`)
        .join("|"),
    [locations],
  );
  const lastFitted = useRef<string | null>(null);

  useEffect(() => {
    if (!map || !signature) return;
    if (lastFitted.current === signature) return;
    lastFitted.current = signature;
    const bounds = new google.maps.LatLngBounds();
    locations.forEach((l) => bounds.extend({ lat: l.lat as number, lng: l.lng as number }));
    if (locations.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 64);
    }
  }, [map, signature]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = locations.find((l) => l.id === selectedId) ?? null;

  const { ready, settled } = useAdvancedMarkersReady();
  const [markerFault, setMarkerFault] = useState<string | null>(null);

  useEffect(() => {
    if (markerFault) {
      onCapabilityIssue(`Marker rendering failed: ${markerFault}`);
    } else if (settled && !ready) {
      onCapabilityIssue(
        "The map reports isAdvancedMarkersAvailable = false, so no pins can be created. " +
          "That capability requires a Map ID that is accepted for this origin and key — " +
          `confirm VITE_GOOGLE_MAPS_MAP_ID (${MAP_ID ?? "not set"}) belongs to the same Google Cloud project as the browser key and that this origin is on the key's referrer list.`,
      );
    } else {
      onCapabilityIssue(null);
    }
  }, [ready, settled, markerFault, onCapabilityIssue]);

  return (
    <>
      {ready && !markerFault && (
        <MarkerBoundary onFail={setMarkerFault}>
          {locations.map((l) => (
            <AdvancedMarker
              key={l.id}
              position={{ lat: l.lat as number, lng: l.lng as number }}
              ref={getRef(l.id)}
              onClick={() => onSelect(l.id)}
              title={l.display_name ?? undefined}
            >
              <Pin tone={toneFor(l)} active={selectedId === l.id} />
            </AdvancedMarker>
          ))}
        </MarkerBoundary>
      )}
      {selected && (
        <InfoWindow
          position={{ lat: selected.lat as number, lng: selected.lng as number }}
          onCloseClick={() => onSelect(null)}
          headerDisabled
        >
          <LocationCard location={selected} onClose={() => onSelect(null)} />
        </InfoWindow>
      )}
    </>
  );
};

const LocationCard = ({
  location,
  onClose,
}: {
  location: BusinessLocation;
  onClose: () => void;
}) => {
  const badge = badgeFor(location);
  const dateLine =
    location.access_status === "trial" && location.trial_ends_at
      ? `Trial ends ${new Date(location.trial_ends_at).toLocaleDateString()}`
      : location.paid_through_at
        ? `Paid through ${new Date(location.paid_through_at).toLocaleDateString()}`
        : null;
  const directions = location.google_place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location.formatted_address ?? location.display_name ?? "",
      )}&query_place_id=${location.google_place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;

  return (
    <div className="min-w-[240px] max-w-[280px] space-y-2 p-1 text-slate-900">
      <div>
        <div className="text-sm font-semibold leading-tight">{location.display_name ?? "Unnamed"}</div>
        {location.hub_slug && <div className="font-mono text-xs text-slate-500">/{location.hub_slug}</div>}
      </div>
      {location.formatted_address && (
        <div className="text-xs text-slate-600">{location.formatted_address}</div>
      )}
      <div className="flex flex-wrap gap-1 text-[11px]">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
          {badge.label}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
          {location.access_status}
        </span>
      </div>
      {dateLine && <div className="text-xs text-slate-500">{dateLine}</div>}
      <div className="grid grid-cols-2 gap-1 pt-1">
        <a
          className="flex items-center justify-center gap-1 rounded-md bg-slate-900 px-2 py-1.5 text-[11px] font-medium text-white"
          href={`https://tapaway.co/${location.hub_slug ?? ""}`}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="h-3 w-3" /> Open Hub
        </a>
        <a
          className="flex items-center justify-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-[11px] font-medium"
          href={`/dashboard?admin_view=${location.personal_profile_id ?? location.restaurant_id ?? ""}`}
          target="_blank"
          rel="noreferrer"
        >
          Dashboard
        </a>
        <a
          className="flex items-center justify-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-[11px] font-medium"
          href={directions}
          target="_blank"
          rel="noreferrer"
        >
          <Navigation className="h-3 w-3" /> Directions
        </a>
        <button
          className="flex items-center justify-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-[11px] font-medium"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("tapaway:add-to-route", { detail: { id: location.id } }),
            );
            onClose();
          }}
        >
          <Route className="h-3 w-3" /> Add to Route
        </button>
        <button
          className="col-span-2 flex items-center justify-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-[11px] font-medium"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("tapaway:record-visit", { detail: { id: location.id } }),
            );
            onClose();
          }}
        >
          <Stamp className="h-3 w-3" /> Record Visit
        </button>
      </div>
    </div>
  );
};

type MapFault = "auth" | "script" | "init" | null;

const MapShell = ({
  locations,
  scriptError,
}: {
  locations: BusinessLocation[];
  scriptError: boolean;
}) => {
  const loaded = useApiIsLoaded();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fault, setFault] = useState<MapFault>(null);
  const [gmCode, setGmCode] = useState<string | null>(null);

  // The Maps script reports auth/billing/referrer failures on this global hook only.
  useEffect(() => {
    const w = window as unknown as { gm_authFailure?: () => void };
    const prev = w.gm_authFailure;
    w.gm_authFailure = () => setFault((f) => (f === "auth" ? f : "auth"));

    // Google names the precise cause (ApiTargetBlockedMapError,
    // RefererNotAllowedMapError, BillingNotEnabledMapError, …) in the message it
    // emits. Listen passively — unrelated errors are ignored, not consumed — and
    // stay installed until a Maps error actually matches.
    const onError = (e: ErrorEvent) => {
      const text = `${e.message ?? ""} ${String(e.error ?? "")}`;
      const match = text.match(/Google Maps JavaScript API error:\s*([A-Za-z]+)/);
      if (!match) return;
      const code = match[1];
      setGmCode((c) => (c === code ? c : code));
      setFault((f) => f ?? "auth");
    };
    window.addEventListener("error", onError);

    return () => {
      w.gm_authFailure = prev;
      window.removeEventListener("error", onError);
    };
  }, []);


  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setFault((f) => f ?? (loaded ? null : "init")), 12000);
    return () => clearTimeout(t);
  }, [loaded]);

  const effectiveFault: MapFault = scriptError ? "script" : fault;

  if (effectiveFault) {
    const common = `Origin: ${window.location.origin} · Map ID: ${MAP_ID}`;
    if (effectiveFault === "auth") {
      const CAUSE: Record<string, string> = {
        ApiTargetBlockedMapError:
          "API restriction — the browser key's \"Restrict key\" API list does not include Maps JavaScript API. Add it (and Maps Static/Places if used) in Google Cloud Console → Credentials.",
        RefererNotAllowedMapError:
          "Referrer restriction — this origin is not on the key's allowed HTTP referrer list. Add both the root and wildcard patterns for it.",
        BillingNotEnabledMapError:
          "Billing — billing is not enabled on the Google Cloud project that owns this key.",
        ApiNotActivatedMapError:
          "API activation — Maps JavaScript API is not enabled on the key's Google Cloud project.",
        InvalidKeyMapError: "The browser key value is not valid for this project.",
        ExpiredKeyMapError: "The browser key has expired and must be regenerated.",
      };
      return (
        <MapError
          title="Google rejected this browser key"
          lines={[
            gmCode
              ? `Google reported ${gmCode}.`
              : "The Maps JavaScript API loaded but refused to authorize the request.",
            gmCode && CAUSE[gmCode]
              ? CAUSE[gmCode]
              : "Check, in order: the key's HTTP referrer list, whether Maps JavaScript API is enabled/allowed on the key, and whether billing is active on that project.",
            "Also confirm the Map ID is a vector Map ID in the same project as the key.",
            common,
          ]}
        />
      );
    }
    if (effectiveFault === "script") {
      return (
        <MapError
          title="The Maps JavaScript script failed to load"
          lines={[
            "The browser could not fetch or execute the Maps JavaScript API script. This is a network, CSP or blocked-request failure rather than a key problem.",
            common,
          ]}
        />
      );
    }
    return (
      <MapError
        title="The map failed to initialize"
        lines={[
          "The Maps script did not finish initializing within 12 seconds. Check the browser console for a Google Maps error, and confirm the Map ID is a vector Map ID in the same project as the browser key.",
          common,
        ]}
      />
    );
  }

  return (
    <div className="relative h-[55vh] w-full overflow-hidden rounded-xl border border-white/10 md:h-[560px]">
      <Map
        mapId={MAP_ID}
        defaultCenter={{ lat: 34.05, lng: -118.24 }}
        defaultZoom={9}
        gestureHandling="greedy"
        disableDefaultUI={false}
        fullscreenControl
        zoomControl
        clickableIcons={false}
      >
        <Markers locations={locations} selectedId={selectedId} onSelect={setSelectedId} />
      </Map>
      {locations.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-slate-900/85 px-4 py-2 text-xs text-white">
          No mapped locations in this view — run Hydrate Place IDs or clear the filter.
        </div>
      )}
    </div>
  );
};

const MapError = ({ title, lines }: { title: string; lines: string[] }) => (
  <div className="flex h-[55vh] w-full flex-col items-center justify-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/[0.06] p-6 text-center md:h-[560px]">
    <AlertTriangle className="h-6 w-6 text-orange-400" />
    <div className="text-sm font-semibold text-orange-200">{title}</div>
    <div className="max-w-xl space-y-1 text-xs text-orange-100/70">
      {lines.map((l) => (
        <p key={l}>{l}</p>
      ))}
    </div>
  </div>
);

export const LocationsMap = ({ locations }: { locations: BusinessLocation[] }) => {
  const [scriptError, setScriptError] = useState(false);
  const mappable = useMemo(
    () => locations.filter((l) => typeof l.lat === "number" && typeof l.lng === "number"),
    [locations],
  );

  if (!API_KEY) {
    return (
      <MapError
        title="Google Maps browser key is missing"
        lines={[
          "VITE_GOOGLE_MAPS_API_KEY is not set for this build, so the Maps JavaScript API cannot be loaded.",
          "Add the browser key to the project environment and reload this page.",
        ]}
      />
    );
  }

  if (!MAP_ID) {
    return (
      <MapError
        title="Google Maps Map ID is missing"
        lines={[
          "VITE_GOOGLE_MAPS_MAP_ID is not set for this build. Advanced markers require a vector Map ID from the same Google Cloud project as the browser key.",
          "Add the Map ID to the project environment and reload this page.",
        ]}
      />
    );
  }

  return (
    <div className="space-y-3">
      <APIProvider
        apiKey={API_KEY}
        libraries={["marker"]}
        onError={() => setScriptError(true)}
      >
        <MapShell locations={mappable} scriptError={scriptError} />
      </APIProvider>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-white/50">
        <span className="flex items-center gap-1.5 text-white/40">
          <MapPin className="h-3.5 w-3.5" /> {mappable.length} of {locations.length} shown on map
        </span>
        {LEGEND.map((l) => (
          <span key={l.tone} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border-2"
              style={{
                background: l.tone === "unknown" ? "transparent" : TONE_COLOR[l.tone],
                borderColor: TONE_COLOR[l.tone],
              }}
            />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LocationsMap;
