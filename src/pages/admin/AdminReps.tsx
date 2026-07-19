import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CheckCircle, XCircle, UserPlus, RotateCw, Eye, Ban, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

import { toast } from 'sonner';
import { format } from 'date-fns';

interface RepApplication {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

interface SalesRep {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  agreement_accepted: boolean | null;
  agreement_accepted_at: string | null;
  lifetime_closes?: number;
  pending_commission?: number;
  paid_commission?: number;
}

const AdminReps = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [applications, setApplications] = useState<RepApplication[]>([]);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<RepApplication | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{ rep: SalesRep; next: boolean } | null>(null);
  const [deletingRep, setDeletingRep] = useState<SalesRep | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingPermanently, setDeletingPermanently] = useState(false);


  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch applications
        const { data: appsData } = await supabase
          .from('rep_applications')
          .select('*')
          .order('created_at', { ascending: false });

        setApplications(appsData || []);

        // Fetch reps with stats
        const { data: repsData } = await supabase
          .from('sales_reps')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch commission stats for each rep
        const repsWithStats = await Promise.all(
          (repsData || []).map(async (rep) => {
            const { count: lifetimeCloses } = await supabase
              .from('rep_restaurants')
              .select('*', { count: 'exact', head: true })
              .eq('sales_rep_id', rep.id)
              .eq('status', 'closed');

            const { data: commissions } = await supabase
              .from('commissions')
              .select('amount, status')
              .eq('rep_id', rep.id);

            const pendingCommission = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.amount), 0) || 0;
            const paidCommission = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount), 0) || 0;

            return {
              ...rep,
              lifetime_closes: lifetimeCloses || 0,
              pending_commission: pendingCommission,
              paid_commission: paidCommission,
            };
          })
        );

        setReps(repsWithStats);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const provisionRep = async (applicationId: string) => {
    const { data, error } = await supabase.functions.invoke('approve-rep-application', {
      body: { applicationId },
    });
    if (error) throw error;

    const already = (data as any)?.alreadyProvisioned;
    toast.success(already ? 'Rep account already provisioned.' : 'Rep approved! They will receive a login email.');

    const { data: appsData } = await supabase
      .from('rep_applications')
      .select('*')
      .order('created_at', { ascending: false });
    setApplications(appsData || []);

    const { data: repsData } = await supabase
      .from('sales_reps')
      .select('*')
      .order('created_at', { ascending: false });
    setReps(repsData || []);
  };

  const handleApprove = async () => {
    if (!selectedApplication) return;
    setProcessing(true);
    try {
      await provisionRep(selectedApplication.id);
      setApproveDialogOpen(false);
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    } finally {
      setProcessing(false);
    }
  };

  const handleProvision = async (applicationId: string) => {
    setProcessing(true);
    try {
      await provisionRep(applicationId);
    } catch (error) {
      console.error('Error provisioning rep:', error);
      toast.error('Failed to provision rep account');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('rep_applications')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Application rejected');
      setApplications(prev => prev.map(a => 
        a.id === applicationId ? { ...a, status: 'rejected' } : a
      ));
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    }
  };

  const handleToggleActive = async (repId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('sales_reps')
        .update({ is_active: isActive })
        .eq('id', repId);

      if (error) throw error;

      setReps(prev => prev.map(r =>
        r.id === repId ? { ...r, is_active: isActive } : r
      ));
      toast.success(isActive ? 'Rep reactivated' : 'Rep access revoked');
    } catch (error) {
      console.error('Error toggling rep status:', error);
      toast.error('Failed to update rep status');
    }
  };

  const handleResendInvite = async (repId: string, repEmail: string) => {
    setResendingInvite(repId);
    try {
      const { data, error } = await supabase.functions.invoke('resend-rep-invite', {
        body: { repId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`New invite sent to ${repEmail}`);
    } catch (error) {
      console.error('Error resending invite:', error);
      const message = error instanceof Error ? error.message : 'Failed to resend invite';
      toast.error(message);
    } finally {
      setResendingInvite(null);
    }
  };

  const handleDeletePermanently = async () => {
    if (!deletingRep || deleteConfirmText !== 'DELETE') return;
    setDeletingPermanently(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-complete', {
        body: { userId: deletingRep.id, deleteSalesRepAccount: true },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Rep ${deletingRep.email} deleted permanently`);
      setReps((prev) => prev.filter((r) => r.id !== deletingRep.id));
      setDeletingRep(null);
      setDeleteConfirmText('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete rep';
      toast.error(msg);
    } finally {
      setDeletingPermanently(false);
    }
  };


  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const pendingApplications = applications.filter(a => a.status === 'pending');

  const repByEmail = new Map(
    reps.map(r => [r.email.trim().toLowerCase(), r] as const)
  );

  const renderRepAccessActions = (rep: SalesRep) => (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => navigate(`/rep?admin_view_rep=${rep.id}`)}
      >
        <Eye className="h-3 w-3 mr-1" />
        View as Rep
      </Button>
      {rep.is_active ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setConfirmToggle({ rep, next: false })}
        >
          <Ban className="h-3 w-3 mr-1" />
          Revoke
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirmToggle({ rep, next: true })}
        >
          <RotateCw className="h-3 w-3 mr-1" />
          Reactivate
        </Button>
      )}
      {!rep.agreement_accepted && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleResendInvite(rep.id, rep.email)}
          disabled={resendingInvite === rep.id}
        >
          <RotateCw className={`h-3 w-3 mr-1 ${resendingInvite === rep.id ? 'animate-spin' : ''}`} />
          {resendingInvite === rep.id ? 'Sending...' : 'Resend Invite'}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => { setDeletingRep(rep); setDeleteConfirmText(''); }}
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Delete permanently
      </Button>
    </div>
  );


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
              <h1 className="text-xl font-bold text-foreground">Sales Reps</h1>
              <p className="text-sm text-muted-foreground">Manage applications and reps</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="applications">
          <TabsList>
            <TabsTrigger value="applications">
              Applications
              {pendingApplications.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingApplications.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reps">Active Reps ({reps.filter(r => r.is_active).length})</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No applications yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      applications.map((app) => {
                        const matchedRep = repByEmail.get(app.email.trim().toLowerCase());
                        const isRevoked = matchedRep && !matchedRep.is_active;
                        return (
                        <TableRow key={app.id} className={isRevoked ? 'opacity-50' : ''}>
                          <TableCell className="font-medium">{app.name}</TableCell>
                          <TableCell>{app.email}</TableCell>
                          <TableCell>{app.phone || '—'}</TableCell>
                          <TableCell>{format(new Date(app.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {isRevoked ? (
                              <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">Revoked</Badge>
                            ) : (
                              <Badge variant={
                                app.status === 'approved' ? 'default' :
                                app.status === 'rejected' ? 'destructive' :
                                'secondary'
                              }>
                                {app.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {app.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedApplication(app);
                                    setApproveDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(app.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                            {app.status === 'approved' && matchedRep && renderRepAccessActions(matchedRep)}
                            {app.status === 'approved' && !matchedRep && (
                              <Button
                                size="sm"
                                onClick={() => handleProvision(app.id)}
                                disabled={processing}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Provision account
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reps" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Agreement</TableHead>
                      <TableHead>Closes</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reps.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No reps yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      reps.map((rep) => (
                        <TableRow key={rep.id} className={!rep.is_active ? 'opacity-50' : ''}>
                          <TableCell className="font-medium">{rep.name}</TableCell>
                          <TableCell>{rep.email}</TableCell>
                          <TableCell>
                            {rep.agreement_accepted ? (
                              <Badge variant="default" className="bg-green-600 text-xs">Signed</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Not signed</Badge>
                            )}
                          </TableCell>
                          <TableCell>{rep.lifetime_closes}</TableCell>
                          <TableCell className="text-yellow-600">${rep.pending_commission}</TableCell>
                          <TableCell className="text-green-600">${rep.paid_commission}</TableCell>
                          <TableCell>
                            {rep.is_active ? (
                              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">Revoked</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {renderRepAccessActions(rep)}
                          </TableCell>

                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              This will create a sales rep account for {selectedApplication?.name} ({selectedApplication?.email}) and send them a login link.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? 'Processing...' : 'Approve & Send Invite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmToggle} onOpenChange={(open) => !open && setConfirmToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggle?.next ? 'Reactivate rep access?' : 'Revoke rep access?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.next
                ? `${confirmToggle?.rep.name} will regain portal access immediately.`
                : `${confirmToggle?.rep.name} will lose portal access immediately.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmToggle?.next ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
              onClick={async () => {
                if (!confirmToggle) return;
                await handleToggleActive(confirmToggle.rep.id, confirmToggle.next);
                setConfirmToggle(null);
              }}
            >
              {confirmToggle?.next ? 'Reactivate' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminReps;
