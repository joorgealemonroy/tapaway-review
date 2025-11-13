import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Users, Star, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface AICoachTabProps {
  restaurantId: string;
  locationId?: string;
}

interface Scores {
  health: number;
  staffEngagement: number;
  reviewQuality: number;
  activity: number;
}

interface Insight {
  title: string;
  content: string;
  type: 'success' | 'warning' | 'info';
}

export const AICoachTab = ({ restaurantId, locationId }: AICoachTabProps) => {
  const [scores, setScores] = useState<Scores>({ health: 0, staffEngagement: 0, reviewQuality: 0, activity: 0 });
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchAIInsights();
  }, [restaurantId, locationId]);

  const fetchAIInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-coach-insights', {
        body: { restaurantId, locationId }
      });

      if (error) throw error;

      setScores(data.scores);
      setInsights(data.insights);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      toast.error('Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  const regenerateInsights = async () => {
    setGenerating(true);
    await fetchAIInsights();
    setGenerating(false);
    toast.success('Insights refreshed');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading AI insights...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AI Review Coach</h2>
        <Button onClick={regenerateInsights} disabled={generating} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
          Refresh Insights
        </Button>
      </div>

      {/* Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className={`text-2xl font-bold ${getScoreColor(scores.health)}`}>
              {scores.health}
            </span>
          </div>
          <p className="text-sm font-medium">Health Score</p>
          <Progress value={scores.health} className="mt-2" />
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-primary" />
            <span className={`text-2xl font-bold ${getScoreColor(scores.staffEngagement)}`}>
              {scores.staffEngagement}
            </span>
          </div>
          <p className="text-sm font-medium">Staff Engagement</p>
          <Progress value={scores.staffEngagement} className="mt-2" />
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-5 h-5 text-primary" />
            <span className={`text-2xl font-bold ${getScoreColor(scores.reviewQuality)}`}>
              {scores.reviewQuality}
            </span>
          </div>
          <p className="text-sm font-medium">Review Quality</p>
          <Progress value={scores.reviewQuality} className="mt-2" />
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-primary" />
            <span className={`text-2xl font-bold ${getScoreColor(scores.activity)}`}>
              {scores.activity}
            </span>
          </div>
          <p className="text-sm font-medium">Activity Score</p>
          <Progress value={scores.activity} className="mt-2" />
        </Card>
      </div>

      {/* AI Insights */}
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <Card key={index} className="p-6">
            <h3 className="font-semibold text-lg mb-2">{insight.title}</h3>
            <p className="text-muted-foreground whitespace-pre-line">{insight.content}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};