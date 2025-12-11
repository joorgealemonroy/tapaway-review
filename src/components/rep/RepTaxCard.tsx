import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Upload, FileText, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TaxProfile {
  status: 'missing' | 'submitted' | 'approved' | 'rejected';
  rejection_note: string | null;
  updated_at: string;
}

interface RepTaxCardProps {
  userId: string;
}

export const RepTaxCard = ({ userId }: RepTaxCardProps) => {
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchTaxProfile();
  }, [userId]);

  const fetchTaxProfile = async () => {
    try {
      // Use the secure view that only exposes safe fields
      const { data, error } = await supabase
        .from('rep_tax_profiles')
        .select('status, note, updated_at')
        .eq('rep_user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setTaxProfile({
          status: data.status as TaxProfile['status'],
          rejection_note: data.status === 'rejected' ? data.note : null,
          updated_at: data.updated_at,
        });
      } else {
        setTaxProfile({ status: 'missing', rejection_note: null, updated_at: '' });
      }
    } catch (err) {
      // Silent fail - will show missing state
      setTaxProfile({ status: 'missing', rejection_note: null, updated_at: '' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or image file (JPG, PNG, WebP)');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    setUploading(true);

    try {
      // Generate secure filename: userId/random-uuid.extension
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const randomId = crypto.randomUUID();
      const filePath = `${userId}/${randomId}.${fileExt}`;

      // Upload to private bucket
      const { error: uploadError } = await supabase.storage
        .from('rep-tax-docs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Check if profile exists
      const { data: existing } = await supabase
        .from('rep_tax_profiles')
        .select('id')
        .eq('rep_user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('rep_tax_profiles')
          .update({
            w9_file_path: filePath,
            status: 'submitted',
          })
          .eq('rep_user_id', userId);

        if (updateError) throw updateError;
      } else {
        // Insert new profile
        const { error: insertError } = await supabase
          .from('rep_tax_profiles')
          .insert({
            rep_user_id: userId,
            w9_file_path: filePath,
            status: 'submitted',
          });

        if (insertError) throw insertError;
      }

      toast.success('W-9 uploaded successfully!');
      setShowUploadModal(false);
      fetchTaxProfile();
    } catch (err) {
      toast.error('Failed to upload W-9. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-slate-100">
        <CardContent className="py-6">
          <div className="animate-pulse h-16 bg-slate-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  const status = taxProfile?.status || 'missing';

  return (
    <>
      <Card className="border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            Tax & Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Before we can pay you commissions, we need a completed W-9 on file.
          </p>

          {status === 'missing' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">You haven't uploaded a W-9 yet.</span>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => setShowUploadModal(true)} className="w-full sm:w-auto">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload W-9
                </Button>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    asChild
                    size="sm"
                    className="flex-1"
                  >
                    <a
                      href="https://www.irs.gov/pub/irs-pdf/fw9.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Download IRS W-9
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    size="sm"
                    className="flex-1"
                  >
                    <a
                      href="/TapAway_W9_Short_Instructions.pdf"
                      download="TapAway_W9_Instructions.pdf"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      W-9 Instructions
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {status === 'submitted' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending Review
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Your W-9 has been submitted and is awaiting admin review.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadModal(true)}
              >
                Replace W-9
              </Button>
            </div>
          )}

          {status === 'approved' && (
            <div className="flex items-center gap-2">
              <Badge className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                W-9 on file ✓
              </Badge>
            </div>
          )}

          {status === 'rejected' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">
                  We couldn't accept your W-9. Please upload a clearer photo/PDF.
                </span>
              </div>
              {taxProfile?.rejection_note && (
                <p className="text-sm text-muted-foreground italic">
                  Note: {taxProfile.rejection_note}
                </p>
              )}
              <Button onClick={() => setShowUploadModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload W-9 Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload W-9 Form</DialogTitle>
            <DialogDescription>
              Upload a completed W-9 form as a PDF or clear photo. This is required before we can process commission payouts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="w9-upload"
              />
              <label
                htmlFor="w9-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-slate-400" />
                    <span className="text-sm font-medium">Click to select file</span>
                    <span className="text-xs text-muted-foreground">
                      PDF or image (max 10MB)
                    </span>
                  </>
                )}
              </label>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Your document is stored securely and only visible to TapAway admins.</p>
              <p>• Need a blank form? <a href="https://www.irs.gov/pub/irs-pdf/fw9.pdf" target="_blank" rel="noopener noreferrer" className="text-primary underline">Download from IRS.gov</a></p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
