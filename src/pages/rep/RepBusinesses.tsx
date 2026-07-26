import { useEffect, useState } from 'react';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useSalesRep } from '@/hooks/useSalesRep';
import { supabase } from '@/integrations/supabase/client';
import { Plus, ExternalLink, Pencil, FileText, Upload, Palette, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { RepShell } from '@/components/rep/RepShell';
import { RepCard } from '@/components/rep/RepCard';
import { PIPELINE_STATUSES } from '@/components/rep/StatusDot';

interface Business {
  id: string;
  restaurant_name: string;
  custom_slug: string | null;
  owner_phone: string | null;
  expires_at: string | null;
  created_at: string;
  pipeline_status: string | null;
  card_print_pdf_path: string | null;
  is_approved: boolean | null;
}

const CANVA_TEMPLATE_URL = 'https://canva.link/tapaway-temp';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const RepBusinesses = () => {
  const navigate = useRepNavigate();
  const { user, loading: authLoading } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [hubs, setHubs] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    else if (!repLoading && !adminLoading && !isSalesRep) navigate(isAdmin ? '/admin/reps' : '/');
  }, [authLoading, repLoading, adminLoading, user, isSalesRep, isAdmin, navigate]);

  useEffect(() => {
    if (!salesRep) return;
    (async () => {
      const { data, error } = await supabase
        .from('personal_profiles')
        .select('id, full_name, username, business_phone, contact_phone, created_at, pipeline_status, card_print_pdf_path, is_approved')
        .eq('sales_rep_id', salesRep.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error(error);
        toast.error('Failed to load businesses');
      } else {
        setHubs(
          ((data || []) as any[]).map((d) => ({
            id: d.id,
            restaurant_name: d.full_name,
            custom_slug: d.username,
            owner_phone: d.business_phone || d.contact_phone || null,
            expires_at: null,
            created_at: d.created_at,
            pipeline_status: d.pipeline_status,
            card_print_pdf_path: d.card_print_pdf_path,
            is_approved: d.is_approved ?? false,
          })),
        );
      }
      setLoading(false);
    })();
  }, [salesRep]);

  const updatePipeline = async (hubId: string, value: string) => {
    const prev = hubs;
    setHubs(prev.map(h => (h.id === hubId ? { ...h, pipeline_status: value } : h)));
    const { error } = await supabase
      .from('personal_profiles')
      .update({ pipeline_status: value } as any)
      .eq('id', hubId);
    if (error) {
      setHubs(prev);
      toast.error('Failed to update status');
    }
  };

  const openPrintPdf = async (path: string) => {
    const { data, error } = await supabase.storage.from('card-print-files').createSignedUrl(path, 900);
    if (error || !data?.signedUrl) {
      toast.error('Could not open file');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const uploadPdf = async (hubId: string, file: File) => {
    if (!file || file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('PDF must be under 15MB');
      return;
    }
    setUploadingId(hubId);
    try {
      const path = `${hubId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('card-print-files').upload(path, file, {
        upsert: true,
        contentType: 'application/pdf',
      });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from('personal_profiles').update({ card_print_pdf_path: path } as any).eq('id', hubId);
      if (dbErr) throw dbErr;
      setHubs(prev => prev.map(h => (h.id === hubId ? { ...h, card_print_pdf_path: path } : h)));
      toast.success('Print file saved');
    } catch (e) {
      console.error(e);
      toast.error('Upload failed');
    } finally {
      setUploadingId(null);
    }
  };

  if (authLoading || repLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="animate-pulse text-white/40">Loading…</div>
      </div>
    );
  }

  return (
    <RepShell
      title="My Pipeline"
      subtitle={`${hubs.length} business${hubs.length === 1 ? '' : 'es'} in your book`}
      right={
        <>
          <a
            href={CANVA_TEMPLATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"
          >
            <Palette className="h-3.5 w-3.5" /> Canva Template
          </a>
          <button
            onClick={() => navigate('/rep/demo/new')}
            className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold bg-emerald-500 text-[#0a0e1a] hover:bg-emerald-400"
          >
            <Plus className="h-3.5 w-3.5" /> New Demo
          </button>
        </>
      }
    >
      {hubs.length === 0 ? (
        <RepCard className="text-center py-20">
          <p className="text-white/50 mb-4">No businesses yet. Start building your book.</p>
          <button
            onClick={() => navigate('/rep/demo/new')}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-emerald-500 text-[#0a0e1a] hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" /> Create your first demo
          </button>
        </RepCard>
      ) : (
        <RepCard className="overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[2fr_1fr_1.5fr_1.2fr_auto] gap-4 px-5 py-3 border-b border-white/5 bg-white/[0.02] text-[10px] font-semibold text-white/40 uppercase tracking-widest">
            <div>Business</div>
            <div>Created</div>
            <div>Status</div>
            <div>Card PDF</div>
            <div className="text-right">Action</div>
          </div>

          {hubs.map(hub => {
            const currentStatus = hub.pipeline_status || 'draft';
            const opt = PIPELINE_STATUSES.find(o => o.value === currentStatus) || PIPELINE_STATUSES[0];
            const liveUrl = hub.custom_slug ? `/${hub.custom_slug}` : `/hub/${hub.id}`;
            const uploading = uploadingId === hub.id;

            return (
              <div
                key={hub.id}
                className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1.5fr_1.2fr_auto] gap-2 md:gap-4 px-5 py-4 border-b border-white/5 last:border-b-0 items-start md:items-center hover:bg-white/[0.015] transition-colors"
              >
                <div>
                  <p className="font-medium text-white">{hub.restaurant_name}</p>
                  {hub.custom_slug && (
                    <p className="text-xs text-white/40 truncate">/{hub.custom_slug}</p>
                  )}
                </div>
                <div className="text-sm text-white/50">{formatDate(hub.created_at)}</div>
                <div>
                  <Select value={currentStatus} onValueChange={(v) => updatePipeline(hub.id, v)}>
                    <SelectTrigger className="h-9 w-full max-w-[220px] bg-white/[0.03] border-white/10 text-white/80 hover:bg-white/[0.06]">
                      <SelectValue>
                        <span className="inline-flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${opt.dot}`} />
                          {opt.label}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f1420] border-white/10 text-white/80">
                      {PIPELINE_STATUSES.map(o => (
                        <SelectItem key={o.value} value={o.value} className="focus:bg-white/10 focus:text-white">
                          <span className="inline-flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${o.dot}`} />
                            {o.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  {hub.card_print_pdf_path ? (
                    <>
                      <button
                        onClick={() => openPrintPdf(hub.card_print_pdf_path!)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
                      >
                        <FileText className="h-3.5 w-3.5" /> View
                      </button>
                      <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]">
                        <Upload className="h-3.5 w-3.5" /> Replace
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          disabled={uploading}
                          onChange={(e) => e.target.files?.[0] && uploadPdf(hub.id, e.target.files[0])}
                        />
                      </label>
                    </>
                  ) : (
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-dashed border-white/15 bg-white/[0.02] text-white/50 hover:text-white/80 hover:border-white/30">
                      <Upload className="h-3.5 w-3.5" />
                      {uploading ? 'Uploading…' : 'Upload PDF'}
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => e.target.files?.[0] && uploadPdf(hub.id, e.target.files[0])}
                      />
                    </label>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <button
                    onClick={() => navigate(`/dashboard?profile_id=${hub.id}`)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => window.open(liveUrl, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </button>
                </div>
              </div>
            );
          })}
        </RepCard>
      )}
    </RepShell>
  );
};

export default RepBusinesses;
