import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Download, Check, X, FileText, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TaxProfile {
  id: string;
  rep_user_id: string;
  status: 'missing' | 'submitted' | 'approved' | 'rejected';
  w9_file_path: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  rep_name: string;
  rep_email: string;
}

export default function AdminTaxReview() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [profiles, setProfiles] = useState<TaxProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ profile: TaxProfile; action: 'approve' | 'reject' } | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      fetchProfiles();
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchProfiles = async () => {
    try {
      // Get all tax profiles with rep info
      const { data: taxData, error: taxError } = await supabase
        .from('rep_tax_profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (taxError) throw taxError;

      // Get all sales reps for name/email mapping
      const { data: repsData, error: repsError } = await supabase
        .from('sales_reps')
        .select('id, name, email');

      if (repsError) throw repsError;

      const repMap = new Map(repsData?.map(r => [r.id, { name: r.name, email: r.email }]) || []);

      const enrichedProfiles: TaxProfile[] = (taxData || []).map(tp => {
        const rep = repMap.get(tp.rep_user_id);
        return {
          ...tp,
          status: tp.status as TaxProfile['status'],
          rep_name: rep?.name || 'Unknown',
          rep_email: rep?.email || 'Unknown',
        };
      });

      setProfiles(enrichedProfiles);
    } catch (err) {
      toast.error('Failed to load tax profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (profile: TaxProfile) => {
    if (!profile.w9_file_path) {
      toast.error('No file available');
      return;
    }

    setDownloading(profile.id);

    try {
      // Create a signed URL for the file (admin-only access enforced by RLS)
      const { data, error } = await supabase.storage
        .from('rep-tax-docs')
        .createSignedUrl(profile.w9_file_path, 60); // 60 second expiry

      if (error) throw error;

      // Open in new tab for download
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      toast.error('Failed to download file');
    } finally {
      setDownloading(null);
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;

    setProcessing(true);

    try {
      const newStatus = actionModal.action === 'approve' ? 'approved' : 'rejected';

      const { error } = await supabase
        .from('rep_tax_profiles')
        .update({
          status: newStatus,
          note: actionModal.action === 'reject' ? actionNote : null,
        })
        .eq('id', actionModal.profile.id);

      if (error) throw error;

      toast.success(`W-9 ${actionModal.action === 'approve' ? 'approved' : 'rejected'} successfully`);
      setActionModal(null);
      setActionNote('');
      fetchProfiles();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: TaxProfile['status']) => {
    switch (status) {
      case 'missing':
        return <Badge variant="outline" className="text-slate-500">Missing</Badge>;
      case 'submitted':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">W-9 Tax Review</h1>
            <p className="text-muted-foreground">Review and approve rep W-9 submissions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{profiles.filter(p => p.status === 'submitted').length}</div>
              <div className="text-sm text-muted-foreground">Pending Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{profiles.filter(p => p.status === 'approved').length}</div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{profiles.filter(p => p.status === 'rejected').length}</div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-muted-foreground">{profiles.filter(p => p.status === 'missing').length}</div>
              <div className="text-sm text-muted-foreground">Missing</div>
            </CardContent>
          </Card>
        </div>

        {/* Profiles List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              All Tax Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profiles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No tax profiles found</p>
            ) : (
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border rounded-lg bg-card"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{profile.rep_name}</span>
                        {getStatusBadge(profile.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">{profile.rep_email}</div>
                      <div className="text-xs text-muted-foreground">
                        Updated: {format(new Date(profile.updated_at), 'MMM d, yyyy h:mm a')}
                      </div>
                      {profile.note && profile.status === 'rejected' && (
                        <div className="text-xs text-red-600 italic">Note: {profile.note}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {profile.w9_file_path && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(profile)}
                          disabled={downloading === profile.id}
                        >
                          {downloading === profile.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-1" />
                          )}
                          Download
                        </Button>
                      )}

                      {profile.status === 'submitted' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => setActionModal({ profile, action: 'approve' })}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setActionModal({ profile, action: 'reject' })}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Modal */}
      <Dialog open={!!actionModal} onOpenChange={() => { setActionModal(null); setActionNote(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal?.action === 'approve' ? 'Approve W-9' : 'Reject W-9'}
            </DialogTitle>
            <DialogDescription>
              {actionModal?.action === 'approve'
                ? `Confirm approval of W-9 for ${actionModal?.profile.rep_name}?`
                : `Please provide a reason for rejection (visible to rep).`}
            </DialogDescription>
          </DialogHeader>

          {actionModal?.action === 'reject' && (
            <Textarea
              placeholder="Enter reason for rejection (e.g., 'Document is illegible, please re-upload a clearer copy')"
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              rows={3}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionModal(null); setActionNote(''); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing || (actionModal?.action === 'reject' && !actionNote.trim())}
              className={actionModal?.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {actionModal?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
