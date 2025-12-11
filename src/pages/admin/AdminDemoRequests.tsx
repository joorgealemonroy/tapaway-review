import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Package } from 'lucide-react';
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
}

const AdminDemoRequests = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }
  }, [authLoading, adminLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    }
  }, [isAdmin]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('rep_demo_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
    }
    setLoading(false);
  };

  const toggleFulfilled = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('rep_demo_requests')
      .update({ fulfilled: !currentValue })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
      return;
    }

    setRequests(requests.map(req => 
      req.id === id ? { ...req, fulfilled: !currentValue } : req
    ));
    toast.success(currentValue ? 'Marked as unfulfilled' : 'Marked as fulfilled');
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  const formatAddress = (req: DemoRequest) => {
    const lines = [req.address_line1];
    if (req.address_line2) lines.push(req.address_line2);
    lines.push(`${req.city}, ${req.state} ${req.zip}`);
    return lines.join(', ');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl font-bold text-slate-900">Demo Kit Requests</h1>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>All Demo Requests</CardTitle>
            <CardDescription>
              {requests.length} total request{requests.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No demo requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rep Name</TableHead>
                      <TableHead>Shipping Address</TableHead>
                      <TableHead>Requested At</TableHead>
                      <TableHead className="text-center">Fulfilled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.full_name}</TableCell>
                        <TableCell className="max-w-xs">
                          <span className="text-sm text-slate-600">{formatAddress(req)}</span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {format(new Date(req.requested_at), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={req.fulfilled}
                            onCheckedChange={() => toggleFulfilled(req.id, req.fulfilled)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDemoRequests;
