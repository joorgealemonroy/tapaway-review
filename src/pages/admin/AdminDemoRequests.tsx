import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Package, Truck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DemoRequest {
  id: string;
  rep_user_id: string;
  full_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  requested_at: string;
  fulfilled: boolean;
  tracking_number: string | null;
  shipped_at: string | null;
}

const AdminDemoRequests = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [shipDialog, setShipDialog] = useState<DemoRequest | null>(null);
  const [tracking, setTracking] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!adminLoading && !isAdmin) { navigate('/'); return; }
  }, [authLoading, adminLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) fetchRequests();
  }, [isAdmin]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('rep_demo_requests')
      .select('*')
      .order('requested_at', { ascending: false });
    if (!error && data) setRequests(data as DemoRequest[]);
    setLoading(false);
  };

  const openShipDialog = (req: DemoRequest) => {
    setShipDialog(req);
    setTracking(req.tracking_number || '');
  };

  const markShipped = async () => {
    if (!shipDialog) return;
    if (!tracking.trim()) {
      toast.error('Please enter a tracking number');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('rep_demo_requests')
      .update({
        fulfilled: true,
        tracking_number: tracking.trim(),
        shipped_at: new Date().toISOString(),
      } as any)
      .eq('id', shipDialog.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to update');
      return;
    }
    toast.success('Marked as shipped');
    setRequests(prev => prev.map(r =>
      r.id === shipDialog.id
        ? { ...r, fulfilled: true, tracking_number: tracking.trim(), shipped_at: new Date().toISOString() }
        : r
    ));
    setShipDialog(null);
    setTracking('');
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="animate-pulse text-white/40">Loading...</div>
      </div>
    );
  }

  const formatAddress = (req: DemoRequest) => {
    const lines = [req.address_line1];
    if (req.address_line2) lines.push(req.address_line2);
    lines.push(`${req.city}, ${req.state} ${req.zip}`);
    return lines.join(', ');
  };

  const pending = requests.filter(r => !r.fulfilled);
  const shipped = requests.filter(r => r.fulfilled);

  return (
    <div className="min-h-screen bg-[#0a0e1a] p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="text-white/60 hover:text-white hover:bg-white/[0.05]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-white/70" />
            <h1 className="text-xl font-semibold text-white">Demo Kit Requests</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <div className="text-xs uppercase tracking-widest text-white/40">Total</div>
            <div className="text-3xl font-semibold text-white mt-2">{requests.length}</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <div className="text-xs uppercase tracking-widest text-white/40">Pending</div>
            <div className="text-3xl font-semibold text-amber-400 mt-2">{pending.length}</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <div className="text-xs uppercase tracking-widest text-white/40">Shipped</div>
            <div className="text-3xl font-semibold text-emerald-400 mt-2">{shipped.length}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">All Requests</h2>
          </div>
          {requests.length === 0 ? (
            <p className="text-center text-white/40 py-10">No demo requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/50 text-xs uppercase tracking-widest">
                    <th className="text-left p-4 font-medium">Rep</th>
                    <th className="text-left p-4 font-medium">Shipping Address</th>
                    <th className="text-left p-4 font-medium">Requested</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-right p-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id} className="border-t border-white/5">
                      <td className="p-4 text-white font-medium">{req.full_name}</td>
                      <td className="p-4 text-white/60 max-w-xs">{formatAddress(req)}</td>
                      <td className="p-4 text-white/50 text-xs">
                        {format(new Date(req.requested_at), 'MMM d, yyyy')}
                      </td>
                      <td className="p-4">
                        {req.fulfilled ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                              <CheckCircle2 className="h-3 w-3" /> Shipped
                            </span>
                            {req.tracking_number && (
                              <span className="text-white/40 text-[10px] font-mono">{req.tracking_number}</span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-xs">Pending</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white/70 hover:text-white hover:bg-white/[0.05]"
                          onClick={() => openShipDialog(req)}
                        >
                          <Truck className="h-3.5 w-3.5 mr-1" />
                          {req.fulfilled ? 'Edit Tracking' : 'Mark as Shipped'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!shipDialog} onOpenChange={(o) => !o && setShipDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Shipped</DialogTitle>
            <DialogDescription>
              Enter the tracking number for {shipDialog?.full_name}'s demo kit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking Number</Label>
            <Input
              id="tracking"
              value={tracking}
              onChange={e => setTracking(e.target.value)}
              placeholder="1Z999AA10123456784"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipDialog(null)}>Cancel</Button>
            <Button onClick={markShipped} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Mark Shipped'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDemoRequests;
