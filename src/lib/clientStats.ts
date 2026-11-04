/**
 * Client-facing stats data layer for the TapAway client dashboard.
 *
 * FRAMING RULE (owner decision 2026-09-09): these helpers return RAW numbers and
 * trends only. Never any judgment about whether the numbers are "good" or "bad".
 * The dashboard UI owns the framing (e.g. showing progress / momentum language).
 * The `hasMeaningfulTraffic` boolean exists so the UI can choose an encouraging
 * "early days" empty state instead of rendering a near-empty chart.
 *
 * All queries read the caller's own analytics_events rows, so they are RLS-safe
 * for a restaurant owner viewing their own hub. Admins can read any rows.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAnalyticsReport } from "@/lib/canonicalAnalytics";

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
   * False when the hub has very few taps. The UI should show an encouraging
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
 * in. A tap at 11pm PT is "today" in PT even though it is tomorrow in UTC 
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
 const report=await fetchAnalyticsReport({hubId:restaurantId,kind:'business',days:30});
 const until=report.meta.until;
 const since7=new Date(new Date(until).getTime()-7*86400000).toISOString();
 const since14=new Date(new Date(until).getTime()-14*86400000).toISOString();
 const [week,previous]=await Promise.all([fetchAnalyticsReport({hubId:restaurantId,kind:'business',until,since:since7}),fetchAnalyticsReport({hubId:restaurantId,kind:'business',until,since:since14})]);
 const tapsThisWeek=week.totals.hub_views, tapsLastWeek=previous.totals.hub_views-tapsThisWeek;
 return {tapsThisWeek,tapsLastWeek,trendPct:tapsLastWeek?((tapsThisWeek-tapsLastWeek)/tapsLastWeek)*100:null,tapsLast30d:report.totals.hub_views,totalTaps:report.totals.hub_views,hasMeaningfulTraffic:report.totals.hub_views>=MEANINGFUL_TRAFFIC_TAPS_30D};
}
export async function getClientTrafficSeries(restaurantId:string,days=30):Promise<ClientTrafficPoint[]> {
 const report=await fetchAnalyticsReport({hubId:restaurantId,kind:'business',since:new Date(Date.now()-days*86400000).toISOString()});
 return report.daily.map(d=>({date:d.day,taps:d.events.hub_view??0}));
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
 * "WHEN did the clicks happen". And which link got them.
 */
const canonicalBusinessClicks=(events:Record<string,number>):Record<LinkClickEventType,number>=>({google_click:events.review_click??0,yelp_click:0,instagram_click:events.social_click??0,directions_click:events.directions_click??0,phone_click:events.call_click??0,menu_view:events.menu_view??0});
export async function getClientLinkClicksByDay(restaurantId:string,days=14):Promise<ClientLinkDayClicks[]> {
 const report=await fetchAnalyticsReport({hubId:restaurantId,kind:'business',since:new Date(Date.now()-days*86400000).toISOString()});
 return report.daily.map(d=>{const clicks=canonicalBusinessClicks(d.events);return {date:d.day,clicks,total:Object.values(clicks).reduce((n,v)=>n+v,0)};});
}
export async function getClientLinkClickTotals(restaurantId:string,days=30):Promise<Record<LinkClickEventType,number>> {
 const report=await fetchAnalyticsReport({hubId:restaurantId,kind:'business',since:new Date(Date.now()-days*86400000).toISOString()});
 return canonicalBusinessClicks(Object.fromEntries(report.events.map(e=>[e.event_name,e.events])));
}
export async function getClientLastTapAt(restaurantId:string):Promise<string|null> {
 const report=await fetchAnalyticsReport({hubId:restaurantId,kind:'business',days:90});
 return report.activity.find(e=>e.event==='hub_view')?.at ?? null;
}

/**
 * Per-review attribution for one client hub, from the google_reviews table
 * (refreshed daily by the attribute-google-reviews edge function, newest-first).
 * Returns raw counts only. The dashboard UI owns the "likely from TapAway"
 * framing. A review counts as attributed when a google_click event exists for
 * the restaurant in the 48 hours before the review's publish time.
 */
export interface AttributedReviews {
  /** Reviews published within the window, from Google's own per-review data. */
  newReviews: number;
  /**
   * Of those, how many followed a TapAway review-button tap. Hard-clamped to
   * never exceed newReviews. We must never claim more attributed reviews
   * than the reviews actually received.
   */
  attributed: number;
  /** True when per-review data exists for the window (the verified path). */
  hasData: boolean;
}

export async function getAttributedReviews(
  restaurantId: string,
  daysBack: number,
): Promise<AttributedReviews> {
  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("google_reviews")
    .select("attributed_to_tapaway")
    .eq("restaurant_id", restaurantId)
    .gte("review_time", cutoff);

  if (error) throw error;
  const rows = (data ?? []) as { attributed_to_tapaway: boolean }[];
  const attributedCount = rows.filter((r) => r.attributed_to_tapaway).length;
  return {
    newReviews: rows.length,
    attributed: Math.min(attributedCount, rows.length),
    hasData: rows.length > 0,
  };
}

/**
 * Google review count delta for one client hub, from weekly Places API
 * snapshots (google_review_snapshots). Returns raw numbers only. The
 * dashboard UI owns the framing.
 *
 * Statuses:
 * - "no_place_id": this restaurant has no Google Place ID linked, so there is
 *   nothing to track yet. The UI should hide the card, not show a fake zero.
 * - "no_snapshots": Place ID is linked but the weekly sync hasn't produced a
 *   snapshot yet. The UI should say "first check-in pending", not a fake zero.
 * - "ok": real data. newReviews is latest − earliest within the window and can
 *   be negative when Google removes reviews. isFirstSync is true when only one
 *   snapshot exists in the window (no real delta yet).
 */
export type GoogleReviewDeltaStatus = "no_place_id" | "no_snapshots" | "ok";

export interface GoogleReviewDelta {
  status: GoogleReviewDeltaStatus;
  /** New reviews in the window (latest count − earliest count). Signed. */
  newReviews: number;
  /** Latest known total review count on Google. */
  latestCount: number;
  /** ISO timestamp of the latest snapshot. */
  latestAt: string;
  /** True when only one snapshot exists in the window. No real delta yet. */
  isFirstSync: boolean;
}

export async function getGoogleReviewDelta(
  restaurantId: string,
  daysBack: number,
): Promise<GoogleReviewDelta> {
  const { data: placeRow, error: placeError } = await supabase
    .from("restaurants")
    .select("google_place_id")
    .eq("id", restaurantId)
    .maybeSingle();

  if (placeError) throw placeError;
  const placeId = (placeRow as { google_place_id?: string | null } | null)?.google_place_id;
  if (!placeId || !placeId.trim()) {
    return { status: "no_place_id", newReviews: 0, latestCount: 0, latestAt: "", isFirstSync: true };
  }

  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("google_review_snapshots")
    .select("review_count, captured_at")
    .eq("restaurant_id", restaurantId)
    .gte("captured_at", cutoff)
    .order("captured_at", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) {
    return { status: "no_snapshots", newReviews: 0, latestCount: 0, latestAt: "", isFirstSync: true };
  }

  const earliest = data[0] as { review_count: number; captured_at: string };
  const latest = data[data.length - 1] as { review_count: number; captured_at: string };
  return {
    status: "ok",
    newReviews: latest.review_count - earliest.review_count,
    latestCount: latest.review_count,
    latestAt: latest.captured_at,
    isFirstSync: data.length === 1,
  };
}

/**
 * All-time count of review-link clicks (Google + Yelp) for one client hub.
 * Feeds the "first review click" milestone. Always real counts. Never
 * estimated, never fabricated.
 */
export async function getClientReviewClickTotal(restaurantId:string):Promise<number> {
 const report=await fetchAnalyticsReport({hubId:restaurantId,kind:'business',days:90});
 return report.events.find(e=>e.event_name==='review_click')?.events ?? 0;
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
 * Solo (personal) hubs. Reads go through the `analytics-report` edge
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

export async function getPersonalHubSummary(hubId:string,since?:string,until?:string):Promise<HubEventSummary[]> {
 const report=await fetchAnalyticsReport({hubId,kind:'solo',since,until});
 return report.events.map(e=>({...e,visitors:0})); // Compatibility field is unused; people are never inferred.
}
export async function getPersonalHubDaily(hubId:string,days=14):Promise<HubDailyPoint[]> {
 const report=await fetchAnalyticsReport({hubId,kind:'solo',since:new Date(Date.now()-days*86400000).toISOString()});
 return report.daily.map(d=>({date:d.day,events:d.events,total:Object.values(d.events).reduce((n,v)=>n+v,0)}));
}
