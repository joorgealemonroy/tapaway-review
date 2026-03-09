import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, MousePointer, Star, Instagram, MapPin, Menu, Activity, Calendar } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface AnalyticsData {
  totalTaps: number;
  googleClicks: number;
  yelpClicks: number;
  instagramClicks: number;
  directionsClicks: number;
  menuViews: number;
  chartData: Array<{ date: string; taps: number }>;
  mostClicked: string;
  peakDay: string;
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
}

export const AnalyticsOverview = ({ restaurantId, restaurantName, restaurant, user, isDemoView = false }: AnalyticsOverviewProps) => {
  const [daysBack, setDaysBack] = useState(7);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalTaps: 0,
    googleClicks: 0,
    yelpClicks: 0,
    instagramClicks: 0,
    directionsClicks: 0,
    menuViews: 0,
    chartData: [],
    mostClicked: "Google Review",
    peakDay: "Monday"
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
    fetchAnalytics();
  }, [restaurantId, daysBack]);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("analytics_events")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // Event types must match the edge function whitelist: tap, google_click, yelp_click, directions_click, instagram_click, menu_view, menu_close
        const tapEvents = data.filter((e: any) => e.event_type === "tap");
        const googleClicks = data.filter((e: any) => e.event_type === "google_click").length;
        const yelpClicks = data.filter((e: any) => e.event_type === "yelp_click").length;
        const instagramClicks = data.filter((e: any) => e.event_type === "instagram_click").length;
        const directionsClicks = data.filter((e: any) => e.event_type === "directions_click").length;
        const menuViews = data.filter((e: any) => e.event_type === "menu_view").length;

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysBack);
        const recentData = data.filter(e => new Date(e.created_at) >= cutoff);

        const dateGroups: { [key: string]: number } = {};
        recentData.forEach(event => {
          const date = new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          dateGroups[date] = (dateGroups[date] || 0) + 1;
        });

        const chartData: Array<{ date: string; taps: number }> = [];
        for (let i = daysBack - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          chartData.push({ date: label, taps: dateGroups[label] || 0 });
        }

        const clicks = [
          { name: "Google Review", count: googleClicks },
          { name: "Yelp", count: yelpClicks },
          { name: "Instagram", count: instagramClicks },
          { name: "Directions", count: directionsClicks },
          { name: "Menu", count: menuViews }
        ];
        const mostClicked = clicks.reduce((max, item) => item.count > max.count ? item : max, clicks[0]).name;

        const dayGroups: { [key: string]: number } = {};
        recentData.forEach(event => {
          const day = new Date(event.created_at).toLocaleDateString('en-US', { weekday: 'long' });
          dayGroups[day] = (dayGroups[day] || 0) + 1;
        });
        const peakDay = Object.entries(dayGroups).reduce((max, [day, count]) => 
          count > (dayGroups[max] || 0) ? day : max, 'Monday'
        );

        const last7DaysTaps = tapEvents.filter(e => new Date(e.created_at) >= cutoff);
        
        setAnalytics({
          totalTaps: last7DaysTaps.length,
          googleClicks,
          yelpClicks,
          instagramClicks,
          directionsClicks,
          menuViews,
          chartData,
          mostClicked,
          peakDay
        });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

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
              You've had <span className="font-semibold text-primary">{analytics.totalTaps} taps</span> in the last {daysBack} days.
              {analytics.totalTaps > 0 && (
                <>
                  {" "}Your most clicked button is <span className="font-semibold text-primary">{analytics.mostClicked}</span>, 
                  and your peak day is <span className="font-semibold text-primary">{analytics.peakDay}</span>.
                </>
              )}
            </p>
          </div>
        </div>
      </Card>

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
          <p className="text-2xl font-bold">{analytics.mostClicked}</p>
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
          <p className="text-2xl font-bold">{analytics.peakDay}</p>
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
              <XAxis dataKey="date" className="fill-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
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
    </div>
  );
};