import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Users, Star, RefreshCw, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

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
  const [totalTaps, setTotalTaps] = useState(0);
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchTotalTaps();
    fetchAIInsights();
  }, [restaurantId, locationId]);

  const fetchTotalTaps = async () => {
    try {
      const { count } = await (supabase as any)
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId);
      
      setTotalTaps(count || 0);
    } catch (error) {
      console.error('Error fetching taps:', error);
    }
  };

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

  const isUnlocked = totalTaps >= 1000;

  if (!isUnlocked) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">AI Coach Locked</h2>
          <p className="text-muted-foreground mb-4">
            AI Coach unlocks after 1,000 taps so we have enough data to give you real insights.
          </p>
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span>{totalTaps.toLocaleString()} taps</span>
              <span>1,000 taps</span>
            </div>
            <Progress value={(totalTaps / 1000) * 100} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              {(1000 - totalTaps).toLocaleString()} more taps to unlock
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const toggleItem = (index: number) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(index)) {
      newOpen.delete(index);
    } else {
      newOpen.add(index);
    }
    setOpenItems(newOpen);
  };

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AI Review Coach</h2>
        <Button onClick={regenerateInsights} disabled={generating} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
          Refresh Insights
        </Button>
      </div>

      {/* Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className={`text-2xl font-bold ${getScoreColor(scores.health)}`}>
              {scores.health}
            </span>
          </div>
          <p className="text-sm font-medium">Health Score</p>
          <Progress value={scores.health} className="mt-2" />
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-primary" />
            <span className={`text-2xl font-bold ${getScoreColor(scores.staffEngagement)}`}>
              {scores.staffEngagement}
            </span>
          </div>
          <p className="text-sm font-medium">Staff Engagement</p>
          <Progress value={scores.staffEngagement} className="mt-2" />
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-5 h-5 text-primary" />
            <span className={`text-2xl font-bold ${getScoreColor(scores.reviewQuality)}`}>
              {scores.reviewQuality}
            </span>
          </div>
          <p className="text-sm font-medium">Review Quality</p>
          <Progress value={scores.reviewQuality} className="mt-2" />
        </Card>

        <Card className="p-4 md:p-6">
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

      {/* AI Insights - Accordion Style */}
      <div className="space-y-3 md:space-y-4">
        {insights.map((insight, index) => (
          <Card key={index} className="overflow-hidden">
            <Collapsible open={openItems.has(index)} onOpenChange={() => toggleItem(index)}>
              <CollapsibleTrigger className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-accent/50 transition-colors">
                <h3 className="font-semibold text-base md:text-lg text-left">{insight.title}</h3>
                <ChevronDown className={`w-5 h-5 transition-transform ${openItems.has(index) ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 md:px-6 pb-4 md:pb-6">
                <p className="text-muted-foreground whitespace-pre-line text-sm md:text-base leading-relaxed">{insight.content}</p>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
};