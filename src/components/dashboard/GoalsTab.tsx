import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface GoalsTabProps {
  restaurantId: string;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  goal_type: string;
  target_value: number | null;
  current_value: number;
  status: string;
  created_at: string;
}

export const GoalsTab = ({ restaurantId }: GoalsTabProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', target_value: '' });

  useEffect(() => {
    fetchGoals();
  }, [restaurantId]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('goals')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoal.title) {
      toast.error('Please enter a goal title');
      return;
    }

    try {
      const { error } = await (supabase as any).from('goals').insert({
        restaurant_id: restaurantId,
        title: newGoal.title,
        description: newGoal.description || null,
        goal_type: 'custom',
        target_value: newGoal.target_value ? parseFloat(newGoal.target_value) : null,
        current_value: 0,
        status: 'on_track'
      });

      if (error) throw error;

      toast.success('Goal created successfully');
      setDialogOpen(false);
      setNewGoal({ title: '', description: '', target_value: '' });
      fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create goal');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast.success('Goal deleted');
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  const calculateProgress = (goal: Goal) => {
    if (!goal.target_value) return 0;
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

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
          <p className="text-muted-foreground">Track your restaurant's objectives</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="goal-title">Goal Title</Label>
                <Input
                  id="goal-title"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="e.g., Reach 100 5-star reviews"
                />
              </div>
              <div>
                <Label htmlFor="goal-desc">Description (Optional)</Label>
                <Textarea
                  id="goal-desc"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="Add more details about this goal..."
                />
              </div>
              <div>
                <Label htmlFor="goal-target">Target Number (Optional)</Label>
                <Input
                  id="goal-target"
                  type="number"
                  value={newGoal.target_value}
                  onChange={(e) => setNewGoal({ ...newGoal, target_value: e.target.value })}
                  placeholder="100"
                />
              </div>
              <Button onClick={handleCreateGoal} className="w-full">Create Goal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <Card className="p-8 text-center gradient-subtle border-none shadow-lg">
          <Target className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-bold mb-2">No Goals Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            Set goals to track your restaurant's growth and stay motivated!
          </p>
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Goal
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {goals.map((goal) => (
            <Card key={goal.id} className="p-6 card-elevated transition-smooth hover:scale-[1.01]">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-bold mb-1">{goal.title}</h4>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground mb-2">{goal.description}</p>
                  )}
                  <Badge variant="outline">
                    {goal.status === 'achieved' ? '✅ Achieved' : goal.status === 'on_track' ? '📈 On Track' : '⚠️ At Risk'}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {goal.target_value && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">
                      {goal.current_value} / {goal.target_value}
                    </span>
                  </div>
                  <Progress value={calculateProgress(goal)} className="h-3" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};