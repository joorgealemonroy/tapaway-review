import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, MousePointerClick, Activity, Target } from "lucide-react";

interface AvMealPrepDashboardProps {
  restaurantId: string;
  restaurantName: string;
}

interface AnalyticsData {
  totalTaps: number;
  totalClicks: number;
  mostClickedButton: string;
  peakDay: string;
  chartData: Array<{ date: string; taps: number }>;
}

export const AvMealPrepDashboard = ({ restaurantId, restaurantName }: AvMealPrepDashboardProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalTaps: 0,
    totalClicks: 0,
    mostClickedButton: "N/A",
    peakDay: "N/A",
    chartData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [restaurantId]);

  const fetchAnalytics = async () => {
    try {
      const { data: events } = await supabase
        .from("analytics_events")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (events) {
        const tapEvents = events.filter((e) => e.event_type === "tap");
        const clickEvents = events.filter((e) => 
          ["google_click", "yelp_click", "instagram_click", "directions_click", "menu_view"].includes(e.event_type)
        );

        // Calculate most clicked button
        const clickCounts: Record<string, number> = {};
        clickEvents.forEach((e) => {
          clickCounts[e.event_type] = (clickCounts[e.event_type] || 0) + 1;
        });
        const mostClicked = Object.entries(clickCounts).sort((a, b) => b[1] - a[1])[0];

        // Calculate peak day
        const dayCounts: Record<string, number> = {};
        tapEvents.forEach((e) => {
          const day = new Date(e.created_at).toLocaleDateString("en-US", { weekday: "long" });
          dayCounts[day] = (dayCounts[day] || 0) + 1;
        });
        const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

        // Last 7 days chart data
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split("T")[0];
        });

        const chartData = last7Days.map((date) => ({
          date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          taps: tapEvents.filter((e) => e.created_at.startsWith(date)).length,
        }));

        setAnalytics({
          totalTaps: tapEvents.length,
          totalClicks: clickEvents.length,
          mostClickedButton: mostClicked ? formatButtonName(mostClicked[0]) : "N/A",
          peakDay: peakDay ? peakDay[0] : "N/A",
          chartData,
        });
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatButtonName = (eventType: string) => {
    const map: Record<string, string> = {
      google_click: "Google Reviews",
      yelp_click: "Yelp",
      instagram_click: "Instagram",
      directions_click: "Directions",
      menu_view: "Menu",
    };
    return map[eventType] || eventType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-2">Welcome to Your Dashboard</h2>
        <p className="text-muted-foreground">
          Track campaign performance and engagement for {restaurantName}
        </p>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Campaign Taps</p>
              <p className="text-2xl font-bold">{analytics.totalTaps}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <MousePointerClick className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Link Clicks</p>
              <p className="text-2xl font-bold">{analytics.totalClicks}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Most Clicked</p>
              <p className="text-lg font-semibold">{analytics.mostClickedButton}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Peak Day</p>
              <p className="text-lg font-semibold">{analytics.peakDay}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Campaign Activity (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="taps" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Info Card */}
      <Card className="p-6 bg-primary/5">
        <h3 className="text-lg font-semibold mb-2">About Your Dashboard</h3>
        <p className="text-muted-foreground">
          This dashboard tracks engagement from your TapAway campaign links. All analytics are also available
          via your Telegram bot for real-time updates.
        </p>
      </Card>
    </div>
  );
};
