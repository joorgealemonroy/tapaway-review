import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CompetitorTabProps {
  restaurantId: string;
}

interface Competitor {
  id: string;
  competitor_name: string;
  competitor_link: string | null;
  current_review_count: number;
  rating: number | null;
  last_checked_at: string | null;
}

export const CompetitorTab = ({ restaurantId }: CompetitorTabProps) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchCompetitors();
  }, [restaurantId]);

  const fetchCompetitors = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('competitors')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('current_review_count', { ascending: false });

      if (error) throw error;
      setCompetitors(data || []);
    } catch (error) {
      console.error('Error fetching competitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCompetitorData = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('update-competitors', {
        body: { restaurantId }
      });

      if (error) throw error;

      toast.success('Competitor data updated');
      fetchCompetitors();
    } catch (error) {
      console.error('Error updating competitors:', error);
      toast.error('Failed to update competitor data');
    } finally {
      setUpdating(false);
    }
  };

  const chartData = competitors.map(c => ({
    name: c.competitor_name,
    reviews: c.current_review_count
  }));

  if (loading) {
    return <div className="text-muted-foreground">Loading competitor data...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl md:text-2xl font-bold">Competitor Analysis</h2>
        <Button onClick={updateCompetitorData} disabled={updating} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
          Update Data
        </Button>
      </div>

      {competitors.length === 0 ? (
        <Card className="p-6 md:p-8 text-center">
          <TrendingUp className="w-10 h-10 md:w-12 md:h-12 mx-auto text-muted-foreground mb-3 md:mb-4" />
          <p className="text-muted-foreground text-sm md:text-base">No competitor data available yet.</p>
          <p className="text-xs md:text-sm text-muted-foreground mt-2">
            AI Coach will automatically identify and track your local competitors.
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-4 md:p-6 bg-accent/50 border-accent">
            <p className="text-sm md:text-base text-muted-foreground">
              <strong>Note:</strong> Competitor comparison is currently based on lifetime review counts. 
              Monthly 5-star comparison coming soon - check back once you've collected more reviews this month.
            </p>
          </Card>
          
          <Card className="p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold mb-4">Review Count Comparison</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="reviews" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid gap-3 md:gap-4">
            {competitors.map((competitor) => (
              <Card key={competitor.id} className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base md:text-lg">{competitor.competitor_name}</h3>
                    {competitor.competitor_link && (
                      <a
                        href={competitor.competitor_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs md:text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                      >
                        View on Google Maps
                      </a>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-xl md:text-2xl font-bold text-primary">{competitor.current_review_count}</div>
                    <p className="text-xs md:text-sm text-muted-foreground">Total Reviews</p>
                    {competitor.rating && (
                      <p className="text-sm mt-1">⭐ {competitor.rating.toFixed(1)}</p>
                    )}
                  </div>
                </div>
                {competitor.last_checked_at && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Last updated: {new Date(competitor.last_checked_at).toLocaleDateString()}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};