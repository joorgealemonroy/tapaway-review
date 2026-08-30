import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

interface MarkersProps {
  locations: BusinessLocation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/** Renders clustered markers and keeps the viewport fitted to the current filter. */
const Markers = ({ locations, selectedId, onSelect }: MarkersProps) => {
  const map = useMap();
  const clusterer = useRef<MarkerClusterer | null>(null);
  const [markers, setMarkers] = useState<Record<string, Marker>>({});

  useEffect(() => {
    if (!map || clusterer.current) return;
    clusterer.current = new MarkerClusterer({ map });
  }, [map]);

  useEffect(() => {
    if (!clusterer.current) return;
    clusterer.current.clearMarkers();
    clusterer.current.addMarkers(Object.values(markers));
  }, [markers]);

  const setRef = useCallback((id: string, marker: Marker | null) => {
    setMarkers((prev) => {
      if (marker && prev[id] === marker) return prev;
      if (!marker && !prev[id]) return prev;
      const next = { ...prev };
      if (marker) next[id] = marker;
      else delete next[id];
      return next;
    });
  }, []);

  // fitBounds whenever the filtered set changes so every visible pin is on screen.
  const boundsKey = locations.map((l) => l.id).join(",");
  useEffect(() => {
    if (!map || locations.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    locations.forEach((l) => bounds.extend({ lat: l.lat as number, lng: l.lng as number }));
    if (locations.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 64);
    }
  }, [map, boundsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = locations.find((l) => l.id === selectedId) ?? null;

  return (
    <>
      {locations.map((l) => (
        <AdvancedMarker
          key={l.id}
          position={{ lat: l.lat as number, lng: l.lng as number }}
          ref={(m) => setRef(l.id, m)}
          onClick={() => onSelect(l.id)}
          title={l.display_name ?? undefined}
        >
          <Pin tone={toneFor(l)} active={selectedId === l.id} />
        </AdvancedMarker>
      ))}
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

  // The Maps script reports auth/billing/referrer failures on this global hook only.
  useEffect(() => {
    const w = window as unknown as { gm_authFailure?: () => void };
    const prev = w.gm_authFailure;
    w.gm_authFailure = () => setFault("auth");
    return () => {
      w.gm_authFailure = prev;
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
      return (
        <MapError
          title="Google rejected this browser key (referrer, API or billing)"
          lines={[
            "The Maps JavaScript API loaded but refused to authorize the request. That is one of three things, in this order:",
            "1) HTTP referrer restriction — this origin is not on the key's allowed referrer list.",
            "2) API activation — Maps JavaScript API is not enabled on the key's Google Cloud project.",
            "3) Billing — billing is not active on that project, or the Map ID belongs to a different project.",
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

  return (
    <div className="space-y-3">
      <APIProvider apiKey={API_KEY} libraries={["marker"]}>
        <MapShell locations={mappable} />
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
