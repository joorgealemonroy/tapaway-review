import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, MousePointer, Star, Instagram, MapPin, Menu, Activity, Calendar } from "lucide-react";

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
  }, [restaurantId]);

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

        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const recentData = data.filter(e => new Date(e.created_at) >= last7Days);

        const dateGroups: { [key: string]: number } = {};
        recentData.forEach(event => {
          const date = new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          dateGroups[date] = (dateGroups[date] || 0) + 1;
        });

        const chartData = Object.entries(dateGroups).map(([date, taps]) => ({ date, taps }));

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

        // Count taps from last 7 days (tap events specifically, not all events)
        const last7DaysTaps = tapEvents.filter(e => new Date(e.created_at) >= last7Days);
        
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
      <Card className="p-4 sm:p-8 gradient-subtle border-none shadow-lg animate-scale-in">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full gradient-primary flex items-center justify-center">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">
              Hi, {greetingName}! 👋
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              You've had <span className="font-semibold text-primary">{analytics.totalTaps} taps</span> in the last 7 days.
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
        <Card className="p-6 card-elevated transition-smooth hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Total Taps</p>
            </div>
          </div>
          <p className="text-4xl font-bold text-primary">{analytics.totalTaps}</p>
          <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
        </Card>

        <Card className="p-6 card-elevated transition-smooth hover:scale-105">
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

        <Card className="p-6 card-elevated transition-smooth hover:scale-105">
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
      {analytics.chartData.length > 0 && (
        <Card className="p-6 card-elevated">
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-1">Activity Over Time</h3>
            <p className="text-sm text-muted-foreground">Daily tap activity for the last 7 days</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.chartData}>
              <defs>
                <linearGradient id="colorTaps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(182 85% 39%)" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="hsl(182 85% 39%)" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="date" stroke="hsl(215 16% 47%)" fontSize={12} />
              <YAxis stroke="hsl(215 16% 47%)" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid hsl(214 32% 91%)',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Bar dataKey="taps" fill="url(#colorTaps)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

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