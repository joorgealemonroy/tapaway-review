import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Users, Star, RefreshCw, Lock, Sparkles, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getInsightBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const getTagColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isUnlocked = totalTaps >= 1000;

  if (!isUnlocked) {
    return (
      <div className="space-y-6 pb-8 animate-fade-in">
        <Card className="p-8 text-center gradient-subtle border-none shadow-lg">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full gradient-primary flex items-center justify-center">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">AI Coach Locked</h2>
          <p className="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto">
            AI Coach unlocks after <span className="font-bold text-primary">1,000 taps</span> so we have enough data to give you real insights.
          </p>
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm mb-3">
              <span className="font-semibold">{totalTaps.toLocaleString()} taps</span>
              <span className="font-semibold">1,000 taps</span>
            </div>
            <Progress value={(totalTaps / 1000) * 100} className="h-4 mb-3" />
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold">{(1000 - totalTaps).toLocaleString()} more taps to unlock</span>
            </div>
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

  const scoreCards = [
    { label: "Health Score", value: scores.health, icon: TrendingUp },
    { label: "Staff Engagement", value: scores.staffEngagement, icon: Users },
    { label: "Review Quality", value: scores.reviewQuality, icon: Star },
    { label: "Activity", value: scores.activity, icon: Target },
  ];

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" />
            AI Coach
          </h2>
          <p className="text-muted-foreground">Personalized tips to grow your restaurant</p>
        </div>
        <Button onClick={regenerateInsights} disabled={generating} className="gradient-primary text-white">
          <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
          Refresh Tips
        </Button>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {scoreCards.map((scoreCard) => {
          const Icon = scoreCard.icon;
          return (
            <Card key={scoreCard.label} className="p-4 sm:p-6 card-elevated transition-smooth hover:scale-105">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{scoreCard.label}</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-3xl font-bold ${getScoreColor(scoreCard.value)}`}>
                  {scoreCard.value}
                </p>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <Progress value={scoreCard.value} className="h-2 mt-3" />
            </Card>
          );
        })}
      </div>

      {/* Insights */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Your Personalized Insights</h3>
        {insights.length === 0 ? (
          <Card className="p-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No insights available yet. Keep growing your business!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <Collapsible key={index} open={openItems.has(index)} onOpenChange={() => toggleItem(index)}>
                <Card className={`overflow-hidden border-2 transition-smooth ${getInsightBgColor(insight.type)}`}>
                  <CollapsibleTrigger className="w-full p-4 sm:p-6 text-left hover:bg-white/50 transition-smooth">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-base sm:text-lg pr-2">{insight.title}</h4>
                          <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform ${openItems.has(index) ? 'rotate-180' : ''}`} />
                        </div>
                        <Badge className={`${getTagColor(insight.type)} text-xs`}>
                          {insight.type === 'success' ? 'Going Great' : insight.type === 'warning' ? 'Needs Attention' : 'Pro Tip'}
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
                      <div className="pl-8">
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{insight.content}</p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};