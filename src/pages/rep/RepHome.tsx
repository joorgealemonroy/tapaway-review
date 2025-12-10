import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, DollarSign, TrendingUp, Target, Calendar } from 'lucide-react';

interface RepStats {
  closesToday: number;
  closesThisMonth: number;
  lifetimeCloses: number;
  pendingCommission: number;
  paidCommission: number;
  bonusProgress: number;
  bonusThreshold: number;
}

const RepHome = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const [stats, setStats] = useState<RepStats>({
    closesToday: 0,
    closesThisMonth: 0,
    lifetimeCloses: 0,
    pendingCommission: 0,
    paidCommission: 0,
    bonusProgress: 0,
    bonusThreshold: 30,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!repLoading && !isSalesRep) {
      navigate('/');
      return;
    }
  }, [authLoading, repLoading, user, isSalesRep, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!salesRep) return;

      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const periodLabel = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        // Fetch closes today
        const { count: closesToday } = await supabase
          .from('rep_restaurants')
          .select('*', { count: 'exact', head: true })
          .eq('sales_rep_id', salesRep.id)
          .eq('status', 'closed')
          .gte('closed_at', todayStart);

        // Fetch closes this month
        const { count: closesThisMonth } = await supabase
          .from('rep_restaurants')
          .select('*', { count: 'exact', head: true })
          .eq('sales_rep_id', salesRep.id)
          .eq('status', 'closed')
          .gte('closed_at', monthStart);

        // Fetch lifetime closes
        const { count: lifetimeCloses } = await supabase
          .from('rep_restaurants')
          .select('*', { count: 'exact', head: true })
          .eq('sales_rep_id', salesRep.id)
          .eq('status', 'closed');

        // Fetch commissions
        const { data: commissions } = await supabase
          .from('commissions')
          .select('amount, status')
          .eq('rep_id', salesRep.id);

        const pendingCommission = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        const paidCommission = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount), 0) || 0;

        // Fetch bonus threshold from settings (we'll use default if not accessible)
        const bonusThreshold = 30; // Default value

        setStats({
          closesToday: closesToday || 0,
          closesThisMonth: closesThisMonth || 0,
          lifetimeCloses: lifetimeCloses || 0,
          pendingCommission,
          paidCommission,
          bonusProgress: closesThisMonth || 0,
          bonusThreshold,
        });
      } catch (error) {
        console.error('Error fetching rep stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (salesRep) {
      fetchStats();
    }
  }, [salesRep]);

  if (authLoading || repLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const bonusPercentage = Math.min((stats.bonusProgress / stats.bonusThreshold) * 100, 100);
  const hasEarnedBonus = stats.bonusProgress >= stats.bonusThreshold;
  const nextBonusAt = Math.ceil(stats.bonusProgress / stats.bonusThreshold) * stats.bonusThreshold + stats.bonusThreshold;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Welcome back, {salesRep?.name?.split(' ')[0] || 'Rep'}!</h1>
            <p className="text-sm text-muted-foreground">TapAway Sales Partner Portal</p>
          </div>
          <nav className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/rep/restaurants')}>Restaurants</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/rep/commissions')}>Commissions</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/rep/resources')}>Resources</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/rep/profile')}>Profile</Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.closesToday}</p>
                  <p className="text-xs text-muted-foreground">Closes Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.closesThisMonth}</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.lifetimeCloses}</p>
                  <p className="text-xs text-muted-foreground">Lifetime</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">${stats.pendingCommission}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xs text-muted-foreground">${stats.paidCommission} paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bonus Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              🎯 Monthly Bonus Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {stats.bonusProgress} / {stats.bonusThreshold} closes
                </span>
                <span className="font-medium">
                  {hasEarnedBonus ? '🎉 Bonus Earned!' : `$500 bonus at ${stats.bonusThreshold}`}
                </span>
              </div>
              <Progress value={bonusPercentage} className="h-3" />
              {hasEarnedBonus && (
                <p className="text-sm text-green-600">
                  Congratulations! You've hit {stats.bonusThreshold} closes this month. Next bonus at {nextBonusAt} closes.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            size="lg" 
            className="h-16 text-lg"
            onClick={() => navigate('/rep/close')}
          >
            <Plus className="mr-2 h-5 w-5" />
            Close a Restaurant Now
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="h-16 text-lg"
            onClick={() => navigate('/rep/restaurants')}
          >
            View My Restaurants
          </Button>
        </div>
      </main>
    </div>
  );
};

export default RepHome;
