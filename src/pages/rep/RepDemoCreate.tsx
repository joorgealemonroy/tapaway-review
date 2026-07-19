import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useSalesRep } from '@/hooks/useSalesRep';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Upload,
  FileText,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { RepShell } from '@/components/rep/RepShell';
import { RepCard } from '@/components/rep/RepCard';

const slugify = (name: string) => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || 'demo'}-${suffix}`;
};

type Step = 'form' | 'upload_pdf';

const DEMO_CAP = 50;

const RepDemoCreate = () => {
  const navigate = useRepNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [printPdfPath, setPrintPdfPath] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    else if (!repLoading && !adminLoading && !isSalesRep) navigate(isAdmin ? '/admin/reps' : '/');
  }, [authLoading, repLoading, adminLoading, user, isSalesRep, isAdmin, navigate]);

  // Legacy /rep/demo/:id edit URLs go straight to the real Solo dashboard now.
  useEffect(() => {
    if (editId) {
      navigate(`/dashboard?profile_id=${editId}`);
    }
  }, [editId, navigate]);

  const handleCreate = async () => {
    if (!user || !salesRep) return;
    const name = businessName.trim();
    if (!name) return toast.error('Business name is required');
    if (!businessPhone.trim()) return toast.error('Business phone is required');

    setSaving(true);
    try {
      // 50-demo daily cap on rep-created demos.
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count: todayCount, error: countError } = await supabase
        .from('personal_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('sales_rep_id', salesRep.id)
        .gte('created_at', startOfDay.toISOString());
      if (countError) throw countError;
      if ((todayCount ?? 0) >= DEMO_CAP) {
        toast.error("You've hit the 50-demo daily cap. Please continue tomorrow.");
        setSaving(false);
        return;
      }

      // Generate a unique username slug (retry a few times if collision).
      let username = slugify(name);
      for (let i = 0; i < 5; i++) {
        const { data: available } = await supabase.rpc('is_username_available', {
          check_username: username,
        });
        if (available === true) break;
        username = slugify(name);
      }

      const emailPlaceholder =
        contactEmail.trim() || `${username}@demo.tapaway.local`;

      const { data: inserted, error } = await supabase
        .from('personal_profiles')
        .insert({
          user_id: user.id,
          username,
          full_name: name,
          email: emailPlaceholder,
          plan_type: 'solo_pro',
          subscription_status: 'active',
          business_phone: businessPhone.trim(),
          contact_phone: businessPhone.trim(),
          sales_rep_id: salesRep.id,
          created_by_rep_id: salesRep.id,
          is_approved: false,
          pipeline_status: 'draft',
          header_type: 'color',
          header_color: '#0a0e1a',
          background_color: '#ffffff',
          show_username: true,
        } as any)
        .select('id, username')
        .single();

      if (error) throw error;

      setSavedId(inserted!.id);
      setSavedUsername(inserted!.username);
      toast.success('Demo created — one more step: upload the print PDF.');
      setStep('upload_pdf');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create demo');
    } finally {
      setSaving(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !savedId) return;
    if (file.type !== 'application/pdf') return toast.error('Only PDF files are accepted');
    if (file.size > 15 * 1024 * 1024) return toast.error('PDF must be under 15MB');
    setUploadingPdf(true);
    try {
      const path = `${savedId}/print_ready.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from('card-print-files')
        .upload(path, file, { upsert: true, contentType: 'application/pdf' });
      if (uploadErr) throw uploadErr;
      const { error: dbErr } = await supabase
        .from('personal_profiles')
        .update({ card_print_pdf_path: path } as any)
        .eq('id', savedId);
      if (dbErr) throw dbErr;
      setPrintPdfPath(path);
      toast.success('Print PDF uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploadingPdf(false);
    }
  };

  const viewPdf = async () => {
    if (!printPdfPath) return;
    const { data, error } = await supabase.storage
      .from('card-print-files')
      .createSignedUrl(printPdfPath, 900);
    if (error || !data?.signedUrl) return toast.error('Could not open file');
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const goToEditor = () => {
    if (savedId) navigate(`/dashboard?profile_id=${savedId}`);
  };

  if (authLoading || repLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="animate-pulse text-white/40">Loading…</div>
      </div>
    );
  }

  if (step === 'upload_pdf') {
    return (
      <RepShell title="Step 2 of 2 — Upload Print File" subtitle="Almost done.">
        <RepCard className="p-6 max-w-2xl mx-auto">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-400/20 flex-shrink-0">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Great work — the demo hub is created.</h3>
              <p className="text-sm text-white/60 mt-1">
                Now upload the print-ready PDF card layout you designed in Canva. After this you'll
                land inside the real Business Lite dashboard to build out links, blocks, and design.
              </p>
            </div>
          </div>

          <div className="rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            {printPdfPath ? (
              <div className="flex items-center justify-center gap-2 text-emerald-300 mb-4">
                <FileText className="h-5 w-5" />
                <span className="font-medium">print_ready.pdf uploaded</span>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-white/30 mx-auto mb-3" />
                <p className="text-white/60 text-sm mb-4">
                  Drag & drop or click to upload · PDF only · 15MB max
                </p>
              </>
            )}
            <label className="inline-block cursor-pointer">
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handlePdfUpload}
                disabled={uploadingPdf}
              />
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 text-[#0a0e1a] font-semibold hover:bg-emerald-400 transition-colors">
                <Upload className="h-4 w-4" />
                {uploadingPdf ? 'Uploading…' : printPdfPath ? 'Replace PDF' : 'Select PDF File'}
              </span>
            </label>
            {printPdfPath && (
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={viewPdf} className="border-white/10 bg-white/[0.03] text-white/80">
                  <ExternalLink className="h-4 w-4 mr-1" /> View
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => navigate('/rep/restaurants')}
              className="text-white/60 hover:text-white"
            >
              Skip for now
            </Button>
            <Button
              onClick={goToEditor}
              className="bg-emerald-500 text-[#0a0e1a] hover:bg-emerald-400"
            >
              {printPdfPath ? 'Continue to Editor' : 'Skip & Continue to Editor'}
            </Button>
          </div>
        </RepCard>
      </RepShell>
    );
  }

  const inputCls = 'bg-white/[0.03] border-white/10 text-white placeholder:text-white/30';

  return (
    <RepShell
      title="New Demo Hub"
      subtitle="Step 1 of 2 · basic info · pending admin approval"
    >
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/rep/restaurants')}
          className="text-white/60 hover:text-white -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Pipeline
        </Button>
      </div>

      <RepCard className="p-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-3 mb-6">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex-shrink-0">
            <Building2 className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Create a Business Lite demo hub</h3>
            <p className="text-sm text-white/60 mt-1">
              Enter the business basics. On the next step you'll upload the printed card PDF, then
              land in the real Business Lite dashboard — same draggable blocks, hero editor, and
              design tools a paying Solo owner sees.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-white/70">Business Name *</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Joe's Pizza"
              className={inputCls}
            />
          </div>
          <div>
            <Label className="text-white/70">Business Phone *</Label>
            <Input
              type="tel"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              placeholder="+1 555 555 5555"
              className={inputCls}
            />
          </div>
          <div>
            <Label className="text-white/70">
              Owner Email <span className="text-white/40">(optional — used when they claim the account)</span>
            </Label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="owner@business.com"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <Button
            variant="ghost"
            onClick={() => navigate('/rep/restaurants')}
            className="text-white/60 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving}
            className="bg-emerald-500 text-[#0a0e1a] hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create & Continue'}
            <CheckCircle2 className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </RepCard>
    </RepShell>
  );
};

export default RepDemoCreate;
