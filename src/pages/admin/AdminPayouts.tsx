import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Building2, Users, CheckCircle, Send, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RepPayout {
  id: string;
  rep_user_id: string;
  payee_name: string;
  payee_type: string;
  bank_name: string | null;
  account_last4: string;
  created_at: string;
  rep_name: string;
  rep_email: string;
  pending_amount: number;
  email_payout_notifications: boolean;
}

const AdminPayouts = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sendingPayout, setSendingPayout] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<RepPayout[]>([]);

  useAdminGuard();


  useEffect(() => {
    if (isAdmin && !adminLoading) {
      fetchPayoutData();
    }
  }, [isAdmin, adminLoading]);

  const fetchPayoutData = async () => {
    setLoading(true);
    try {
      // Get all reps with payout accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('rep_payout_accounts')
        .select('id, rep_user_id, payee_name, payee_type, bank_name, account_last4, created_at, email_payout_notifications');

      if (accountsError) throw accountsError;

      // Get sales rep info
      const { data: reps, error: repsError } = await supabase
        .from('sales_reps')
        .select('id, name, email');

      if (repsError) throw repsError;

      // Get pending commissions
      const { data: commissions, error: commissionsError } = await supabase
        .from('commissions')
        .select('rep_id, amount')
        .eq('status', 'pending');

      if (commissionsError) throw commissionsError;

      // Calculate pending amounts per rep
      const pendingByRep: Record<string, number> = {};
      (commissions || []).forEach((c) => {
        pendingByRep[c.rep_id] = (pendingByRep[c.rep_id] || 0) + Number(c.amount);
      });

      // Merge data
      const repsMap = new Map((reps || []).map((r) => [r.id, r]));
      const merged: RepPayout[] = (accounts || []).map((a) => {
        const rep = repsMap.get(a.rep_user_id);
        return {
          ...a,
          rep_name: rep?.name || 'Unknown',
          rep_email: rep?.email || 'Unknown',
          pending_amount: pendingByRep[a.rep_user_id] || 0,
          email_payout_notifications: a.email_payout_notifications ?? true,
        };
      });

      setPayouts(merged);
    } catch (error: any) {
      toast.error('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportACH = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-payout-export', {
        body: {},
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Create CSV download
      const csvContent = data.csv;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tapaway-ach-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${data.count} payout records`);
    } catch (error: any) {
      toast.error('Failed to export: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleMarkPayoutSent = async (payout: RepPayout) => {
    if (payout.pending_amount <= 0) {
      toast.error('No pending amount to pay');
      return;
    }

    setSendingPayout(payout.rep_user_id);
    try {
      // Create a payout history record with status 'sent'
      const { data: historyRecord, error: historyError } = await supabase
        .from('rep_payout_history')
        .insert({
          rep_user_id: payout.rep_user_id,
          amount: payout.pending_amount,
          status: 'sent',
          paid_at: new Date().toISOString(),
          note: `ACH payout for pending commissions`,
        })
        .select()
        .single();

      if (historyError) throw historyError;

      // Mark all pending commissions for this rep as paid
      const { error: commissionsError } = await supabase
        .from('commissions')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('rep_id', payout.rep_user_id)
        .eq('status', 'pending');

      if (commissionsError) throw commissionsError;

      // Trigger payout notification email
      try {
        await supabase.functions.invoke('send-payout-notification', {
          body: { payout_id: historyRecord.id },
        });
      } catch (emailError) {
        // Don't fail the payout if email fails
        console.error('Failed to send payout notification');
      }

      toast.success(`Payout of $${payout.pending_amount} marked as sent for ${payout.rep_name}`);
      
      // Refresh data
      await fetchPayoutData();
    } catch (error: any) {
      toast.error('Failed to process payout: ' + error.message);
    } finally {
      setSendingPayout(null);
    }
  };

  if (authLoading || adminLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">Admin only</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Payout Management</h1>
            <p className="text-sm text-muted-foreground">Manage sales rep ACH payouts</p>
          </div>
          <Button onClick={handleExportACH} disabled={exporting || payouts.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Generate ACH Export'}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{payouts.length}</p>
                  <p className="text-xs text-muted-foreground">Reps with Bank Info</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    ${payouts.reduce((sum, p) => sum + p.pending_amount, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Pending Payouts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {payouts.filter((p) => p.pending_amount > 0).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Reps Owed Money</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payouts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reps with Payout Accounts</CardTitle>
            <CardDescription className="text-xs">
              Only reps who have submitted bank details appear here
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground animate-pulse">Loading...</div>
            ) : payouts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Building2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No reps have submitted bank details yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Rep</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Payee Name</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Account</th>
                      <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">Pending</th>
                      <th className="text-center py-2 px-4 text-xs font-medium text-muted-foreground">Notify</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Added</th>
                      <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{payout.rep_name}</div>
                          <div className="text-xs text-muted-foreground">{payout.rep_email}</div>
                        </td>
                        <td className="py-3 px-4 text-foreground/90">{payout.payee_name}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="capitalize text-xs">
                            {payout.payee_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-foreground/90">****{payout.account_last4}</span>
                          {payout.bank_name && (
                            <div className="text-xs text-muted-foreground">{payout.bank_name}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {payout.pending_amount > 0 ? (
                            <span className="font-semibold text-primary">
                              ${payout.pending_amount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">$0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {payout.email_payout_notifications ? (
                            <Badge variant="outline" className="text-xs">
                              <Mail className="h-3 w-3 mr-1" />
                              On
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Off</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {format(new Date(payout.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {payout.pending_amount > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkPayoutSent(payout)}
                              disabled={sendingPayout === payout.rep_user_id}
                              className="text-xs"
                            >
                              <Send className="h-3 w-3 mr-1" />
                              {sendingPayout === payout.rep_user_id ? 'Sending...' : 'Mark Sent'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminPayouts;