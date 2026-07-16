import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useSalesRep } from '@/hooks/useSalesRep';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Upload,
  X,
  ImagePlus,
  FileText,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { RepShell } from '@/components/rep/RepShell';
import { RepCard } from '@/components/rep/RepCard';
import { LivePhonePreview } from '@/components/rep/LivePhonePreview';
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  THEME_OPTIONS,
  type BackgroundThemeStyle,
} from '@/lib/hubThemes';

const slugify = (name: string) => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || 'hub'}-${suffix}`;
};

const uploadToBucket = async (file: File, path: string): Promise<string | null> => {
  const { error } = await supabase.storage
    .from('restaurant-logos')
    .upload(path, file, { upsert: true, cacheControl: '3600' });
  if (error) {
    toast.error(`Upload failed: ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from('restaurant-logos').getPublicUrl(path);
  return data.publicUrl;
};

type Step = 'edit' | 'upload_pdf' | 'done';

const RepDemoCreate = () => {
  const navigate = useRepNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { loading: repLoading, isSalesRep } = useSalesRep();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>('edit');
  const [savedId, setSavedId] = useState<string | null>(editId || null);

  const [form, setForm] = useState({
    business_name: '',
    business_phone: '',
    website_url: '',
    google_place_id: '',
    instagram_url: '',
    yelp_review_url: '',
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [existingSlug, setExistingSlug] = useState<string | null>(null);
  const [printPdfPath, setPrintPdfPath] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [themeStyle, setThemeStyle] = useState<BackgroundThemeStyle>('default');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    else if (!repLoading && !adminLoading && !isSalesRep) navigate(isAdmin ? '/admin/reps' : '/');
  }, [authLoading, repLoading, adminLoading, user, isSalesRep, isAdmin, navigate]);

  useEffect(() => {
    if (!editId || !user) return;
    (async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', editId)
        .maybeSingle();
      if (error || !data) {
        toast.error('Demo hub not found');
        navigate('/rep/restaurants');
        return;
      }
      const d = data as any;
      setForm({
        business_name: d.restaurant_name || '',
        business_phone: d.business_phone || d.owner_phone || '',
        website_url: d.website_url || '',
        google_place_id: d.google_place_id || '',
        instagram_url: d.instagram_url || '',
        yelp_review_url: d.yelp_review_url || '',
      });
      setLogoUrl(d.logo_url);
      setExistingSlug(d.custom_slug);
      setPrintPdfPath(d.card_print_pdf_path || null);
      setThemeStyle((d.background_theme_style as BackgroundThemeStyle) || 'default');
      setPrimaryColor(d.primary_color || DEFAULT_PRIMARY);
      setSecondaryColor(d.secondary_color || DEFAULT_SECONDARY);
      const settings = (d.settings as any) || {};
      if (Array.isArray(settings.gallery)) setGallery(settings.gallery);
      setLoading(false);
    })();
  }, [editId, user, navigate]);

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
        .from('restaurants')
        .update({ card_print_pdf_path: path })
        .eq('id', savedId);
      if (dbErr) throw dbErr;
      setPrintPdfPath(path);
      toast.success('Print PDF uploaded');
      if (!editId) setStep('done');
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const path = `demo/${user.id}/${Date.now()}-${file.name}`;
    const url = await uploadToBucket(file, path);
    if (url) setLogoUrl(url);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (gallery.length >= 3) return toast.error('Maximum 3 gallery images');
    const slug = existingSlug || slugify(form.business_name || 'demo');
    const path = `gallery/${slug}/${Date.now()}-${file.name}`;
    const url = await uploadToBucket(file, path);
    if (url) setGallery(prev => [...prev, url]);
  };

  const removeGalleryImage = (idx: number) => {
    setGallery(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.business_name.trim()) return toast.error('Business name is required');
    if (!form.business_phone.trim()) return toast.error("Business phone number is required");

    setSaving(true);
    try {
      const payload: any = {
        restaurant_name: form.business_name.trim(),
        business_phone: form.business_phone.trim(),
        owner_phone: form.business_phone.trim(),
        website_url: form.website_url.trim() || null,
        google_place_id: form.google_place_id.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        yelp_review_url: form.yelp_review_url.trim() || null,
        logo_url: logoUrl,
        background_theme_style: themeStyle,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        settings: { gallery },
      };

      if (editId) {
        const { error } = await supabase.from('restaurants').update(payload).eq('id', editId);
        if (error) throw error;
        toast.success('Demo hub updated');
        navigate('/rep/restaurants');
      } else {
        // Enforce 50-demo daily cap on raw creations
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { count: todayCount, error: countError } = await supabase
          .from('restaurants')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', user.id)
          .gte('created_at', startOfDay.toISOString());
        if (countError) throw countError;
        if ((todayCount ?? 0) >= 50) {
          toast.error("You've hit the 50-demo daily cap. Please continue tomorrow.");
          setSaving(false);
          return;
        }

        const slug = slugify(form.business_name);
        const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
        const { data: inserted, error } = await supabase
          .from('restaurants')
          .insert({
            ...payload,
            owner_id: user.id,
            created_by: user.id,
            expires_at: expiresAt,
            subscription_status: 'trialing',
            custom_slug: slug,
            header_title: form.business_name.trim(),
            header_subtitle: '',
            menu_title: 'Menu',
            is_approved: false,
          })
          .select('id')
          .single();
        if (error) throw error;
        setSavedId(inserted!.id);
        setExistingSlug(slug);
        toast.success('Demo hub saved. One more step — upload the print PDF.');
        setStep('upload_pdf');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save demo hub');
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading || repLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="animate-pulse text-white/40">Loading…</div>
      </div>
    );
  }

  // Step 3: Done
  if (step === 'done') {
    return (
      <RepShell title="Submitted for Admin Review" subtitle="Great work.">
        <RepCard className="p-8 text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-300" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Submitted for Admin Review!</h2>
          <p className="text-white/60 mb-6">
            Your manager will review this page shortly. Once approved it counts toward your daily quota and commissions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate('/rep/restaurants')}
              className="bg-emerald-500 text-[#0a0e1a] hover:bg-emerald-400"
            >
              Back to Pipeline
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/rep/demo/new')}
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"
            >
              Create Another Demo
            </Button>
          </div>
        </RepCard>
      </RepShell>
    );
  }

  // Step 2: Print PDF Upload
  if (step === 'upload_pdf') {
    return (
      <RepShell title="Step 2 of 2 — Upload Print File" subtitle="Almost done.">
        <RepCard className="p-6 max-w-2xl mx-auto">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-400/20 flex-shrink-0">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Great work! The digital hub is built.</h3>
              <p className="text-sm text-white/60 mt-1">
                Now, upload the print-ready PDF card layout you designed in Canva.
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

          <div className="flex gap-3 mt-6 justify-end">
            <Button
              variant="ghost"
              onClick={() => navigate('/rep/restaurants')}
              className="text-white/60 hover:text-white"
            >
              Skip for now
            </Button>
            <Button
              onClick={() => setStep('done')}
              disabled={!printPdfPath}
              className="bg-emerald-500 text-[#0a0e1a] hover:bg-emerald-400 disabled:opacity-50"
            >
              Continue
            </Button>
          </div>
        </RepCard>
      </RepShell>
    );
  }

  // Step 1: Split-screen editor
  return (
    <RepShell
      title={editId ? 'Edit Demo Hub' : 'New Demo Hub'}
      subtitle={editId ? 'Update this demo hub' : 'Live for 5 days from creation · pending admin approval'}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT — Configuration */}
        <div className="space-y-4">
          {/* Business Info */}
          <RepCard className="p-5">
            <h3 className="text-white font-semibold mb-1">Business Info</h3>
            <p className="text-xs text-white/50 mb-4">Fast manual entry — no address lookups.</p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="business_name" className="text-white/70">Business Name *</Label>
                <Input
                  id="business_name"
                  value={form.business_name}
                  onChange={e => setForm({ ...form, business_name: e.target.value })}
                  placeholder="Joe's Pizza"
                  className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <Label htmlFor="business_phone" className="text-white/70">Business Phone Number *</Label>
                <Input
                  id="business_phone"
                  type="tel"
                  value={form.business_phone}
                  onChange={e => setForm({ ...form, business_phone: e.target.value })}
                  placeholder="+1 555 555 5555"
                  className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
                />
                <p className="text-xs text-white/40 mt-1">Direct line for customers to call.</p>
              </div>
              <div>
                <Label htmlFor="website_url" className="text-white/70">Website URL <span className="text-white/40">(Optional)</span></Label>
                <Input
                  id="website_url"
                  value={form.website_url}
                  onChange={e => setForm({ ...form, website_url: e.target.value })}
                  placeholder="https://joespizza.com"
                  className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
                />
                <p className="text-xs text-white/40 mt-1">Not every local business has one — leave blank if so.</p>
              </div>

              <div className="pt-2 border-t border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-3">Optional platforms</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="instagram_url" className="text-white/70">Instagram</Label>
                    <Input
                      id="instagram_url"
                      value={form.instagram_url}
                      onChange={e => setForm({ ...form, instagram_url: e.target.value })}
                      placeholder="https://instagram.com/..."
                      className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="yelp_review_url" className="text-white/70">Yelp</Label>
                    <Input
                      id="yelp_review_url"
                      value={form.yelp_review_url}
                      onChange={e => setForm({ ...form, yelp_review_url: e.target.value })}
                      placeholder="https://yelp.com/biz/..."
                      className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                </div>
              </div>
            </div>
          </RepCard>

          {/* Google Place ID */}
          <RepCard className="p-5">
            <h3 className="text-white font-semibold mb-1">Google Review</h3>
            <p className="text-xs text-white/50 mb-4">Enter the Place ID — we'll build the review URL automatically.</p>
            <Label htmlFor="google_place_id" className="text-white/70">Google Place ID</Label>
            <Input
              id="google_place_id"
              value={form.google_place_id}
              onChange={e => setForm({ ...form, google_place_id: e.target.value })}
              placeholder="ChIJV_SjbZJMw4ARZINlm2uAaoE"
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
            />
            <a
              href="https://developers.google.com/maps/documentation/places/web-service/place-id"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200 mt-2"
            >
              <HelpCircle className="h-3 w-3" /> How to find a Place ID
            </a>
          </RepCard>

          {/* Brand Engine */}
          <RepCard className="p-5">
            <h3 className="text-white font-semibold mb-1">Brand Engine</h3>
            <p className="text-xs text-white/50 mb-4">Logo, gallery, colors and background.</p>

            <div className="space-y-4">
              {/* Logo */}
              <div>
                <Label className="text-white/70">Logo</Label>
                <div className="flex items-center gap-4 mt-1">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="w-20 h-20 object-cover rounded-lg border border-white/10" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center">
                      <Upload className="h-5 w-5 text-white/40" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 bg-white/[0.03] text-sm text-white/80 hover:bg-white/[0.06]">
                      <Upload className="h-4 w-4" />
                      {logoUrl ? 'Replace Logo' : 'Upload Logo'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Gallery */}
              <div>
                <Label className="text-white/70">Gallery <span className="text-white/40">(up to 3)</span></Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {gallery.map((url, i) => (
                    <div key={url} className="relative aspect-square">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-white/10" />
                      <button
                        onClick={() => removeGalleryImage(i)}
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1"
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {gallery.length < 3 && (
                    <label className="cursor-pointer aspect-square rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1 hover:border-emerald-400/40 hover:bg-white/[0.03] transition-colors">
                      <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
                      <ImagePlus className="h-5 w-5 text-white/40" />
                      <span className="text-[10px] text-white/40">Add</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="primary_color" className="text-white/70">Primary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      id="primary_color"
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="h-10 w-14 rounded-md border border-white/10 bg-transparent cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="bg-white/[0.03] border-white/10 text-white text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary_color" className="text-white/70">Secondary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      id="secondary_color"
                      type="color"
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      className="h-10 w-14 rounded-md border border-white/10 bg-transparent cursor-pointer"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      className="bg-white/[0.03] border-white/10 text-white text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Theme */}
              <div>
                <Label className="text-white/70">Background Style</Label>
                <Select value={themeStyle} onValueChange={v => setThemeStyle(v as BackgroundThemeStyle)}>
                  <SelectTrigger className="bg-white/[0.03] border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1420] border-white/10 text-white">
                    {THEME_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </RepCard>

          {/* Submit */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/rep/restaurants')}
              className="flex-1 border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-emerald-500 text-[#0a0e1a] hover:bg-emerald-400"
            >
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Demo Hub'}
            </Button>
          </div>
        </div>

        {/* RIGHT — Live phone simulator */}
        <div>
          <LivePhonePreview
            businessName={form.business_name}
            logoUrl={logoUrl}
            gallery={gallery}
            themeStyle={themeStyle}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            hasGoogle={!!form.google_place_id.trim()}
            hasYelp={!!form.yelp_review_url.trim()}
            hasInstagram={!!form.instagram_url.trim()}
            hasWebsite={!!form.website_url.trim()}
            businessPhone={form.business_phone.trim()}
          />
        </div>
      </div>
    </RepShell>
  );
};

export default RepDemoCreate;
