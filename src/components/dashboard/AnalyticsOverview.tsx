import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, MousePointer, Star, Instagram, MapPin, Menu, Activity, Calendar, Clock } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getClientTapStats,
  getClientTrafficSeries,
  getClientLinkClickTotals,
  getClientLinkClicksByDay,
  losAngelesDayLabel,
  losAngelesWeekday,
  LINK_CLICK_EVENT_TYPES,
  LINK_CLICK_LABELS,
  type ClientLinkDayClicks,
} from "@/lib/clientStats";

interface AnalyticsData {
  totalTaps: number;
  googleClicks: number;
  yelpClicks: number;
  instagramClicks: number;
  directionsClicks: number;
  menuViews: number;
  chartData: Array<{ date: string; taps: number }>;
  /** Null when there is no data — never render placeholders as facts. */
  mostClicked: string | null;
  peakDay: string | null;
  /** Per-day per-link clicks, chronological, zero-filled (America/Los_Angeles). */
  clicksByDay: ClientLinkDayClicks[];
  totalClicks: number;
}

export interface AnalyticsOverviewProps {
  restaurantId: string;
  restaurantName: string;
  restaurant: {
    greeting_name?: string | null;
    restaurant_name: string;
  };
  user: any;
  isDemoView?: boolean;
  /** Deep-links the empty-state CTA buttons to the right dashboard tab. */
  onNavigateTab?: (tab: "settings" | "menu") => void;
  /** Used by the empty-state CTA to link the live hub. */
  customSlug?: string | null;
}

export const AnalyticsOverview = ({ restaurantId, restaurantName, restaurant, user, isDemoView = false, onNavigateTab, customSlug }: AnalyticsOverviewProps) => {
  const [daysBack, setDaysBack] = useState(7);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalTaps: 0,
    googleClicks: 0,
    yelpClicks: 0,
    instagramClicks: 0,
    directionsClicks: 0,
    menuViews: 0,
    chartData: [],
    mostClicked: null,
    peakDay: null,
    clicksByDay: [],
    totalClicks: 0,
  });
  const [loading, setLoading] = useState(true);

  // Compute greeting name with fallback logic
  const ownerNameFromAuth =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    (user?.email ? user.email.split("@")[0] : "");

  const greetingName =
    restaurant.greeting_name ||
    ownerNameFromAuth ||
    restaurant.restaurant_name ||
    "there";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [tapStats, traffic, clickTotals, clicksByDay] = await Promise.all([
          getClientTapStats(restaurantId),
          getClientTrafficSeries(restaurantId, daysBack),
          getClientLinkClickTotals(restaurantId, daysBack),
          getClientLinkClicksByDay(restaurantId, daysBack),
        ]);
        if (cancelled) return;

        const totalTaps = daysBack <= 7 ? tapStats.tapsThisWeek : tapStats.tapsLast30d;

        // Most-clicked link — only from real clicks, never a placeholder.
        let mostClicked: string | null = null;
        let bestCount = 0;
        for (const type of LINK_CLICK_EVENT_TYPES) {
          if (clickTotals[type] > bestCount) {
            bestCount = clickTotals[type];
            mostClicked = LINK_CLICK_LABELS[type];
          }
        }

        // Peak day = most total activity (taps + link clicks) on one
        // America/Los_Angeles calendar day. Null with zero activity.
        const tapsByDay = new Map(traffic.map((p) => [p.date, p.taps]));
        let peakDay: string | null = null;
        let peakCount = 0;
        for (const day of clicksByDay) {
          const activity = day.total + (tapsByDay.get(day.date) ?? 0);
          if (activity > peakCount) {
            peakCount = activity;
            peakDay = losAngelesWeekday(day.date);
          }
        }

        const totalClicks = clicksByDay.reduce((a, d) => a + d.total, 0);

        setAnalytics({
          totalTaps,
          googleClicks: clickTotals.google_click,
          yelpClicks: clickTotals.yelp_click,
          instagramClicks: clickTotals.instagram_click,
          directionsClicks: clickTotals.directions_click,
          menuViews: clickTotals.menu_view,
          chartData: traffic.map((p) => ({ date: losAngelesDayLabel(p.date), taps: p.taps })),
          mostClicked,
          peakDay,
          clicksByDay,
          totalClicks,
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, daysBack]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const buttonStats = [
    { name: "Google Reviews", count: analytics.googleClicks, icon: Star, color: "text-yellow-600" },
    { name: "Directions", count: analytics.directionsClicks, icon: MapPin, color: "text-blue-600" },
    { name: "Menu Views", count: analytics.menuViews, icon: Menu, color: "text-purple-600" },
    { name: "Instagram", count: analytics.instagramClicks, icon: Instagram, color: "text-pink-600" },
  ];

  // Most recent day first for the per-day list.
  const daysDesc = [...analytics.clicksByDay].reverse();

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 animate-fade-in">
      {/* Welcome Card */}
      <Card className="p-4 sm:p-8 bg-primary/5 border border-border shadow-lg animate-scale-in">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full gradient-primary flex items-center justify-center">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <h2 className="text-xl sm:text-3xl font-bold">
                Hi, {greetingName}! 👋
              </h2>
              <ToggleGroup
                type="single"
                value={String(daysBack)}
                onValueChange={(v) => v && setDaysBack(Number(v))}
                className="bg-muted rounded-lg p-0.5"
              >
                <ToggleGroupItem value="7" className="text-xs px-2.5 py-1 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
                  7d
                </ToggleGroupItem>
                <ToggleGroupItem value="30" className="text-xs px-2.5 py-1 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
                  30d
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              {analytics.totalTaps > 0 ? (
                <>
                  You've had <span className="font-semibold text-primary">{analytics.totalTaps} taps</span> in the last {daysBack} days.
                  {analytics.mostClicked && (
                    <>
                      {" "}Your most clicked button is <span className="font-semibold text-primary">{analytics.mostClicked}</span>
                      {analytics.peakDay && (
                        <>, and your peak day is <span className="font-semibold text-primary">{analytics.peakDay}</span></>
                      )}.
                    </>
                  )}
                </>
              ) : (
                <>No taps in the last {daysBack} days yet — once customers start tapping, your trends will show up here.</>
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* Empty state: no fake stats — point the owner at the setup that drives taps. */}
      {analytics.totalTaps === 0 && (
        <Card className="p-5 sm:p-6 card-elevated border-primary/20 bg-primary/5">
          <h3 className="text-lg font-bold mb-1">Let's get your first taps 🚀</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Taps come from a hub that's ready to share. These two take five minutes:
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            {onNavigateTab ? (
              <>
                <button
                  onClick={() => onNavigateTab("settings")}
                  className="min-h-[44px] px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Add your Google review link
                </button>
                <button
                  onClick={() => onNavigateTab("menu")}
                  className="min-h-[44px] px-4 rounded-lg border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Add your menu
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add your Google review link and your menu in Settings and Menu to get started.
              </p>
            )}
            {customSlug && (
              <a
                href={`/${customSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 rounded-lg border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors inline-flex items-center justify-center"
              >
                View your hub
              </a>
            )}
          </div>
        </Card>
      )}

      {/* Key Stats Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6">
        <Card className="p-3 sm:p-6 card-elevated transition-smooth hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Total Taps</p>
            </div>
          </div>
          <p className="text-4xl font-bold text-primary">{analytics.totalTaps}</p>
          <p className="text-xs text-muted-foreground mt-1">Last {daysBack} days</p>
        </Card>

        <Card className="p-3 sm:p-6 card-elevated transition-smooth hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <MousePointer className="w-5 h-5 text-accent" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Most Clicked</p>
            </div>
          </div>
          <p className="text-2xl font-bold">{analytics.mostClicked ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">Most popular action</p>
        </Card>

        <Card className="p-3 sm:p-6 card-elevated transition-smooth hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Peak Day</p>
            </div>
          </div>
          <p className="text-2xl font-bold">{analytics.peakDay ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">Most active day</p>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card className="p-6 card-elevated">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-1">Activity Over Time</h3>
          <p className="text-sm text-muted-foreground">Daily tap activity for the last {daysBack} days</p>
        </div>
        {
          <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 200 : 300}>
            <AreaChart data={analytics.chartData}>
              <defs>
                <linearGradient id="colorTaps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" className="fill-muted-foreground" fontSize={12} tickLine={false} axisLine={false} minTickGap={daysBack > 7 ? 32 : 12} />
              <YAxis className="fill-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--card-foreground))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                }}
              />
              <Area
                type="monotone"
                dataKey="taps"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#colorTaps)"
                dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              />
          </AreaChart>
          </ResponsiveContainer>
        }
      </Card>

      {/* Button Performance */}
      <Card className="p-6 card-elevated">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-1">Button Performance</h3>
          <p className="text-sm text-muted-foreground">Track which actions your customers are taking</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {buttonStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 transition-smooth hover:bg-muted">
                <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.count}</p>
                  <p className="text-xs text-muted-foreground">{stat.name}</p>
                </div>
              </div>
            );
          })}
        </div>
        {analytics.totalTaps > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-sm text-foreground">
              💡 <span className="font-semibold">Pro Tip:</span> Hand out more cards at tables with great experiences to boost these numbers!
            </p>
          </div>
        )}
      </Card>

      {/* When clicks happened — per-day, per-link breakdown (America/Los_Angeles days) */}
      <Card className="p-6 card-elevated">
        <div className="mb-4">
          <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            When your clicks happened
          </h3>
          <p className="text-sm text-muted-foreground">
            Which buttons got tapped, day by day — last {daysBack} days
          </p>
        </div>
        {analytics.totalClicks === 0 ? (
          <p className="text-sm text-muted-foreground">
            No link clicks in the last {daysBack} days yet — when customers tap a button on
            your hub, you'll see exactly which day it happened here.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {daysDesc.map((day) => {
              const parts = LINK_CLICK_EVENT_TYPES.filter((t) => day.clicks[t] > 0).map(
                (t) => `${LINK_CLICK_LABELS[t]} ×${day.clicks[t]}`,
              );
              return (
                <li key={day.date} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {losAngelesWeekday(day.date)}, {losAngelesDayLabel(day.date)}
                    </p>
                    {parts.length > 0 ? (
                      <p className="text-xs text-muted-foreground mt-0.5">{parts.join(" · ")}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">No clicks</p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-primary shrink-0">
                    {day.total} {day.total === 1 ? "click" : "clicks"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};
