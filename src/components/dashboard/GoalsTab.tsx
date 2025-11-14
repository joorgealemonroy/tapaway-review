import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Target, Star, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface GoalsTabProps {
  restaurantId: string;
}

interface GoalData {
  id: string;
  goal_type: 'reviews' | 'rating' | 'taps';
  target_value: number;
  current_value: number;
}

export const GoalsTab = ({ restaurantId }: GoalsTabProps) => {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const [targetValues, setTargetValues] = useState<Record<string, number>>({
    reviews: 20,
    rating: 4.5,
    taps: 50
  });

  useEffect(() => {
    fetchGoals();
    fetchCurrentMetrics();
  }, [restaurantId]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('goals')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('goal_type', ['reviews', 'rating', 'taps']);

      if (error) throw error;

      if (data && data.length > 0) {
        setGoals(data);
        const targets: Record<string, number> = {};
        data.forEach((goal: GoalData) => {
          targets[goal.goal_type] = goal.target_value;
        });
        setTargetValues(targets);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentMetrics = async () => {
    try {
      // Fetch actual metrics from analytics and review data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get tap count from analytics
      const { data: tapData } = await (supabase as any)
        .from('analytics_events')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('event_type', 'tap')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get review count and average rating
      const { data: reviewData } = await (supabase as any)
        .from('review_sentiments')
        .select('rating, platform')
        .eq('restaurant_id', restaurantId)
        .eq('platform', 'google')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const tapCount = tapData?.length || 0;
      const reviewCount = reviewData?.length || 0;
      const avgRating = reviewData && reviewData.length > 0
        ? reviewData.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviewData.length
        : 0;

      // Update goals with current values
      updateGoalCurrentValues(reviewCount, avgRating, tapCount);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const updateGoalCurrentValues = async (reviewCount: number, avgRating: number, tapCount: number) => {
    const updates = [
      { goal_type: 'reviews', current_value: reviewCount },
      { goal_type: 'rating', current_value: avgRating },
      { goal_type: 'taps', current_value: tapCount }
    ];

    for (const update of updates) {
      await (supabase as any)
        .from('goals')
        .update({ current_value: update.current_value })
        .eq('restaurant_id', restaurantId)
        .eq('goal_type', update.goal_type);
    }

    fetchGoals();
  };

  const handleSaveGoal = async (goalType: 'reviews' | 'rating' | 'taps') => {
    const targetValue = targetValues[goalType];
    
    if (!targetValue || targetValue <= 0) {
      toast.error('Please enter a valid target value');
      return;
    }

    try {
      // Check if goal exists
      const { data: existing } = await (supabase as any)
        .from('goals')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('goal_type', goalType)
        .single();

      if (existing) {
        // Update existing goal
        const { error } = await (supabase as any)
          .from('goals')
          .update({ target_value: targetValue })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new goal
        const titles = {
          reviews: 'Get More Google Reviews',
          rating: 'Reach Target Rating',
          taps: 'Increase Weekly Taps'
        };
        
        const { error } = await (supabase as any)
          .from('goals')
          .insert({
            restaurant_id: restaurantId,
            title: titles[goalType],
            goal_type: goalType,
            target_value: targetValue,
            current_value: 0,
            status: 'on_track'
          });

        if (error) throw error;
      }

      toast.success('Goal updated successfully');
      setDialogOpen(null);
      fetchGoals();
      fetchCurrentMetrics();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('Failed to save goal');
    }
  };

  const calculateProgress = (current: number, target: number) => {
    if (!target) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const goalConfigs = [
    {
      type: 'reviews' as const,
      icon: Star,
      title: 'Google Reviews This Month',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: 'Track new Google reviews collected this month'
    },
    {
      type: 'rating' as const,
      icon: TrendingUp,
      title: 'Average Rating Target',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Maintain or reach your desired rating'
    },
    {
      type: 'taps' as const,
      icon: Target,
      title: 'Taps Per Week',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Customer engagement through NFC taps'
    }
  ];

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
            <Target className="w-7 h-7 text-primary" />
            Goals
          </h2>
          <p className="text-muted-foreground">Track your restaurant's growth with data-driven goals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {goalConfigs.map((config) => {
          const Icon = config.icon;
          const goal = goals.find(g => g.goal_type === config.type);
          const currentValue = goal?.current_value || 0;
          const targetValue = goal?.target_value || targetValues[config.type];
          const progress = calculateProgress(currentValue, targetValue);

          return (
            <Card key={config.type} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${config.bgColor}`}>
                  <Icon className={`w-6 h-6 ${config.color}`} />
                </div>
                <Dialog open={dialogOpen === config.type} onOpenChange={(open) => setDialogOpen(open ? config.type : null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Set Target</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Set Target for {config.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor={`target-${config.type}`}>
                          Target {config.type === 'rating' ? 'Rating (1-5)' : 'Count'}
                        </Label>
                        <Input
                          id={`target-${config.type}`}
                          type="number"
                          min={config.type === 'rating' ? '1' : '1'}
                          max={config.type === 'rating' ? '5' : undefined}
                          step={config.type === 'rating' ? '0.1' : '1'}
                          value={targetValues[config.type]}
                          onChange={(e) => setTargetValues({
                            ...targetValues,
                            [config.type]: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>
                      <Button onClick={() => handleSaveGoal(config.type)} className="w-full">
                        Save Goal
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <h3 className="font-semibold mb-1">{config.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{config.description}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">
                    {config.type === 'rating' 
                      ? `${currentValue.toFixed(1)} / ${targetValue.toFixed(1)}` 
                      : `${Math.round(currentValue)} / ${Math.round(targetValue)}`
                    }
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {progress.toFixed(0)}% complete
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900 text-center">
          <strong>Don't worry</strong> — we're adding more goal types soon. These three are just the beginning! 🎯
        </p>
      </Card>
    </div>
  );
};
