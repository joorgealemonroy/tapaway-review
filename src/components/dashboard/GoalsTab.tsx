import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Target, Star, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks } from "date-fns";

interface GoalsTabProps {
  restaurantId: string;
}

interface GoalData {
  id: string;
  goal_type: string;
  target_value: number;
  current_value: number;
}

interface Metrics {
  reviewsThisMonth: number;
  averageRating: number;
  tapsThisWeek: number;
  tapsLastWeek: number;
}

export const GoalsTab = ({ restaurantId }: GoalsTabProps) => {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    reviewsThisMonth: 0,
    averageRating: 0,
    tapsThisWeek: 0,
    tapsLastWeek: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modal state
  const [activeModal, setActiveModal] = useState<'reviews' | 'rating' | 'taps' | null>(null);
  const [modalValue, setModalValue] = useState<number>(0);
  const [validationError, setValidationError] = useState<string>("");

  const fetchGoals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('goal_type', ['reviews', 'rating', 'taps']);

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('[GoalsTab] Error fetching goals:', error);
    }
  }, [restaurantId]);

  const fetchMetrics = useCallback(async () => {
    try {
      const now = new Date();
      
      // Current month boundaries
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();
      
      // Current week boundaries (Monday-Sunday)
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
      
      // Last week boundaries for suggestion
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }).toISOString();
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }).toISOString();

      // Fetch reviews this month from google_reviews
      const { data: monthlyReviews, error: reviewsError } = await supabase
        .from('google_reviews')
        .select('id, rating')
        .eq('restaurant_id', restaurantId)
        .gte('review_time', monthStart)
        .lte('review_time', monthEnd);

      if (reviewsError) {
        console.error('[GoalsTab] Error fetching monthly reviews:', reviewsError);
      }

      // Fetch ALL reviews for average rating calculation
      const { data: allReviews, error: allReviewsError } = await supabase
        .from('google_reviews')
        .select('rating')
        .eq('restaurant_id', restaurantId);

      if (allReviewsError) {
        console.error('[GoalsTab] Error fetching all reviews:', allReviewsError);
      }

      // Calculate average rating from all reviews
      const ratings = allReviews?.map(r => r.rating).filter(r => r != null) || [];
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

      // Fetch taps this week from analytics_events
      const { data: weeklyTaps, error: tapsError } = await supabase
        .from('analytics_events')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('event_type', 'tap')
        .gte('created_at', weekStart)
        .lte('created_at', weekEnd);

      if (tapsError) {
        console.error('[GoalsTab] Error fetching weekly taps:', tapsError);
      }

      // Fetch last week's taps for suggestion
      const { data: lastWeekTaps, error: lastTapsError } = await supabase
        .from('analytics_events')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('event_type', 'tap')
        .gte('created_at', lastWeekStart)
        .lte('created_at', lastWeekEnd);

      if (lastTapsError) {
        console.error('[GoalsTab] Error fetching last week taps:', lastTapsError);
      }

      setMetrics({
        reviewsThisMonth: monthlyReviews?.length || 0,
        averageRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        tapsThisWeek: weeklyTaps?.length || 0,
        tapsLastWeek: lastWeekTaps?.length || 0
      });
    } catch (error) {
      console.error('[GoalsTab] Error fetching metrics:', error);
    }
  }, [restaurantId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchGoals(), fetchMetrics()]);
      setLoading(false);
    };
    loadData();
  }, [fetchGoals, fetchMetrics]);

  const getGoalTarget = (goalType: string): number => {
    const goal = goals.find(g => g.goal_type === goalType);
    return goal?.target_value ?? 0;
  };

  const openModal = (type: 'reviews' | 'rating' | 'taps') => {
    const existingTarget = getGoalTarget(type);
    let defaultValue = existingTarget;

    if (!existingTarget || existingTarget === 0) {
      // Suggest smart defaults
      switch (type) {
        case 'reviews':
          defaultValue = 5; // Reasonable monthly target
          break;
        case 'rating':
          // Suggest current + 0.2 (capped at 5.0)
          defaultValue = Math.min(5.0, Math.round((metrics.averageRating + 0.2) * 10) / 10);
          if (metrics.averageRating === 0) defaultValue = 4.5;
          break;
        case 'taps':
          // Suggest last week + 10%, minimum 10
          defaultValue = Math.max(10, Math.ceil(metrics.tapsLastWeek * 1.1));
          break;
      }
    }

    setModalValue(defaultValue);
    setValidationError("");
    setActiveModal(type);
  };

  const validateModalValue = (type: 'reviews' | 'rating' | 'taps', value: number): string => {
    if (isNaN(value) || value <= 0) {
      return "Please enter a valid positive number";
    }

    if (type === 'rating') {
      const minTarget = metrics.averageRating || 1;
      const maxTarget = Math.min(5.0, minTarget + 0.5);
      
      if (value < minTarget) {
        return `Target cannot be lower than your current rating (${minTarget.toFixed(1)})`;
      }
      if (value > maxTarget) {
        return `Target can be at most ${maxTarget.toFixed(1)} (current + 0.5)`;
      }
      if (value > 5.0) {
        return "Rating cannot exceed 5.0";
      }
    }

    if (type === 'reviews' && !Number.isInteger(value)) {
      return "Please enter a whole number";
    }

    if (type === 'taps' && !Number.isInteger(value)) {
      return "Please enter a whole number";
    }

    return "";
  };

  const handleSaveGoal = async () => {
    if (!activeModal) return;

    const error = validateModalValue(activeModal, modalValue);
    if (error) {
      setValidationError(error);
      return;
    }

    setSaving(true);
    try {
      // Check if goal exists
      const { data: existing } = await supabase
        .from('goals')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('goal_type', activeModal)
        .maybeSingle();

      if (existing) {
        // Update existing goal
        const { error: updateError } = await supabase
          .from('goals')
          .update({ 
            target_value: modalValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Create new goal
        const titles: Record<string, string> = {
          reviews: 'Google Reviews This Month',
          rating: 'Average Rating Target',
          taps: 'Taps Per Week'
        };
        
        const { error: insertError } = await supabase
          .from('goals')
          .insert({
            restaurant_id: restaurantId,
            title: titles[activeModal],
            goal_type: activeModal,
            target_value: modalValue,
            current_value: 0,
            status: 'on_track'
          });

        if (insertError) throw insertError;
      }

      toast.success('Goal saved successfully');
      setActiveModal(null);
      await fetchGoals();
    } catch (error) {
      console.error('[GoalsTab] Error saving goal:', error);
      toast.error('Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const calculateProgress = (current: number, target: number): number => {
    if (!target || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getCurrentValue = (type: string): number => {
    switch (type) {
      case 'reviews':
        return metrics.reviewsThisMonth;
      case 'rating':
        return metrics.averageRating;
      case 'taps':
        return metrics.tapsThisWeek;
      default:
        return 0;
    }
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          const currentValue = getCurrentValue(config.type);
          const targetValue = getGoalTarget(config.type);
          const progress = calculateProgress(currentValue, targetValue);

          return (
            <Card key={config.type} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${config.bgColor}`}>
                  <Icon className={`w-6 h-6 ${config.color}`} />
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openModal(config.type)}
                >
                  Set Target
                </Button>
              </div>

              <h3 className="font-semibold mb-1">{config.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{config.description}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">
                    {config.type === 'rating' 
                      ? `${currentValue.toFixed(1)} / ${targetValue > 0 ? targetValue.toFixed(1) : '—'}` 
                      : `${Math.round(currentValue)} / ${targetValue > 0 ? Math.round(targetValue) : '—'}`
                    }
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {targetValue > 0 ? `${progress.toFixed(0)}% complete` : 'Set a target to track progress'}
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

      {/* Reviews Modal */}
      <Dialog open={activeModal === 'reviews'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Monthly Google Reviews Goal</DialogTitle>
            <DialogDescription>
              How many Google reviews would you like to collect this month?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              You've collected <strong>{metrics.reviewsThisMonth}</strong> reviews this month so far.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reviews-target">Monthly reviews goal</Label>
              <Input
                id="reviews-target"
                type="number"
                min="1"
                step="1"
                value={modalValue}
                onChange={(e) => {
                  setModalValue(parseInt(e.target.value) || 0);
                  setValidationError("");
                }}
                placeholder="e.g., 10"
              />
              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button onClick={handleSaveGoal} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Modal */}
      <Dialog open={activeModal === 'rating'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Average Rating Goal</DialogTitle>
            <DialogDescription>
              Set a realistic target within 0.5 stars of your current rating.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Your current average Google rating is <strong>{metrics.averageRating > 0 ? metrics.averageRating.toFixed(1) : 'not yet available'}</strong>.
            </p>
            {metrics.averageRating > 0 && (
              <p className="text-sm text-muted-foreground">
                You can set a target between <strong>{metrics.averageRating.toFixed(1)}</strong> and <strong>{Math.min(5.0, metrics.averageRating + 0.5).toFixed(1)}</strong>.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="rating-target">Target rating</Label>
              <Input
                id="rating-target"
                type="number"
                min={metrics.averageRating || 1}
                max={Math.min(5.0, (metrics.averageRating || 4.5) + 0.5)}
                step="0.1"
                value={modalValue}
                onChange={(e) => {
                  setModalValue(parseFloat(e.target.value) || 0);
                  setValidationError("");
                }}
                placeholder="e.g., 4.5"
              />
              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button onClick={handleSaveGoal} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Taps Modal */}
      <Dialog open={activeModal === 'taps'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Weekly Tap Goal</DialogTitle>
            <DialogDescription>
              How many NFC taps would you like to achieve each week?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Your customers tapped your NFC card <strong>{metrics.tapsThisWeek}</strong> times this week
              {metrics.tapsLastWeek > 0 && ` (${metrics.tapsLastWeek} last week)`}.
            </p>
            <div className="space-y-2">
              <Label htmlFor="taps-target">Weekly tap goal</Label>
              <Input
                id="taps-target"
                type="number"
                min="1"
                step="1"
                value={modalValue}
                onChange={(e) => {
                  setModalValue(parseInt(e.target.value) || 0);
                  setValidationError("");
                }}
                placeholder="e.g., 50"
              />
              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button onClick={handleSaveGoal} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
