import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HubRow, ProbeState, liveHubs, runHealthSweep, hubKey } from "@/lib/hubHealthProbe";

export type EngagementRange = "today" | "30d" | "all";

export interface OverviewCounts {
  personalTotal: number;
  restaurantTotal: number;
  activeSubs: number;
  trialing: number;
  newLast7: number;
  pendingApproval: number;
  changesRequested: number;
  printAwaiting: number;
  repAppsPending: number;
  demoRequestsPending: number;
  taxPending: number;
  unpaidCommissions: number;
  trialsExpiring7d: number;
  errors24h: number;
}

export interface OverviewEngagement {
  taps: number;
  clicks: number;
  saves: number;
  activeHubs: number;
}

export interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  at: string;
  tone: "neutral" | "good" | "warn";
  path?: string;
}

export interface HealthSummary {
  total: number;
  ok: number;
  broken: number;
  pending: number;
  brokenSlugs: { slug: string; detail: string }[];
  running: boolean;
  lastCheckedAt: Date | null;
}

const EMPTY_COUNTS: OverviewCounts = {
  personalTotal: 0,
  restaurantTotal: 0,
  activeSubs: 0,
  trialing: 0,
  newLast7: 0,
  pendingApproval: 0,
  changesRequested: 0,
  printAwaiting: 0,
  repAppsPending: 0,
  demoRequestsPending: 0,
  taxPending: 0,
  unpaidCommissions: 0,
  trialsExpiring7d: 0,
  errors24h: 0,
};

const sinceFor = (range: EngagementRange): string | null => {
  if (range === "all") return null;
  const d = new Date();
  if (range === "today") d.setHours(0, 0, 0, 0);
  else d.setDate(d.getDate() - 30);
  return d.toISOString();
};

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const daysAhead = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

type CountQuery = { count: number | null };

const num = (r: PromiseSettledResult<CountQuery>) =>
  r.status === "fulfilled" ? r.value.count ?? 0 : 0;

export function useAdminOverview(enabled: boolean, range: EngagementRange) {
  const [counts, setCounts] = useState<OverviewCounts>(EMPTY_COUNTS);
  const [engagement, setEngagement] = useState<OverviewEngagement | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [engagementLoading, setEngagementLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [health, setHealth] = useState<HealthSummary>({
    total: 0,
    ok: 0,
    broken: 0,
    pending: 0,
    brokenSlugs: [],
    running: false,
    lastCheckedAt: null,
  });
  const healthRunning = useRef(false);

  /* ---------------- counts + activity ---------------- */
  const loadCounts = useCallback(async () => {
    const pp = () => supabase.from("personal_profiles").select("id", { count: "exact", head: true });
    const rr = () => supabase.from("restaurants").select("id", { count: "exact", head: true });

    const results = await Promise.allSettled<CountQuery>([
      pp(),
      rr(),
      pp().eq("subscription_status", "active"),
      rr().eq("subscription_status", "active"),
      pp().eq("subscription_status", "trialing"),
      rr().eq("subscription_status", "trialing"),
      pp().gte("created_at", daysAgo(7)),
      rr().gte("created_at", daysAgo(7)),
      pp().eq("is_approved", false).eq("pipeline_status", "ready_for_review"),
      pp().eq("pipeline_status", "changes_requested"),
      pp().not("card_print_pdf_path", "is", null).in("print_status", ["not_downloaded", "downloaded"]),
      supabase.from("rep_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("rep_demo_requests").select("id", { count: "exact", head: true }).eq("fulfilled", false),
      supabase.from("rep_tax_profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("commissions").select("id", { count: "exact", head: true }).in("status", ["pending", "available"]),
      pp().eq("subscription_status", "trialing").gte("trial_ends_at", new Date().toISOString()).lte("trial_ends_at", daysAhead(7)),
      supabase.from("client_errors").select("id", { count: "exact", head: true }).gte("created_at", daysAgo(1)),
    ] as unknown as Promise<CountQuery>[]);

    setCounts({
      personalTotal: num(results[0]),
      restaurantTotal: num(results[1]),
      activeSubs: num(results[2]) + num(results[3]),
      trialing: num(results[4]) + num(results[5]),
      newLast7: num(results[6]) + num(results[7]),
      pendingApproval: num(results[8]),
      changesRequested: num(results[9]),
      printAwaiting: num(results[10]),
      repAppsPending: num(results[11]),
      demoRequestsPending: num(results[12]),
      taxPending: num(results[13]),
      unpaidCommissions: num(results[14]),
      trialsExpiring7d: num(results[15]),
      errors24h: num(results[16]),
    });

    // Recent activity feed
    const [created, submitted, apps] = await Promise.allSettled([
      supabase
        .from("personal_profiles")
        .select("id, full_name, username, created_at, is_approved, pipeline_status")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("personal_profiles")
        .select("id, full_name, username, submitted_for_review_at")
        .not("submitted_for_review_at", "is", null)
        .order("submitted_for_review_at", { ascending: false })
        .limit(10),
      supabase
        .from("rep_applications")
        .select("id, created_at, status")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const feed: ActivityItem[] = [];
    if (created.status === "fulfilled") {
      for (const r of created.value.data ?? []) {
        const row = r as { id: string; full_name: string | null; username: string | null; created_at: string; is_approved: boolean | null };
        feed.push({
          id: `new-${row.id}`,
          label: row.full_name || row.username || "New hub",
          detail: row.is_approved ? "Hub created · approved" : "Hub created",
          at: row.created_at,
          tone: "neutral",
          path: "/admin",
        });
      }
    }
    if (submitted.status === "fulfilled") {
      for (const r of submitted.value.data ?? []) {
        const row = r as { id: string; full_name: string | null; username: string | null; submitted_for_review_at: string };
        feed.push({
          id: `sub-${row.id}`,
          label: row.full_name || row.username || "Hub",
          detail: "Submitted for review",
          at: row.submitted_for_review_at,
          tone: "warn",
          path: "/admin",
        });
      }
    }
    if (apps.status === "fulfilled") {
      for (const r of apps.value.data ?? []) {
        const row = r as { id: string; created_at: string; status: string | null };
        feed.push({
          id: `app-${row.id}`,
          label: "Sales partner application",
          detail: `Status: ${row.status ?? "pending"}`,
          at: row.created_at,
          tone: row.status === "pending" ? "warn" : "good",
          path: "/admin/reps",
        });
      }
    }
    feed.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    setActivity(feed.slice(0, 15));

    setLoading(false);
    setLastUpdatedAt(new Date());
  }, []);

  /* ---------------- engagement ---------------- */
  const loadEngagement = useCallback(async () => {
    setEngagementLoading(true);
    const since = sinceFor(range);
    const { data, error } = await supabase.rpc("admin_account_engagement", {
      _since: since,
    } as never);
    if (error) {
      setEngagement(null);
      setEngagementLoading(false);
      return;
    }
    const rows = (data ?? []) as {
      taps: number | null;
      link_clicks: number | null;
      contact_saves: number | null;
      last_active_at: string | null;
    }[];
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    setEngagement({
      taps: rows.reduce((s, r) => s + Number(r.taps ?? 0), 0),
      clicks: rows.reduce((s, r) => s + Number(r.link_clicks ?? 0), 0),
      saves: rows.reduce((s, r) => s + Number(r.contact_saves ?? 0), 0),
      activeHubs: rows.filter((r) => r.last_active_at && new Date(r.last_active_at).getTime() >= cutoff).length,
    });
    setEngagementLoading(false);
  }, [range]);

  /* ---------------- health sweep ---------------- */
  const runHealth = useCallback(async () => {
    if (healthRunning.current) return;
    healthRunning.current = true;
    const { data, error } = await supabase.rpc("get_hub_health");
    if (error) {
      healthRunning.current = false;
      return;
    }
    const live = liveHubs((data ?? []) as HubRow[]);
    setHealth((h) => ({ ...h, total: live.length, ok: 0, broken: 0, pending: live.length, brokenSlugs: [], running: true }));

    const states = new Map<string, ProbeState>();
    await runHealthSweep(live, (row, state) => {
      states.set(hubKey(row), state);
      const all = Array.from(states.entries());
      const broken = all.filter(([, s]) => s.status === "error" || s.status === "empty");
      setHealth({
        total: live.length,
        ok: all.filter(([, s]) => s.status === "ok").length,
        broken: broken.length,
        pending: live.length - all.length,
        brokenSlugs: broken.map(([k, s]) => ({ slug: k.split(":")[1], detail: s.detail ?? s.status })),
        running: true,
        lastCheckedAt: null,
      });
    });

    setHealth((h) => ({ ...h, running: false, pending: 0, lastCheckedAt: new Date() }));
    healthRunning.current = false;
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadCounts(), loadEngagement()]);
  }, [loadCounts, loadEngagement]);

  /* ---------------- lifecycle ---------------- */
  useEffect(() => {
    if (!enabled) return;
    void loadCounts();
  }, [enabled, loadCounts]);

  useEffect(() => {
    if (!enabled) return;
    void loadEngagement();
  }, [enabled, loadEngagement]);

  useEffect(() => {
    if (!enabled) return;
    void runHealth();
  }, [enabled, runHealth]);

  // Poll while visible; pause in background tabs.
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const id: ReturnType<typeof setInterval> = setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [enabled, refresh]);

  return {
    counts,
    engagement,
    engagementLoading,
    activity,
    loading,
    lastUpdatedAt,
    health,
    refresh,
    runHealth,
  };
}
