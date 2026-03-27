import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, MousePointerClick, UserPlus, Lock, TrendingUp, Smartphone, Monitor, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Loader2 } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

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
  if (!!plan && ["pro", "premium", "vip", "founding_pro", "paid"].includes(plan)) return true;
  if (status === "trialing") return true;
  return false;
};

export const AdvancedAnalyticsTab = ({ profileId, planType, subscriptionStatus, onUpgrade }: AdvancedAnalyticsTabProps) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [basicCounts, setBasicCounts] = useState({ "7d": 0, "30d": 0, all: 0 });
  const [showUpgrade, setShowUpgrade] = useState(false);
  const pro = hasProAccess(planType, subscriptionStatus);

  useEffect(() => {
    const load = async () => {
      // Always load basic counts
      const now = new Date();
      const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
      const d30 = new Date(now); d30.setDate(d30.getDate() - 30);

      const [c7, c30, cAll] = await Promise.all([
        supabase.from("personal_analytics").select("*", { count: "exact", head: true }).eq("profile_id", profileId).eq("event_type", "profile_visit").gte("created_at", d7.toISOString()),
        supabase.from("personal_analytics").select("*", { count: "exact", head: true }).eq("profile_id", profileId).eq("event_type", "profile_visit").gte("created_at", d30.toISOString()),
        supabase.from("personal_analytics").select("*", { count: "exact", head: true }).eq("profile_id", profileId).eq("event_type", "profile_visit"),
      ]);
      setBasicCounts({ "7d": c7.count || 0, "30d": c30.count || 0, all: cAll.count || 0 });

      if (pro) {
        // Fetch all events for last 30 days for advanced charts
        const since = new Date(); since.setDate(since.getDate() - 30);
        const { data } = await supabase
          .from("personal_analytics")
          .select("event_type, created_at, visitor_info")
          .eq("profile_id", profileId)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: true });
        setRows(data || []);
      }
      setLoading(false);
    };
    load();
  }, [profileId, pro]);

  // Compute advanced metrics
  const { dailyVisits, topLinks, engagementData, referrerData, deviceData } = useMemo(() => {
    if (!pro || rows.length === 0) return { dailyVisits: [], topLinks: [], engagementData: [], referrerData: [], deviceData: [] };

    // Daily visits (line chart)
    const visitsByDay: Record<string, number> = {};
    const now = new Date();
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

    // Top links
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

    // Engagement breakdown
    const typeCounts: Record<string, number> = {};
    rows.forEach(r => { typeCounts[r.event_type] = (typeCounts[r.event_type] || 0) + 1; });
    const engagementData = [
      { name: "Profile Visits", value: typeCounts["profile_visit"] || 0, fill: "hsl(var(--primary))" },
      { name: "Link Clicks", value: typeCounts["link_click"] || 0, fill: "hsl(var(--chart-2, 150 60% 50%))" },
      { name: "Contact Saves", value: typeCounts["contact_save"] || 0, fill: "hsl(var(--chart-3, 40 90% 60%))" },
    ];

    // Referrer sources
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
    const referrerData = Object.entries(refCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([domain, count]) => ({ domain, count }));

    // Device breakdown
    let mobile = 0, desktop = 0;
    rows.forEach(r => {
      const info = r.visitor_info as Record<string, string> | null;
      const ua = info?.userAgent || "";
      if (/mobile|android|iphone|ipad/i.test(ua)) mobile++;
      else desktop++;
    });
    const deviceData = [
      { name: "Mobile", value: mobile, icon: Smartphone },
      { name: "Desktop", value: desktop, icon: Monitor },
    ];

    return { dailyVisits, topLinks, engagementData, referrerData, deviceData };
  }, [rows, pro]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const chartConfig = {
    visits: { label: "Visits", color: "hsl(var(--primary))" },
  };

  const engagementConfig = {
    value: { label: "Count" },
  };

  return (
    <div className="space-y-6">
      {/* Basic counters - always shown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          { label: "Last 7 days", value: basicCounts["7d"] },
          { label: "Last 30 days", value: basicCounts["30d"] },
          { label: "All time", value: basicCounts.all },
        ]).map((item) => (
          <div key={item.label} className="p-4 bg-card rounded-xl border border-border text-center sm:text-left">
            <p className="text-3xl sm:text-2xl font-bold text-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground text-center">Profile visits</p>

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
          {engagementData.some(d => d.value > 0) && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-semibold text-foreground text-sm mb-4">Engagement Breakdown</h3>
              <ChartContainer config={engagementConfig} className="h-[160px] w-full">
                <BarChart data={engagementData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {engagementData.map((entry, i) => (
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
          {deviceData.some(d => d.value > 0) && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-semibold text-foreground text-sm mb-3">Devices</h3>
              <div className="grid grid-cols-2 gap-3">
                {deviceData.map(d => {
                  const total = deviceData.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <d.icon className="h-5 w-5 text-muted-foreground" />
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
          {referrerData.length > 0 && (
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
                  {referrerData.map((r, i) => (
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
              className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-medium shadow-lg hover:bg-primary/90 transition-colors"
            >
              <Lock className="h-4 w-4" />
              Unlock Advanced Analytics
            </button>
            <p className="text-xs text-muted-foreground mt-2">Upgrade to Pro — $15/month</p>
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
