import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, MousePointer, Star, Instagram, MapPin, Menu } from "lucide-react";

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

interface AnalyticsOverviewProps {
  restaurantId: string;
}

export const AnalyticsOverview = ({ restaurantId }: AnalyticsOverviewProps) => {
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

  useEffect(() => {
    fetchAnalytics();
  }, [restaurantId]);

  const fetchAnalytics = async () => {
    try {
      // Fetch all analytics events for this restaurant
      const { data, error } = await (supabase as any)
        .from("analytics_events")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // Calculate totals
        const googleClicks = data.filter((e: any) => e.event_type === "google_review_clicked").length;
        const yelpClicks = data.filter((e: any) => e.event_type === "yelp_clicked").length;
        const instagramClicks = data.filter((e: any) => e.event_type === "instagram_clicked").length;
        const directionsClicks = data.filter((e: any) => e.event_type === "directions_clicked").length;
        const menuViews = data.filter((e: any) => e.event_type === "menu_viewed").length;

        // Get last 7 days data
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const recentData = data.filter(e => new Date(e.created_at) >= last7Days);

        // Group by date for chart
        const dateGroups: { [key: string]: number } = {};
        recentData.forEach(event => {
          const date = new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          dateGroups[date] = (dateGroups[date] || 0) + 1;
        });

        const chartData = Object.entries(dateGroups).map(([date, taps]) => ({ date, taps }));

        // Calculate most clicked button
        const clicks = [
          { name: "Google Review", count: googleClicks },
          { name: "Yelp", count: yelpClicks },
          { name: "Instagram", count: instagramClicks },
          { name: "Directions", count: directionsClicks },
          { name: "Menu", count: menuViews }
        ];
        const mostClicked = clicks.reduce((max, item) => item.count > max.count ? item : max, clicks[0]).name;

        // Calculate peak day (simplified - would need more complex logic for real implementation)
        const dayGroups: { [key: string]: number } = {};
        recentData.forEach(event => {
          const day = new Date(event.created_at).toLocaleDateString('en-US', { weekday: 'long' });
          dayGroups[day] = (dayGroups[day] || 0) + 1;
        });
        const peakDay = Object.entries(dayGroups).reduce((max, [day, count]) => 
          count > (dayGroups[max] || 0) ? day : max, 'Monday'
        );

        setAnalytics({
          totalTaps: data.length,
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
    return <div className="text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Total Taps (7 days)</p>
              <p className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">{analytics.totalTaps}</p>
            </div>
            <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-primary shrink-0" />
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Most Clicked</p>
              <p className="text-lg md:text-xl font-semibold mt-1 md:mt-2">{analytics.mostClicked}</p>
            </div>
            <MousePointer className="w-6 h-6 md:w-8 md:h-8 text-primary shrink-0" />
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Peak Day</p>
              <p className="text-lg md:text-xl font-semibold mt-1 md:mt-2">{analytics.peakDay}</p>
            </div>
            <Star className="w-6 h-6 md:w-8 md:h-8 text-primary shrink-0" />
          </div>
        </Card>
      </div>

      {/* Individual Button Clicks */}
      <Card className="p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Button Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <div className="text-center">
            <Star className="w-5 h-5 md:w-6 md:h-6 mx-auto text-primary mb-2" />
            <p className="text-xl md:text-2xl font-bold">{analytics.googleClicks}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Google Reviews</p>
          </div>
          <div className="text-center">
            <Star className="w-5 h-5 md:w-6 md:h-6 mx-auto text-destructive mb-2" />
            <p className="text-xl md:text-2xl font-bold">{analytics.yelpClicks}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Yelp</p>
          </div>
          <div className="text-center">
            <Instagram className="w-5 h-5 md:w-6 md:h-6 mx-auto text-primary mb-2" />
            <p className="text-xl md:text-2xl font-bold">{analytics.instagramClicks}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Instagram</p>
          </div>
          <div className="text-center">
            <MapPin className="w-5 h-5 md:w-6 md:h-6 mx-auto text-primary mb-2" />
            <p className="text-xl md:text-2xl font-bold">{analytics.directionsClicks}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Directions</p>
          </div>
          <div className="text-center">
            <Menu className="w-5 h-5 md:w-6 md:h-6 mx-auto text-foreground mb-2" />
            <p className="text-xl md:text-2xl font-bold">{analytics.menuViews}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Menu Views</p>
          </div>
        </div>
      </Card>

      {/* Chart */}
      {analytics.chartData.length > 0 && (
        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Activity Over Time (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="taps" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
};