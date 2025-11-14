import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, RefreshCw, ExternalLink, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-primary" />
            Competitor Analysis
          </h2>
          <p className="text-muted-foreground">See how you stack up against local competition</p>
        </div>
        <Button onClick={updateCompetitorData} disabled={updating} className="gradient-primary text-white">
          <RefreshCw className={`w-4 h-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
          Update Data
        </Button>
      </div>

      {competitors.length === 0 ? (
        <Card className="p-8 text-center gradient-subtle border-none shadow-lg">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-bold mb-2">No Competitor Data Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            AI Coach will automatically identify and track your local competitors as you collect more data.
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold mb-1">Competitive Insights</p>
                <p className="text-sm text-muted-foreground">
                  Currently showing lifetime review counts. Monthly 5-star comparison coming soon!
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 card-elevated">
            <h3 className="text-lg font-bold mb-6">Review Count Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <defs>
                  <linearGradient id="competitorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(182 85% 39%)" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="hsl(182 85% 39%)" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                <XAxis dataKey="name" angle={-20} textAnchor="end" height={100} fontSize={11} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="reviews" fill="url(#competitorGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid gap-4">
            {competitors.map((comp) => (
              <Card key={comp.id} className="p-6 card-elevated transition-smooth hover:scale-[1.02]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold mb-2">{comp.competitor_name}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <Badge variant="outline" className="gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {comp.current_review_count} reviews
                      </Badge>
                      {comp.rating && (
                        <Badge variant="outline" className="gap-1">
                          ⭐ {comp.rating.toFixed(1)}
                        </Badge>
                      )}
                      {comp.last_checked_at && (
                        <span className="text-muted-foreground text-xs">
                          Updated {new Date(comp.last_checked_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {comp.competitor_link && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={comp.competitor_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};