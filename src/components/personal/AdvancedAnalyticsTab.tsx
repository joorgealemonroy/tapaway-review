import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MousePointerClick, Lock, TrendingUp, Smartphone, Monitor, ExternalLink, Tablet, Loader2 } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProUpgradeDialog } from "@/components/personal/ProUpgradeDialog";
import { Json } from "@/integrations/supabase/types";
import { losAngelesDayLabel, losAngelesDayKeyDaysAgo } from "@/lib/clientStats";

interface AdvancedAnalyticsTabProps {
  profileId: string;
  planType: string | null;
  subscriptionStatus?: string | null;
  onUpgrade: () => void;
}

type AnalyticsRow = {
  event_type: string;
  created_at: string | null;
  visitor_info: Json | null;
};

const hasProAccess = (plan: string | null, status: string | null | undefined) => {
  if (!!plan && ["pro", "premium", "vip", "founding_pro", "paid", "monthly", "yearly", "business_lite", "plus_monthly"].includes(plan)) return true;
  if (status === "trialing" || status === "active") return true;
  return false;
};

interface StatsBundle {
  counts: { "7d": number; "30d": number; all: number };
  dailyVisits: { date: string; visits: number }[];
  engagement: { name: string; value: number; fill: string }[];
  topLinks: { label: string; clicks: number; pct: number }[];
  devices: { name: string; value: number }[];
  referrers: { domain: string; count: number }[];
  /** True when served from the legacy personal_analytics table (pre-cutover data). */
  legacy: boolean;
}

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

async function invokeReport(body: Record<string, string | null>) {
  const { data, error } = await supabase.functions.invoke("analytics-report", { body });
  if (error) throw error;
  return data;
}

const pickCount = (events: { event_name: string; events: number }[], name: string) =>
  events.find((e) => e.event_name === name)?.events ?? 0;

/**
 * Primary path — the analytics-report edge function over analytics_hits
 * (human-validated traffic only; bots, previews and staff views excluded,
 * days bucketed in America/Los_Angeles server-side).
 */
async function loadEdge(profileId: string): Promise<StatsBundle> {
  const since7 = isoDaysAgo(7);
  const since30 = isoDaysAgo(30);
  const [sum7, sum30, sumAll, daily, detail, breakdowns] = await Promise.all([
    invokeReport({ action: "hub_summary", hubId: profileId, since: since7 }),
    invokeReport({ action: "hub_summary", hubId: profileId, since: since30 }),
    invokeReport({ action: "hub_summary", hubId: profileId, since: null }),
    invokeReport({ action: "hub_daily", hubId: profileId, since: since30 }),
    invokeReport({ action: "hub_detail", hubId: profileId, since: since30 }),
    invokeReport({ action: "hub_breakdowns", hubId: profileId, since: since30 }),
  ]);

  const ev30: { event_name: string; events: number }[] = sum30?.events ?? [];
  const counts = {
    "7d": pickCount(sum7?.events ?? [], "hub_view"),
    "30d": pickCount(ev30, "hub_view"),
    all: pickCount(sumAll?.events ?? [], "hub_view"),
  };

  const byDay = new Map<string, number>();
  for (const row of (daily?.daily ?? []) as { day: string; events: Record<string, number> }[]) {
    byDay.set(row.day, (row.events?.["hub_view"] ?? 0));
  }
  const dailyVisits: { date: string; visits: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const key = losAngelesDayKeyDaysAgo(i);
    dailyVisits.push({ date: losAngelesDayLabel(key), visits: byDay.get(key) ?? 0 });
  }

  const engagement = [
    { name: "Profile Visits", value: pickCount(ev30, "hub_view"), fill: "hsl(var(--primary))" },
    { name: "Link Clicks", value: pickCount(ev30, "link_click"), fill: "hsl(var(--chart-2, 150 60% 50%))" },
    { name: "Contact Saves", value: pickCount(ev30, "contact_save"), fill: "hsl(var(--chart-3, 40 90% 60%))" },
  ];

  const rawLinks: { label: string; clicks: number }[] = breakdowns?.links ?? [];
  const totalLinkClicks = rawLinks.reduce((s, l) => s + l.clicks, 0);
  const topLinks = rawLinks.map((l) => ({
    label: l.label,
    clicks: l.clicks,
    pct: totalLinkClicks > 0 ? Math.round((l.clicks / totalLinkClicks) * 100) : 0,
  }));

  const rawDevices: { name: string; events: number }[] = breakdowns?.devices ?? [];
  const devices = rawDevices
    .filter((d) => d.name !== "unknown")
    .map((d) => ({
      name: d.name === "mobile" ? "Mobile" : d.name === "tablet" ? "Tablet" : "Desktop",
      value: d.events,
    }));

  const rawSources: { source: string; events: number }[] = detail?.sources ?? [];
  const referrers = rawSources
    .slice(0, 8)
    .map((s) => ({ domain: s.source, count: Number(s.events) || 0 }));

  return { counts, dailyVisits, engagement, topLinks, devices, referrers, legacy: false };
}

/**
 * Fallback path — the legacy personal_analytics table, for accounts whose
 * traffic predates the analytics cutover (or when the edge function hasn't
 * been deployed yet). Day bucketing here is UTC, as it always was.
 */
async function loadLegacy(profileId: string): Promise<StatsBundle> {
  const now = new Date();
  const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);

  const [c7, c30, cAll, rowsRes] = await Promise.all([
    supabase.from("personal_analytics").select("*", { count: "exact", head: true }).eq("profile_id", profileId).eq("event_type", "profile_visit").gte("created_at", d7.toISOString()),
    supabase.from("personal_analytics").select("*", { count: "exact", head: true }).eq("profile_id", profileId).eq("event_type", "profile_visit").gte("created_at", d30.toISOString()),
    supabase.from("personal_analytics").select("*", { count: "exact", head: true }).eq("profile_id", profileId).eq("event_type", "profile_visit"),
    supabase
      .from("personal_analytics")
      .select("event_type, created_at, visitor_info")
      .eq("profile_id", profileId)
      .gte("created_at", d30.toISOString())
      .order("created_at", { ascending: true }),
  ]);
  const counts = { "7d": c7.count || 0, "30d": c30.count || 0, all: cAll.count || 0 };
  const rows: AnalyticsRow[] = (rowsRes.data || []) as AnalyticsRow[];

  const visitsByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    visitsByDay[d.toISOString().slice(0, 10)] = 0;
  }
  rows.filter(r => r.event_type === "profile_visit").forEach(r => {
    if (r.created_at) {
      const day = r.created_at.slice(0, 10);
      if (day in visitsByDay) visitsByDay[day]++;
    }
  });
  const dailyVisits = Object.entries(visitsByDay).map(([date, count]) => ({
    date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    visits: count,
  }));

  const typeCounts: Record<string, number> = {};
  rows.forEach(r => { typeCounts[r.event_type] = (typeCounts[r.event_type] || 0) + 1; });
  const engagement = [
    { name: "Profile Visits", value: typeCounts["profile_visit"] || 0, fill: "hsl(var(--primary))" },
    { name: "Link Clicks", value: typeCounts["link_click"] || 0, fill: "hsl(var(--chart-2, 150 60% 50%))" },
    { name: "Contact Saves", value: typeCounts["contact_save"] || 0, fill: "hsl(var(--chart-3, 40 90% 60%))" },
  ];

  const linkCounts: Record<string, { label: string; clicks: number }> = {};
  rows.filter(r => r.event_type === "link_click").forEach(r => {
    const info = r.visitor_info as Record<string, string> | null;
    const id = info?.link_id || "unknown";
    const label = info?.link_label || "Unknown";
    if (!linkCounts[id]) linkCounts[id] = { label, clicks: 0 };
    linkCounts[id].clicks++;
  });
  const totalClicks = Object.values(linkCounts).reduce((s, v) => s + v.clicks, 0);
  const topLinks = Object.values(linkCounts)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10)
    .map(l => ({ ...l, pct: totalClicks > 0 ? Math.round((l.clicks / totalClicks) * 100) : 0 }));

  const refCounts: Record<string, number> = {};
  rows.forEach(r => {
    const info = r.visitor_info as Record<string, string> | null;
    const ref = info?.referrer;
    if (ref) {
      try {
        const domain = new URL(ref).hostname.replace("www.", "");
        refCounts[domain] = (refCounts[domain] || 0) + 1;
      } catch { /* skip invalid */ }
    }
  });
  const referrers = Object.entries(refCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([domain, count]) => ({ domain, count }));

  let mobile = 0, desktop = 0;
  rows.forEach(r => {
    const info = r.visitor_info as Record<string, string> | null;
    const ua = info?.userAgent || "";
    if (/mobile|android|iphone|ipad/i.test(ua)) mobile++;
    else desktop++;
  });
  const devices = [
    { name: "Mobile", value: mobile },
    { name: "Desktop", value: desktop },
  ];

  return { counts, dailyVisits, engagement, topLinks, devices, referrers, legacy: true };
}

const DEVICE_ICONS: Record<string, typeof Smartphone> = {
  Mobile: Smartphone,
  Tablet: Tablet,
  Desktop: Monitor,
};

export const AdvancedAnalyticsTab = ({ profileId, planType, subscriptionStatus, onUpgrade }: AdvancedAnalyticsTabProps) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const pro = hasProAccess(planType, subscriptionStatus);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const bundle = await loadEdge(profileId).catch(async (edgeErr) => {
          // Edge function not deployed (or a new action missing) — fall back
          // to the legacy table rather than showing an empty tab.
          console.warn("analytics-report unavailable for stats tab, using legacy fallback", edgeErr);
          return loadLegacy(profileId);
        });
        if (!cancelled) setStats(bundle);
      } catch (err) {
        console.error("Error loading stats:", err);
        if (!cancelled) setLoadError("Couldn't load your stats. Check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [profileId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError || !stats) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-sm text-muted-foreground mb-4">{loadError ?? "No stats available."}</p>
      </div>
    );
  }

  const chartConfig = {
    visits: { label: "Visits", color: "hsl(var(--primary))" },
  };

  const engagementConfig = {
    value: { label: "Count" },
  };

  const { counts, dailyVisits, engagement, topLinks, devices, referrers } = stats;

  return (
    <div className="space-y-6">
      {/* Basic counters - always shown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          { label: "Last 7 days", value: counts["7d"] },
          { label: "Last 30 days", value: counts["30d"] },
          { label: "All time", value: counts.all },
        ]).map((item) => (
          <div key={item.label} className="p-4 bg-card rounded-xl border border-border text-center sm:text-left">
            <p className="text-3xl sm:text-2xl font-bold text-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Profile visits{!stats.legacy && " · bots and previews excluded"}
      </p>

      {/* Advanced section */}
      {pro ? (
        <div className="space-y-6">
          {/* Visitors over time */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Visitors — Last 30 Days</h3>
            </div>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <LineChart data={dailyVisits}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="visits" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>

          {/* Engagement breakdown */}
          {engagement.some(d => d.value > 0) && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-semibold text-foreground text-sm mb-4">Engagement Breakdown</h3>
              <ChartContainer config={engagementConfig} className="h-[160px] w-full">
                <BarChart data={engagement} layout="vertical">
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {engagement.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          )}

          {/* Top Links */}
          {topLinks.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <MousePointerClick className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Top Links</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Link</TableHead>
                    <TableHead className="text-xs text-right w-16">Clicks</TableHead>
                    <TableHead className="text-xs text-right w-12">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topLinks.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium truncate max-w-[180px]">{l.label}</TableCell>
                      <TableCell className="text-sm text-right tabular-nums">{l.clicks}</TableCell>
                      <TableCell className="text-sm text-right text-muted-foreground tabular-nums">{l.pct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Device breakdown */}
          {devices.some(d => d.value > 0) && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-semibold text-foreground text-sm mb-3">Devices</h3>
              <div className="grid grid-cols-2 gap-3">
                {devices.map(d => {
                  const total = devices.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                  const Icon = DEVICE_ICONS[d.name] ?? Smartphone;
                  return (
                    <div key={d.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{pct}%</p>
                        <p className="text-xs text-muted-foreground">{d.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Referrer sources */}
          {referrers.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <ExternalLink className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Referrer Sources</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs text-right w-16">Visits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrers.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{r.domain}</TableCell>
                      <TableCell className="text-sm text-right tabular-nums">{r.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        /* Locked preview for free users */
        <div className="relative">
          <div className="filter blur-sm pointer-events-none select-none opacity-60 space-y-4">
            <div className="bg-card rounded-xl border border-border p-4 h-[200px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Visitors over time chart</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl border border-border p-4 h-24" />
              <div className="bg-card rounded-xl border border-border p-4 h-24" />
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <button
              onClick={() => setShowUpgrade(true)}
              className="flex items-center gap-2 px-5 py-3 min-h-[48px] bg-primary text-primary-foreground rounded-xl font-medium shadow-lg hover:bg-primary/90 transition-colors"
            >
              <Lock className="h-4 w-4" />
              Unlock Advanced Analytics
            </button>
            <p className="text-xs text-muted-foreground mt-2">Upgrade to Pro — $20/month</p>
          </div>
        </div>
      )}

      <ProUpgradeDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        featureName="Advanced Analytics"
        onUpgrade={onUpgrade}
      />
    </div>
  );
};
