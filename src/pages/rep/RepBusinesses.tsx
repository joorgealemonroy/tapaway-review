import { useEffect, useState } from 'react';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useSalesRep } from '@/hooks/useSalesRep';
import { supabase } from '@/integrations/supabase/client';
import { Plus, ExternalLink, Pencil, FileText, Upload, Palette, Trash2, MessageSquareWarning, ArrowRight } from 'lucide-react';
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
  review_note: string | null;
  review_note_at: string | null;
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
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    else if (!repLoading && !adminLoading && !isSalesRep) navigate(isAdmin ? '/admin/reps' : '/');
  }, [authLoading, repLoading, adminLoading, user, isSalesRep, isAdmin, navigate]);

  useEffect(() => {
    if (!salesRep) return;
    (async () => {
      const { data, error } = await supabase
        .from('personal_profiles')
        .select('id, full_name, username, business_phone, contact_phone, created_at, pipeline_status, card_print_pdf_path, is_approved, review_note, review_note_at')
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
            review_note: d.review_note ?? null,
            review_note_at: d.review_note_at ?? null,
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

  const openPrintPdf = async (path: string, filenameHint?: string) => {
    try {
      const { data, error } = await supabase.storage.from('card-print-files').download(path);
      if (error || !data) throw error ?? new Error('Empty download');
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      const base = filenameHint?.trim() || path.split('/').pop() || 'print-file';
      a.download = base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('Download failed', e);
      toast.error('Download failed: ' + (e instanceof Error ? e.message : 'unknown'));
    }
  };

  const openPrintPdfInTab = async (path: string) => {
    const { data, error } = await supabase.storage.from('card-print-files').createSignedUrl(path, 900);
    if (error || !data?.signedUrl) {
      toast.error('Could not open file');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const uploadPdf = async (
    hubId: string,
    file: File,
    inputEl?: HTMLInputElement | null,
  ) => {
    if (!file || file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      if (inputEl) inputEl.value = '';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('PDF must be under 15MB');
      if (inputEl) inputEl.value = '';
      return;
    }
    setUploadingId(hubId);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(0, 120);
      const path = `${hubId}/${Date.now()}-${safeName}`;
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
      console.error('Upload failed', e);
      toast.error('Upload failed: ' + (e instanceof Error ? e.message : 'unknown'));
    } finally {
      setUploadingId(null);
      if (inputEl) inputEl.value = '';
    }
  };

  const deleteDraft = async (hub: Business) => {
    if (hub.is_approved || hub.pipeline_status === 'ready_for_review') {
      toast.error('Submitted or approved hubs cannot be deleted here');
      return;
    }
    if (!window.confirm(`Delete draft "${hub.restaurant_name}"? This cannot be undone.`)) return;
    const prev = hubs;
    setHubs(prev.filter(h => h.id !== hub.id));
    const { error } = await supabase.from('personal_profiles').delete().eq('id', hub.id);
    if (error) {
      setHubs(prev);
      toast.error('Delete failed: ' + error.message);
    } else {
      toast.success('Draft deleted');
    }
  };

  if (authLoading || repLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="animate-pulse text-white/40">Loading…</div>
      </div>
    );
  }

  const changesRequestedHubs = hubs.filter(
    h => !h.is_approved && h.pipeline_status === 'changes_requested' && h.review_note
  );
  const otherHubs = hubs.filter(h => !changesRequestedHubs.some(c => c.id === h.id));

  const q = search.trim().toLowerCase();
  const filteredHubs = q
    ? otherHubs.filter(h =>
        (h.restaurant_name || '').toLowerCase().includes(q) ||
        (h.custom_slug || '').toLowerCase().includes(q)
      )
    : otherHubs;

  return (
    <RepShell
      title="My Businesses"
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
      {hubs.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search businesses by name or slug…"
            className="w-full md:max-w-sm rounded-xl bg-white/[0.03] border border-white/10 text-white/90 placeholder:text-white/30 px-3.5 py-2 text-sm focus:outline-none focus:border-emerald-400/40"
          />
        </div>
      )}

      {changesRequestedHubs.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full border border-amber-400/40 bg-amber-500/15 text-amber-100">
              <MessageSquareWarning className="h-3 w-3" /> Changes Requested
            </span>
            <span className="text-xs text-amber-100/70">
              {changesRequestedHubs.length} hub{changesRequestedHubs.length === 1 ? '' : 's'} need{changesRequestedHubs.length === 1 ? 's' : ''} your attention before approval.
            </span>
          </div>
          <div className="space-y-2">
            {changesRequestedHubs.map(hub => (
              <div
                key={hub.id}
                className="rounded-xl border border-amber-400/20 bg-[#0a0e1a]/60 p-3.5"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{hub.restaurant_name}</p>
                    {hub.custom_slug && (
                      <p className="text-[11px] font-mono text-white/40">/{hub.custom_slug}</p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/dashboard?profile_id=${hub.id}`)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-[#0a0e1a] hover:bg-amber-400"
                  >
                    Fix & Resubmit <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2.5 rounded-lg bg-amber-500/10 border border-amber-400/20 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-widest text-amber-200/70 mb-1 font-semibold">
                    Admin note{hub.review_note_at ? ` · ${formatDate(hub.review_note_at)}` : ''}
                  </p>
                  <p className="text-sm text-amber-50/95 whitespace-pre-wrap">{hub.review_note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

          {filteredHubs.length === 0 && (
            <div className="text-center py-10 text-sm text-white/40">No businesses match "{search}".</div>
          )}
          {filteredHubs.map(hub => {
            const currentStatus = hub.pipeline_status || 'draft';
            const opt = hub.is_approved
              ? { value: 'converted', label: 'Live · Approved', dot: 'bg-emerald-400' }
              : PIPELINE_STATUSES.find(o => o.value === currentStatus) || PIPELINE_STATUSES[0];
            const liveUrl = hub.custom_slug ? `/${hub.custom_slug}` : `/hub/${hub.id}`;
            const uploading = uploadingId === hub.id;
            const statusLocked = hub.is_approved || currentStatus === 'ready_for_review';

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
                  {statusLocked ? (
                    <div className="h-9 inline-flex items-center gap-2 px-3 rounded-md border border-white/10 bg-white/[0.03] text-white/80 text-sm">
                      <span className={`h-2 w-2 rounded-full ${opt.dot}`} />
                      {opt.label}
                    </div>
                  ) : (
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
                        {PIPELINE_STATUSES.filter(o => o.value !== 'ready_for_review').map(o => (
                          <SelectItem key={o.value} value={o.value} className="focus:bg-white/10 focus:text-white">
                            <span className="inline-flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${o.dot}`} />
                              {o.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
                  {!hub.is_approved && hub.pipeline_status !== 'ready_for_review' && (
                    <button
                      onClick={() => deleteDraft(hub)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-red-400/30 bg-red-400/10 text-red-200 hover:bg-red-400/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
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
