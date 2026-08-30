import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessLocation {
  id: string;
  business_id: string;
  hub_kind: "personal" | "restaurant" | "child_location";
  hub_slug: string | null;
  personal_profile_id: string | null;
  restaurant_id: string | null;
  display_name: string | null;
  formatted_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  google_place_id: string | null;
  place_status: string;
  hydration_status: string | null;
  hydration_error: string | null;
  hydration_attempted_at: string | null;
  lat: number | null;
  lng: number | null;
  coordinate_source: string | null;
  coordinates_obtained_at: string | null;
  coordinates_expires_at: string | null;
  access_status: "active" | "trial" | "expired" | "suspended" | "archived";
  payment_state:
    | "paying"
    | "complimentary"
    | "trialing"
    | "past_due"
    | "canceled"
    | "none"
    | "unknown_manual";
  billing_interval: string;
  billing_source: string;
  classification_is_manual: boolean;
  status_reason: string | null;
  trial_ends_at: string | null;
  subscription_status_snapshot: string | null;
  last_payment_at: string | null;
  current_billing_period_end: string | null;
  paid_through_at: string | null;
  payment_attention: boolean;
  last_visited_at: string | null;
  next_follow_up_at: string | null;
  internal_notes: string | null;
  visit_eligible: boolean;
  public_directory_opt_in: boolean;
  needs_review: boolean;
  review_reason: string | null;
  synced_at: string | null;
}

export interface ApiLogEntry {
  created_at: string;
  ok: boolean;
  endpoint: string;
  error: string | null;
}

export type StatusKey =
  | "active_paid"
  | "active_complimentary"
  | "active_unknown"
  | "trial"
  | "failed_trial"
  | "payment_attention"
  | "inactive"
  | "unmappable"
  | "follow_ups_due";

export const STATUS_LABELS: Record<StatusKey, string> = {
  active_paid: "Active Paid",
  active_complimentary: "Active Complimentary",
  active_unknown: "Active — Billing Unknown",
  trial: "Current Trials",
  failed_trial: "Failed Trials",
  payment_attention: "Payment Attention Required",
  inactive: "Inactive / Archived",
  unmappable: "Unmappable Locations",
  follow_ups_due: "Follow-ups Due",
};

const isActive = (l: BusinessLocation) => l.access_status === "active";

export const matchesStatus = (l: BusinessLocation, key: StatusKey): boolean => {
  switch (key) {
    case "active_paid":
      return isActive(l) && l.payment_state === "paying";
    case "active_complimentary":
      return isActive(l) && l.payment_state === "complimentary";
    case "active_unknown":
      return isActive(l) && l.payment_state === "unknown_manual";
    case "trial":
      return l.access_status === "trial";
    case "failed_trial":
      return l.access_status === "expired" && l.subscription_status_snapshot === "trialing";
    case "payment_attention":
      return l.payment_state === "past_due" || l.payment_attention;
    case "inactive":
      return l.access_status === "archived" || l.access_status === "suspended" ||
        (l.access_status === "expired" && l.subscription_status_snapshot !== "trialing");
    case "unmappable":
      return !l.google_place_id && !l.formatted_address;
    case "follow_ups_due":
      return !!l.next_follow_up_at && new Date(l.next_follow_up_at).getTime() <= Date.now();
    default:
      return false;
  }
};

export const badgeFor = (l: BusinessLocation): { label: string; tone: string } => {
  if (l.payment_state === "past_due" || l.payment_attention)
    return { label: "Payment attention", tone: "bg-orange-500/15 text-orange-300 border-orange-500/30" };
  if (l.access_status === "trial")
    return { label: "Trial", tone: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
  if (matchesStatus(l, "failed_trial"))
    return { label: "Failed trial", tone: "bg-red-500/15 text-red-300 border-red-500/30" };
  if (isActive(l) && l.payment_state === "paying")
    return { label: "Paid", tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
  if (isActive(l) && l.payment_state === "complimentary")
    return { label: "Complimentary", tone: "bg-violet-500/15 text-violet-300 border-violet-500/30" };
  if (isActive(l) && l.payment_state === "unknown_manual")
    return { label: "Billing unknown", tone: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  return { label: "Inactive", tone: "bg-white/10 text-white/60 border-white/15" };
};

const invoke = async <T,>(payload: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("locations-admin", { body: payload });
  if (error) {
    const details = "context" in error && error.context
      ? await (error.context as Response).text().catch(() => error.message)
      : error.message;
    throw new Error(details || error.message);
  }
  return data as T;
};

export interface HydrateRun {
  scanned: number;
  hydrated: number;
  invalid: number;
  failed: number;
  rateLimited: number;
  moved: number;
}

export interface MappingTotals {
  total: number;
  mapped: number;
  invalidPlaceIds: number;
  missingPlaceIds: number;
  failedRequests: number;
  stillUnmappable: number;
}

export const locationsApi = {
  classify: (payload: Record<string, unknown>) => invoke<{ ok: boolean }>({ action: "classify", ...payload }),
  updateOps: (payload: Record<string, unknown>) => invoke<{ ok: boolean }>({ action: "update_ops", ...payload }),
  logVisit: (payload: Record<string, unknown>) => invoke<{ ok: boolean }>({ action: "log_visit", ...payload }),
  sync: () => invoke<{ ok: boolean }>({ action: "sync" }),
  hydrate: (limit = 200) =>
    invoke<{ ok: boolean; run: HydrateRun; totals: MappingTotals }>({ action: "hydrate", limit }),
};

export function useLocationIntel(enabled = true) {
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [apiLog, setApiLog] = useState<ApiLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await invoke<{ locations: BusinessLocation[]; apiLog: ApiLogEntry[] }>({
        action: "list",
      });
      setLocations(res.locations ?? []);
      setApiLog(res.apiLog ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const resync = useCallback(async () => {
    setSyncing(true);
    try {
      await locationsApi.sync();
      await load();
    } finally {
      setSyncing(false);
    }
  }, [load]);

  const counts = useMemo(() => {
    const out = {} as Record<StatusKey, number>;
    (Object.keys(STATUS_LABELS) as StatusKey[]).forEach((k) => {
      out[k] = locations.filter((l) => matchesStatus(l, k)).length;
    });
    return out;
  }, [locations]);

  const lastSyncedAt = useMemo(() => {
    const times = locations
      .map((l) => l.synced_at)
      .filter(Boolean)
      .map((t) => new Date(t as string).getTime());
    return times.length ? new Date(Math.max(...times)).toISOString() : null;
  }, [locations]);

  const staleCoordinates = useMemo(
    () =>
      locations.filter(
        (l) =>
          !l.lat ||
          (l.coordinates_expires_at && new Date(l.coordinates_expires_at).getTime() < Date.now()),
      ).length,
    [locations],
  );

  const failedGoogleJobs = useMemo(() => apiLog.filter((e) => !e.ok).length, [apiLog]);

  const mapping: MappingTotals = useMemo(
    () => ({
      total: locations.length,
      mapped: locations.filter((l) => l.lat !== null).length,
      invalidPlaceIds: locations.filter((l) => l.place_status === "invalid").length,
      missingPlaceIds: locations.filter((l) => !l.google_place_id).length,
      failedRequests: locations.filter((l) => l.hydration_status === "failed").length,
      stillUnmappable: locations.filter((l) => l.lat === null).length,
    }),
    [locations],
  );

  const hydrate = useCallback(async () => {
    setHydrating(true);
    try {
      const res = await locationsApi.hydrate(300);
      setLastHydrateRun(res.run);
      await load();
      return res;
    } finally {
      setHydrating(false);
    }
  }, [load]);

  return {
    locations,
    apiLog,
    counts,
    loading,
    error,
    syncing,
    hydrating,
    hydrate,
    lastHydrateRun,
    mapping,
    reload: load,
    resync,
    lastSyncedAt,
    staleCoordinates,
    failedGoogleJobs,
  };
}
