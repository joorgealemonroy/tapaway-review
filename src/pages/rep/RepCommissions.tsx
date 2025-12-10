import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, DollarSign, TrendingUp, Gift, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Commission {
  id: string;
  type: string;
  amount: number;
  status: string;
  period_label: string;
  note: string | null;
  created_at: string;
  paid_at: string | null;
  rep_restaurant_id: string | null;
  restaurant_name?: string;
}

const RepCommissions = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  const [stats, setStats] = useState({
    pendingTotal: 0,
    paidTotal: 0,
    closesThisMonth: 0,
    bonusProgress: 0,
    bonusThreshold: 30,
  });

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
    const fetchCommissions = async () => {
      if (!salesRep) return;

      try {
        // Fetch commissions
        let query = supabase
          .from('commissions')
          .select(`
            *,
            rep_restaurants:rep_restaurant_id (name)
          `)
          .eq('rep_id', salesRep.id)
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }
        if (typeFilter !== 'all') {
          query = query.eq('type', typeFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        const commissionsWithNames = (data || []).map(c => ({
          ...c,
          restaurant_name: c.rep_restaurants?.name || null,
        }));
        setCommissions(commissionsWithNames);

        // Calculate stats
        const allCommissions = await supabase
          .from('commissions')
          .select('amount, status, type, period_label')
          .eq('rep_id', salesRep.id);

        const now = new Date();
        const currentPeriod = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        const pendingTotal = allCommissions.data?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        const paidTotal = allCommissions.data?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        const closesThisMonth = allCommissions.data?.filter(c => c.type === 'close' && c.period_label === currentPeriod).length || 0;

        setStats({
          pendingTotal,
          paidTotal,
          closesThisMonth,
          bonusProgress: closesThisMonth,
          bonusThreshold: 30,
        });
      } catch (error) {
        console.error('Error fetching commissions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (salesRep) {
      fetchCommissions();
    }
  }, [salesRep, statusFilter, typeFilter]);

  if (authLoading || repLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const bonusPercentage = Math.min((stats.bonusProgress / stats.bonusThreshold) * 100, 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/rep')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">My Commissions</h1>
              <p className="text-sm text-muted-foreground">Track your earnings</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">${stats.pendingTotal}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
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
                  <p className="text-2xl font-bold text-green-600">${stats.paidTotal}</p>
                  <p className="text-xs text-muted-foreground">Paid</p>
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
                  <p className="text-xs text-muted-foreground">Closes This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Gift className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{stats.bonusProgress}/{stats.bonusThreshold}</p>
                  <p className="text-xs text-muted-foreground">Bonus Progress</p>
                  <Progress value={bonusPercentage} className="h-2 mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="close">Close</SelectItem>
              <SelectItem value="bonus">Bonus</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Commissions Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No commissions yet. Start closing restaurants to earn!
                    </TableCell>
                  </TableRow>
                ) : (
                  commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="text-sm">
                        {format(new Date(commission.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={commission.type === 'bonus' ? 'default' : 'secondary'}>
                          {commission.type === 'bonus' ? '🎁 Bonus' : 'Close'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {commission.restaurant_name || '—'}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        ${commission.amount}
                      </TableCell>
                      <TableCell>
                        <Badge variant={commission.status === 'paid' ? 'default' : 'outline'}>
                          {commission.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {commission.period_label}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RepCommissions;
