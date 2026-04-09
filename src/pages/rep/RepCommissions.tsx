import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, DollarSign, Clock, Zap, Target } from 'lucide-react';
import { format } from 'date-fns';

interface Commission {
  id: string;
  type: string;
  commission_type: string | null;
  plan_tier: string | null;
  billing_cycle: string | null;
  amount: number;
  status: string;
  points_value: number;
  period_label: string;
  note: string | null;
  created_at: string;
  clawback_until: string | null;
  rep_restaurant_id: string | null;
  restaurant_name?: string;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }> = {
  trial_pending: { label: 'In Trial', variant: 'secondary', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  available: { label: 'Available', variant: 'default', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  pending: { label: 'Pending', variant: 'outline', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  paid: { label: 'Paid', variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  voided: { label: 'Voided', variant: 'destructive', className: 'bg-slate-100 text-slate-500 border-slate-200' },
  clawed_back: { label: 'Clawed Back', variant: 'destructive', className: 'bg-red-100 text-red-700 border-red-200' },
};

const RepCommissions = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [stats, setStats] = useState({
    availableTotal: 0,
    pendingTotal: 0,
    inTrial: 0,
    pointsThisMonth: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!repLoading && !isSalesRep) { navigate('/'); return; }
  }, [authLoading, repLoading, user, isSalesRep, navigate]);

  useEffect(() => {
    const fetchCommissions = async () => {
      if (!salesRep) return;
      try {
        let query = supabase
          .from('commissions')
          .select('*, rep_restaurants:rep_restaurant_id (name)')
          .eq('rep_id', salesRep.id)
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') query = query.eq('status', statusFilter);
        if (typeFilter !== 'all') {
          if (typeFilter === 'upfront' || typeFilter === 'recurring' || typeFilter === 'bonus') {
            query = query.eq('commission_type', typeFilter);
          } else {
            query = query.eq('type', typeFilter);
          }
        }

        const { data, error } = await query;
        if (error) throw error;

        const mapped = (data || []).map((c: any) => ({
          ...c,
          restaurant_name: c.rep_restaurants?.name || null,
        }));
        setCommissions(mapped);

        // Stats from all commissions
        const { data: allComm } = await supabase
          .from('commissions')
          .select('amount, status, commission_type, points_value, period_label')
          .eq('rep_id', salesRep.id);

        const now = new Date();
        const currentPeriod = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        setStats({
          availableTotal: allComm?.filter(c => c.status === 'available').reduce((s, c) => s + Number(c.amount), 0) || 0,
          pendingTotal: allComm?.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.amount), 0) || 0,
          inTrial: allComm?.filter(c => c.status === 'trial_pending').reduce((s, c) => s + Number(c.amount), 0) || 0,
          pointsThisMonth: allComm
            ?.filter(c => c.period_label === currentPeriod && (c.commission_type === 'upfront' || c.commission_type === null))
            .reduce((s, c) => s + Number(c.points_value || 0), 0) || 0,
        });
      } catch (error) {
        console.error('Error fetching commissions:', error);
      } finally {
        setLoading(false);
      }
    };
    if (salesRep) fetchCommissions();
  }, [salesRep, statusFilter, typeFilter]);

  if (authLoading || repLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const getTypeBadge = (c: Commission) => {
    const ct = c.commission_type || c.type;
    switch (ct) {
      case 'upfront': return <Badge variant="secondary">Upfront</Badge>;
      case 'recurring': return <Badge variant="outline">Recurring</Badge>;
      case 'bonus': return <Badge className="bg-purple-100 text-purple-700 border-purple-200">🎁 Bonus</Badge>;
      default: return <Badge variant="secondary">{ct}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_BADGES[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
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
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">${stats.availableTotal.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg"><Clock className="h-5 w-5 text-amber-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">${stats.pendingTotal.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Pending Hold</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg"><Zap className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">${stats.inTrial.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">In Trial</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><Target className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.pointsThisMonth}</p>
                  <p className="text-xs text-muted-foreground">Points This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="trial_pending">In Trial</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
              <SelectItem value="clawed_back">Clawed Back</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="upfront">Upfront</SelectItem>
              <SelectItem value="recurring">Recurring</SelectItem>
              <SelectItem value="bonus">Bonus</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Pts</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No commissions yet. Start closing restaurants to earn!
                    </TableCell>
                  </TableRow>
                ) : commissions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{format(new Date(c.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-sm">{c.restaurant_name || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.plan_tier ? `${c.plan_tier === 'restaurant' ? 'Venue' : 'Solo'} ${c.billing_cycle || ''}` : '—'}
                    </TableCell>
                    <TableCell>{getTypeBadge(c)}</TableCell>
                    <TableCell className="text-center text-sm font-medium">
                      {Number(c.points_value) > 0 ? c.points_value : '—'}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">${Number(c.amount).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RepCommissions;
