import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Commission {
  id: string;
  rep_id: string;
  type: string;
  amount: number;
  status: string;
  period_label: string;
  note: string | null;
  created_at: string;
  paid_at: string | null;
  rep_name?: string;
  restaurant_name?: string;
}

interface SalesRep {
  id: string;
  name: string;
}

const AdminCommissions = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [repFilter, setRepFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  useAdminGuard();


  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch reps
        const { data: repsData } = await supabase
          .from('sales_reps')
          .select('id, name')
          .order('name');
        setReps(repsData || []);

        // Fetch commissions
        let query = supabase
          .from('commissions')
          .select(`
            *,
            sales_reps:rep_id (name),
            rep_restaurants:rep_restaurant_id (name)
          `)
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }
        if (repFilter !== 'all') {
          query = query.eq('rep_id', repFilter);
        }

        const { data } = await query;

        const commissionsWithNames = (data || []).map(c => ({
          ...c,
          rep_name: c.sales_reps?.name || 'Unknown',
          restaurant_name: c.rep_restaurants?.name || null,
        }));

        setCommissions(commissionsWithNames);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, statusFilter, repFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingIds = commissions.filter(c => c.status === 'pending').map(c => c.id);
      setSelectedIds(new Set(pendingIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleMarkPaid = async () => {
    if (selectedIds.size === 0) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('commissions')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`Marked ${selectedIds.size} commission(s) as paid`);
      setSelectedIds(new Set());

      // Refresh
      setCommissions(prev => prev.map(c => 
        selectedIds.has(c.id) ? { ...c, status: 'paid', paid_at: new Date().toISOString() } : c
      ));
    } catch (error) {
      console.error('Error marking paid:', error);
      toast.error('Failed to update commissions');
    } finally {
      setProcessing(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const pendingTotal = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.amount), 0);
  const paidTotal = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Commission Management</h1>
              <p className="text-sm text-muted-foreground">Review and pay commissions</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">${pendingTotal}</p>
                  <p className="text-xs text-muted-foreground">Total Pending</p>
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
                  <p className="text-2xl font-bold text-green-600">${paidTotal}</p>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
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

            <Select value={repFilter} onValueChange={setRepFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Rep" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reps</SelectItem>
                {reps.map(rep => (
                  <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedIds.size > 0 && (
            <Button onClick={handleMarkPaid} disabled={processing}>
              <DollarSign className="h-4 w-4 mr-2" />
              Mark {selectedIds.size} as Paid
            </Button>
          )}
        </div>

        {/* Commissions Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size > 0 && selectedIds.size === commissions.filter(c => c.status === 'pending').length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Rep</TableHead>
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
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No commissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        {commission.status === 'pending' && (
                          <Checkbox
                            checked={selectedIds.has(commission.id)}
                            onCheckedChange={(checked) => handleSelectOne(commission.id, !!checked)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(commission.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">{commission.rep_name}</TableCell>
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

export default AdminCommissions;
