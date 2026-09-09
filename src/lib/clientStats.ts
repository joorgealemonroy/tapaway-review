/**
 * Client-facing stats data layer for the TapAway client dashboard.
 *
 * FRAMING RULE (owner decision 2026-09-09): these helpers return RAW numbers and
 * trends only — never any judgment about whether the numbers are "good" or "bad".
 * The dashboard UI owns the framing (e.g. showing progress / momentum language).
 * The `hasMeaningfulTraffic` boolean exists so the UI can choose an encouraging
 * "early days" empty state instead of rendering a near-empty chart.
 *
 * All queries read the caller's own analytics_events rows, so they are RLS-safe
 * for a restaurant owner viewing their own hub. Admins can read any rows.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Minimum taps in the last 30 days for a hub to be considered established. */
export const MEANINGFUL_TRAFFIC_TAPS_30D = 10;

/** Aggregate tap counts for one client hub. Weeks are rolling 7-day windows. */
export interface ClientTapStats {
  /** Taps in the last 7 days. */
  tapsThisWeek: number;
  /** Taps in the 7 days before that. */
  tapsLastWeek: number;
  /**
   * Percent change this week vs last week, or null when last week had zero
   * taps (there is no baseline to compare against). The UI should frame null
   * as "not enough history yet", not as a bad trend.
   */
  trendPct: number | null;
  /** Taps in the last 30 days. */
  tapsLast30d: number;
  /** All-time taps. */
  totalTaps: number;
  /**
   * False when the hub has very few taps — the UI should show an encouraging
   * "early days" state instead of a near-empty chart.
   */
  hasMeaningfulTraffic: boolean;
}

/** One day of tap counts for sparkline/chart rendering. */
export interface ClientTrafficPoint {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  taps: number;
}

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

/**
 * Calendar-day key (YYYY-MM-DD) in America/Los_Angeles.
 *
 * All client-facing "per day" stats bucket on the owner's business timezone,
 * not server UTC and not whatever timezone the viewer's browser happens to be
 * in. A tap at 11pm PT is "today" in PT even though it is tomorrow in UTC —
 * bucketing on UTC would show it on the wrong day for this user.
 */
export function americaLosAngelesDayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** Short display label ("Sep 8") for an America/Los_Angeles day key (YYYY-MM-DD). */
export function losAngelesDayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  // Noon UTC keeps the calendar date stable across DST boundaries.
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
}

/** LA day key for "today minus n calendar days" (DST-safe calendar arithmetic). */
export function losAngelesDayKeyDaysAgo(n: number): string {
  const [y, m, d] = americaLosAngelesDayKey(new Date().toISOString())
    .split("-")
    .map(Number);
  // Date.UTC normalizes day overflow across month/year boundaries.
  const dt = new Date(Date.UTC(y, m - 1, d - n, 12));
  const yy = dt.getUTCFullYear();
  const mm = `${dt.getUTCMonth() + 1}`.padStart(2, "0");
  const dd = `${dt.getUTCDate()}`.padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Weekday name ("Monday") for an America/Los_Angeles day key (YYYY-MM-DD). */
export function losAngelesWeekday(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
}

type TapRow = { created_at: string };

/**
 * Fetch aggregate tap stats for a single client hub from public
 * `analytics_events` (event_type = 'tap').
 */
export async function getClientTapStats(restaurantId: string): Promise<ClientTapStats> {
  const [totalRes, recentRes] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("event_type", "tap"),
    supabase
      .from("analytics_events")
      .select("created_at")
      .eq("restaurant_id", restaurantId)
      .eq("event_type", "tap")
      .gte("created_at", daysAgo(30))
      .order("created_at", { ascending: true }),
  ]);

  if (totalRes.error) throw totalRes.error;
  if (recentRes.error) throw recentRes.error;

  const rows = (recentRes.data ?? []) as TapRow[];
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  let tapsThisWeek = 0;
  for (const r of rows) {
    if (new Date(r.created_at).getTime() >= weekAgo) tapsThisWeek += 1;
  }
  const tapsLast30d = rows.length;
  const tapsLastWeek = tapsLast30d - tapsThisWeek;

  const trendPct = tapsLastWeek === 0 ? null : ((tapsThisWeek - tapsLastWeek) / tapsLastWeek) * 100;

  return {
    tapsThisWeek,
    tapsLastWeek,
    trendPct,
    tapsLast30d,
    totalTaps: totalRes.count ?? 0,
    hasMeaningfulTraffic: tapsLast30d >= MEANINGFUL_TRAFFIC_TAPS_30D,
  };
}

/**
 * Fetch daily tap counts for the last `days` days (default 30), chronological,
 * zero-filled so charts render a complete series. Days are bucketed in
 * America/Los_Angeles (see {@link americaLosAngelesDayKey}).
 */
export async function getClientTrafficSeries(
  restaurantId: string,
  days = 30,
): Promise<ClientTrafficPoint[]> {
  const { data, error } = await supabase
    .from("analytics_events")
    .select("created_at")
    .eq("restaurant_id", restaurantId)
    .eq("event_type", "tap")
    .gte("created_at", daysAgo(days))
    .order("created_at", { ascending: true });

  if (error) throw error;

  const buckets = new Map<string, number>();
  const series: ClientTrafficPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = losAngelesDayKeyDaysAgo(i);
    buckets.set(key, 0);
    series.push({ date: key, taps: 0 });
  }

  for (const r of (data ?? []) as TapRow[]) {
    const key = americaLosAngelesDayKey(r.created_at);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  for (const point of series) {
    point.taps = buckets.get(point.date) ?? 0;
  }

  return series;
}

/**
 * Link-click event types tracked on business hubs (must match the
 * `track-event` edge function whitelist).
 */
export const LINK_CLICK_EVENT_TYPES = [
  "google_click",
  "yelp_click",
  "instagram_click",
  "directions_click",
  "phone_click",
  "menu_view",
] as const;

export type LinkClickEventType = (typeof LINK_CLICK_EVENT_TYPES)[number];

/** Human labels for link-click event types (UI framing lives in the UI). */
export const LINK_CLICK_LABELS: Record<LinkClickEventType, string> = {
  google_click: "Google Review",
  yelp_click: "Yelp",
  instagram_click: "Instagram",
  directions_click: "Directions",
  phone_click: "Phone",
  menu_view: "Menu",
};

type ClickRow = { created_at: string; event_type: string };

/** One day of per-link click counts, chronological, zero-filled. */
export interface ClientLinkDayClicks {
  /** Calendar date in America/Los_Angeles, YYYY-MM-DD. */
  date: string;
  /** Clicks per link event type for that day. */
  clicks: Record<LinkClickEventType, number>;
  /** Total link clicks that day (all types). */
  total: number;
}

const zeroClicks = (): Record<LinkClickEventType, number> => ({
  google_click: 0,
  yelp_click: 0,
  instagram_click: 0,
  directions_click: 0,
  phone_click: 0,
  menu_view: 0,
});

/**
 * Fetch per-link clicks per day for the last `days` days (default 14),
 * chronological and zero-filled, bucketed in America/Los_Angeles. Answers
 * "WHEN did the clicks happen" — and which link got them.
 */
export async function getClientLinkClicksByDay(
  restaurantId: string,
  days = 14,
): Promise<ClientLinkDayClicks[]> {
  const { data, error } = await supabase
    .from("analytics_events")
    .select("created_at, event_type")
    .eq("restaurant_id", restaurantId)
    .in("event_type", [...LINK_CLICK_EVENT_TYPES])
    .gte("created_at", daysAgo(days))
    .order("created_at", { ascending: true });

  if (error) throw error;

  const buckets = new Map<string, Record<LinkClickEventType, number>>();
  const series: ClientLinkDayClicks[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = losAngelesDayKeyDaysAgo(i);
    const clicks = zeroClicks();
    buckets.set(key, clicks);
    series.push({ date: key, clicks, total: 0 });
  }

  for (const r of (data ?? []) as ClickRow[]) {
    const key = americaLosAngelesDayKey(r.created_at);
    const bucket = buckets.get(key);
    const type = r.event_type as LinkClickEventType;
    if (bucket && type in bucket) {
      bucket[type] += 1;
    }
  }
  for (const point of series) {
    point.total = (Object.values(point.clicks) as number[]).reduce((a, b) => a + b, 0);
  }

  return series;
}

/**
 * Fetch total clicks per link type over the last `days` days (default 30).
 */
export async function getClientLinkClickTotals(
  restaurantId: string,
  days = 30,
): Promise<Record<LinkClickEventType, number>> {
  const { data, error } = await supabase
    .from("analytics_events")
    .select("event_type")
    .eq("restaurant_id", restaurantId)
    .in("event_type", [...LINK_CLICK_EVENT_TYPES])
    .gte("created_at", daysAgo(days));

  if (error) throw error;

  const totals = zeroClicks();
  for (const r of (data ?? []) as Array<{ event_type: string }>) {
    const type = r.event_type as LinkClickEventType;
    if (type in totals) totals[type] += 1;
  }
  return totals;
}

/**
 * Timestamp (ISO) of the most recent tap for one client hub, or null when the
 * hub has never been tapped. Powers engagement nudges
 * ("Your cards haven't been tapped in X days"). Lightweight: one row.
 */
export async function getClientLastTapAt(
  restaurantId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("analytics_events")
    .select("created_at")
    .eq("restaurant_id", restaurantId)
    .eq("event_type", "tap")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as TapRow | null)?.created_at ?? null;
}

/**
 * All-time count of review-link clicks (Google + Yelp) for one client hub.
 * Feeds the "first review click" milestone. Always real counts — never
 * estimated, never fabricated.
 */
export async function getClientReviewClickTotal(
  restaurantId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .in("event_type", ["google_click", "yelp_click"]);

  if (error) throw error;
  return count ?? 0;
}

export interface UseClientStatsResult {
  stats: ClientTapStats | null;
  series: ClientTrafficPoint[];
  loading: boolean;
  error: string | null;
  /** Re-fetch both stats and series. */
  refresh: () => void;
}

/**
 * React hook wrapping {@link getClientTapStats} and
 * {@link getClientTrafficSeries} with loading/error states. Pass the owner's
 * restaurant id; pass null/undefined to skip loading (e.g. while it resolves).
 */
export function useClientStats(
  restaurantId: string | null | undefined,
  seriesDays = 30,
): UseClientStatsResult {
  const [stats, setStats] = useState<ClientTapStats | null>(null);
  const [series, setSeries] = useState<ClientTrafficPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!restaurantId) {
      setStats(null);
      setSeries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [s, t] = await Promise.all([
        getClientTapStats(restaurantId),
        getClientTrafficSeries(restaurantId, seriesDays),
      ]);
      setStats(s);
      setSeries(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [restaurantId, seriesDays]);

  useEffect(() => {
    void load();
  }, [load]);

  return { stats, series, loading, error, refresh: load };
}

/* ------------------------------------------------------------------ *
 * Solo (personal) hubs — reads go through the `analytics-report` edge
 * function, which serves human-validated traffic from `analytics_hits`
 * for the caller's own hub. The legacy `personal_analytics` table is no
 * longer written to (visits/link clicks moved to the centralized `track`
 * pipeline), so it must NOT be used for current stats.
 * ------------------------------------------------------------------ */

/** One per-event aggregate row from the analytics-report `hub_summary` action. */
export interface HubEventSummary {
  event_name: string;
  events: number;
  sessions: number;
  visitors: number;
}

/** One day of per-event counts for a hub, chronological, zero-filled. */
export interface HubDailyPoint {
  /** Calendar date in America/Los_Angeles, YYYY-MM-DD. */
  date: string;
  /** Events per event_name for that day (human-validated traffic only). */
  events: Record<string, number>;
  /** Total events that day (all event names). */
  total: number;
}

async function invokeAnalyticsReport(
  body: Record<string, string | null>,
): Promise<any> {
  const { data, error } = await supabase.functions.invoke("analytics-report", {
    body,
  });
  if (error) throw error;
  return data;
}

/**
 * Per-event aggregates for one hub over an optional window. Only
 * human-validated traffic is counted (bots, previews and staff views are
 * classified server-side and excluded).
 */
export async function getPersonalHubSummary(
  hubId: string,
  since?: string,
  until?: string,
): Promise<HubEventSummary[]> {
  const data = await invokeAnalyticsReport({
    action: "hub_summary",
    hubId,
    since: since ?? null,
    until: until ?? null,
  });
  return ((data?.events ?? []) as HubEventSummary[]).map((e) => ({
    event_name: String(e.event_name),
    events: Number(e.events ?? 0),
    sessions: Number(e.sessions ?? 0),
    visitors: Number(e.visitors ?? 0),
  }));
}

/**
 * Per-day per-event counts for one hub over the last `days` days
 * (default 14), chronological and zero-filled, bucketed in
 * America/Los_Angeles. Requires the `hub_daily` action on the
 * analytics-report edge function.
 */
export async function getPersonalHubDaily(
  hubId: string,
  days = 14,
): Promise<HubDailyPoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const data = await invokeAnalyticsReport({ action: "hub_daily", hubId, since });

  const byDay = new Map<string, Record<string, number>>();
  for (const row of (data?.daily ?? []) as Array<{
    day: string;
    events: Record<string, number>;
  }>) {
    if (typeof row?.day === "string") byDay.set(row.day, row.events ?? {});
  }

  const series: HubDailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = losAngelesDayKeyDaysAgo(i);
    const events = byDay.get(key) ?? {};
    series.push({
      date: key,
      events,
      total: (Object.values(events) as number[]).reduce(
        (a, b) => a + (Number(b) || 0),
        0,
      ),
    });
  }
  return series;
}
