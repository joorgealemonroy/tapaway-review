import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Plus,
  Trash2,
  Mail,
  Globe,
  MapPin,
  Link as LinkIcon,
  Palette,
  MessagesSquare,
  Image as ImageIcon,
  LayoutTemplate,
} from 'lucide-react';
import { toast } from 'sonner';
import { RepShell } from '@/components/rep/RepShell';
import { RepCard } from '@/components/rep/RepCard';
import {
  LivePhonePreview,
  type LinkBlock,
  type Socials,
  type HeaderStyle,
} from '@/components/rep/LivePhonePreview';
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

const newBlockId = () => Math.random().toString(36).slice(2, 10);

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
  const [activeTab, setActiveTab] = useState<'links' | 'design' | 'leads'>('links');

  const [form, setForm] = useState({
    business_name: '',
    business_phone: '',
    website_url: '',
    google_place_id: '',
    bio: '',
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [existingSlug, setExistingSlug] = useState<string | null>(null);
  const [printPdfPath, setPrintPdfPath] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [themeStyle, setThemeStyle] = useState<BackgroundThemeStyle>('default');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);
  const [headerStyle, setHeaderStyle] = useState<HeaderStyle>('full_banner');
  const [socials, setSocials] = useState<Socials>({});
  const [socialImages, setSocialImages] = useState<Partial<Record<'instagram' | 'yelp' | 'facebook' | 'tiktok', string>>>({});
  const [blocks, setBlocks] = useState<LinkBlock[]>([]);
  const [contactCardEnabled, setContactCardEnabled] = useState(true);
  const [foundingBadge, setFoundingBadge] = useState(false);
  const [leadFormEnabled, setLeadFormEnabled] = useState(false);

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
      const settings = (d.settings as any) || {};
      setForm({
        business_name: d.restaurant_name || '',
        business_phone: d.business_phone || d.owner_phone || '',
        website_url: d.website_url || '',
        google_place_id: d.google_place_id || '',
        bio: settings.bio || '',
      });
      setLogoUrl(d.logo_url);
      setBannerUrl(settings.banner_url || null);
      setExistingSlug(d.custom_slug);
      setPrintPdfPath(d.card_print_pdf_path || null);
      setThemeStyle((d.background_theme_style as BackgroundThemeStyle) || 'default');
      setPrimaryColor(d.primary_color || DEFAULT_PRIMARY);
      setSecondaryColor(d.secondary_color || DEFAULT_SECONDARY);
      if (Array.isArray(settings.gallery)) setGallery(settings.gallery);
      if (settings.header_style) setHeaderStyle(settings.header_style);
      setSocials({
        instagram: d.instagram_url || settings.socials?.instagram || '',
        yelp: d.yelp_review_url || settings.socials?.yelp || '',
        facebook: settings.socials?.facebook || '',
        tiktok: settings.socials?.tiktok || '',
      });
      setSocialImages(settings.social_images || {});
      if (Array.isArray(settings.blocks)) setBlocks(settings.blocks);
      if (typeof settings.contact_card_enabled === 'boolean') setContactCardEnabled(settings.contact_card_enabled);
      if (settings.badges?.founding) setFoundingBadge(true);
      if (typeof settings.lead_form_enabled === 'boolean') setLeadFormEnabled(settings.lead_form_enabled);
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
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/logo-${Date.now()}-${safeName}`;
    const url = await uploadToBucket(file, path);
    if (url) setLogoUrl(url);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/banner-${Date.now()}-${safeName}`;
    const url = await uploadToBucket(file, path);
    if (url) setBannerUrl(url);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (gallery.length >= 3) return toast.error('Maximum 3 gallery images');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/gallery-${Date.now()}-${safeName}`;
    const url = await uploadToBucket(file, path);
    if (url) setGallery(prev => [...prev, url]);
  };

  const removeGalleryImage = (idx: number) => {
    setGallery(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSocialImageUpload = async (
    platform: 'instagram' | 'yelp' | 'facebook' | 'tiktok',
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/social-${platform}-${Date.now()}-${safeName}`;
    const url = await uploadToBucket(file, path);
    if (url) setSocialImages(prev => ({ ...prev, [platform]: url }));
    e.target.value = '';
  };

  const handleBlockImageUpload = async (
    blockId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/block-${blockId}-${Date.now()}-${safeName}`;
    const url = await uploadToBucket(file, path);
    if (url) updateBlock(blockId, { image: url } as any);
    e.target.value = '';
  };


  const addBlock = (preset?: 'email' | 'website' | 'directions') => {
    const presets: Record<string, { title: string; url: string; kind: LinkBlock['kind'] }> = {
      email: { title: 'Get In Contact!', url: 'mailto:hello@example.com', kind: 'email' },
      website: { title: 'Check Out Our Website!', url: '', kind: 'website' },
      directions: { title: 'Directions', url: 'https://maps.apple.com/?q=', kind: 'directions' },
    };
    const p = preset ? presets[preset] : { title: '', url: '', kind: 'custom' as const };
    setBlocks(prev => [
      ...prev,
      { id: newBlockId(), title: p.title, url: p.url, kind: p.kind, active: true },
    ]);
  };

  const updateBlock = (id: string, patch: Partial<LinkBlock>) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));
  };
  const removeBlock = (id: string) => setBlocks(prev => prev.filter(b => b.id !== id));

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.business_name.trim()) return toast.error('Business name is required');
    if (!form.business_phone.trim()) return toast.error("Business phone number is required");

    setSaving(true);
    try {
      const settingsPayload = {
        gallery,
        bio: form.bio.trim(),
        banner_url: bannerUrl,
        header_style: headerStyle,
        socials: {
          instagram: socials.instagram?.trim() || '',
          yelp: socials.yelp?.trim() || '',
          facebook: socials.facebook?.trim() || '',
          tiktok: socials.tiktok?.trim() || '',
        },
        social_images: socialImages,
        blocks,
        contact_card_enabled: contactCardEnabled,
        badges: { founding: foundingBadge },
        lead_form_enabled: leadFormEnabled,
      };

      const payload: any = {
        restaurant_name: form.business_name.trim(),
        business_phone: form.business_phone.trim(),
        owner_phone: form.business_phone.trim(),
        website_url: form.website_url.trim() || null,
        google_place_id: form.google_place_id.trim() || null,
        instagram_url: socials.instagram?.trim() || null,
        yelp_review_url: socials.yelp?.trim() || null,
        logo_url: logoUrl,
        background_theme_style: themeStyle,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        settings: settingsPayload,
      };

      if (editId) {
        const { error } = await supabase.from('restaurants').update(payload).eq('id', editId);
        if (error) throw error;
        toast.success('Demo hub updated');
        navigate('/rep/restaurants');
      } else {
        // 50-demo daily cap
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

  const inputCls = 'bg-white/[0.03] border-white/10 text-white placeholder:text-white/30';
  const cardCls = 'p-4';

  return (
    <RepShell
      title={editId ? 'Edit Demo Hub' : 'New Demo Hub'}
      subtitle={editId ? 'Update this demo hub' : 'Live for 5 days · pending admin approval'}
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
        {/* LEFT — tabs */}
        <div>
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-3 w-full bg-white/[0.03] border border-white/10">
              <TabsTrigger value="links" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-[#0a0e1a]">
                <LinkIcon className="h-4 w-4 mr-1.5" /> Links
              </TabsTrigger>
              <TabsTrigger value="design" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-[#0a0e1a]">
                <Palette className="h-4 w-4 mr-1.5" /> Design
              </TabsTrigger>
              <TabsTrigger value="leads" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-[#0a0e1a]">
                <MessagesSquare className="h-4 w-4 mr-1.5" /> Leads
              </TabsTrigger>
            </TabsList>

            {/* LINKS TAB */}
            <TabsContent value="links" className="mt-4 space-y-4">
              <RepCard className={cardCls}>
                <h3 className="text-white font-semibold mb-1">Hero Identity</h3>
                <p className="text-xs text-white/50 mb-4">The basics shown at the top of the page.</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-white/70">Business Name *</Label>
                    <Input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} placeholder="Joe's Pizza" className={inputCls} />
                  </div>
                  <div>
                    <Label className="text-white/70">Phone Number *</Label>
                    <Input type="tel" value={form.business_phone} onChange={e => setForm({ ...form, business_phone: e.target.value })} placeholder="+1 555 555 5555" className={inputCls} />
                  </div>
                  <div>
                    <Label className="text-white/70">Bio / Description</Label>
                    <Textarea rows={2} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Family-owned pizzeria in Brooklyn since 1979" className={inputCls} />
                  </div>
                  <div>
                    <Label className="text-white/70">Website URL <span className="text-white/40">(Optional)</span></Label>
                    <Input value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} placeholder="https://joespizza.com" className={inputCls} />
                  </div>
                  <div>
                    <Label className="text-white/70">Google Place ID</Label>
                    <Input value={form.google_place_id} onChange={e => setForm({ ...form, google_place_id: e.target.value })} placeholder="ChIJV_SjbZJMw4ARZINlm2uAaoE" className={`${inputCls} font-mono text-sm`} />
                    <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200 mt-1">
                      <HelpCircle className="h-3 w-3" /> How to find a Place ID
                    </a>
                  </div>
                </div>
              </RepCard>

              <RepCard className={cardCls}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold">Content Blocks</h3>
                    <p className="text-xs text-white/50">Custom CTA buttons rendered on the hub.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button size="sm" variant="outline" onClick={() => addBlock('email')} className="border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]">
                    <Mail className="h-3.5 w-3.5 mr-1" /> Email
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addBlock('website')} className="border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]">
                    <Globe className="h-3.5 w-3.5 mr-1" /> Website
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addBlock('directions')} className="border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]">
                    <MapPin className="h-3.5 w-3.5 mr-1" /> Directions
                  </Button>
                  <Button size="sm" onClick={() => addBlock()} className="bg-emerald-500 text-[#0a0e1a] hover:bg-emerald-400">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Link
                  </Button>
                </div>

                <div className="space-y-2">
                  {blocks.length === 0 && (
                    <div className="text-center py-6 text-xs text-white/40 border border-dashed border-white/10 rounded-lg">
                      No blocks yet — use the presets above to add one.
                    </div>
                  )}
                  {blocks.map(b => {
                    const img = (b as any).image as string | undefined;
                    return (
                      <div key={b.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer flex-shrink-0">
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleBlockImageUpload(b.id, e)} />
                            {img ? (
                              <img src={img} alt="" className="h-9 w-9 rounded-md object-cover border border-white/10" />
                            ) : (
                              <span className="h-9 w-9 rounded-md border border-dashed border-white/15 bg-white/[0.03] flex items-center justify-center text-white/40 hover:bg-white/[0.06]">
                                <ImageIcon className="h-4 w-4" />
                              </span>
                            )}
                          </label>
                          <Input value={b.title} onChange={e => updateBlock(b.id, { title: e.target.value })} placeholder="Button title" className={`${inputCls} h-9 text-sm`} />
                          <Switch checked={b.active} onCheckedChange={v => updateBlock(b.id, { active: v })} />
                          <button onClick={() => removeBlock(b.id)} className="text-white/40 hover:text-red-400 p-1" type="button">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input value={b.url} onChange={e => updateBlock(b.id, { url: e.target.value })} placeholder="URL / mailto: / tel:" className={`${inputCls} h-9 text-sm font-mono`} />
                          {img && (
                            <button
                              type="button"
                              onClick={() => updateBlock(b.id, { image: null } as any)}
                              className="text-[11px] text-white/40 hover:text-red-400"
                            >
                              Remove image
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                </div>
              </RepCard>

              <RepCard className={cardCls}>
                <h3 className="text-white font-semibold mb-1">Social Blocks</h3>
                <p className="text-xs text-white/50 mb-4">Rendered as tappable icons — deep-linked on mobile.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/70">Instagram</Label>
                    <Input value={socials.instagram || ''} onChange={e => setSocials({ ...socials, instagram: e.target.value })} placeholder="https://instagram.com/joespizza" className={inputCls} />
                  </div>
                  <div>
                    <Label className="text-white/70">Yelp</Label>
                    <Input value={socials.yelp || ''} onChange={e => setSocials({ ...socials, yelp: e.target.value })} placeholder="https://yelp.com/biz/..." className={inputCls} />
                  </div>
                  <div>
                    <Label className="text-white/70">Facebook</Label>
                    <Input value={socials.facebook || ''} onChange={e => setSocials({ ...socials, facebook: e.target.value })} placeholder="https://facebook.com/joespizza" className={inputCls} />
                  </div>
                  <div>
                    <Label className="text-white/70">TikTok</Label>
                    <Input value={socials.tiktok || ''} onChange={e => setSocials({ ...socials, tiktok: e.target.value })} placeholder="https://tiktok.com/@joespizza" className={inputCls} />
                  </div>
                </div>
              </RepCard>
            </TabsContent>

            {/* DESIGN TAB */}
            <TabsContent value="design" className="mt-4 space-y-4">
              <RepCard className={cardCls}>
                <h3 className="text-white font-semibold mb-1">Banner Image</h3>
                <p className="text-xs text-white/50 mb-3">This banner acts as your logo and header.</p>
                <div className="flex items-center gap-3">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="" className="h-16 w-32 object-cover rounded-lg border border-white/10" />
                  ) : (
                    <div className="h-16 w-32 rounded-lg bg-white/[0.03] border border-dashed border-white/10 flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-white/40" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 bg-white/[0.03] text-sm text-white/80 hover:bg-white/[0.06]">
                      <Upload className="h-4 w-4" /> {bannerUrl ? 'Replace' : 'Upload'}
                    </span>
                  </label>
                </div>
              </RepCard>

              <RepCard className={cardCls}>
                <h3 className="text-white font-semibold mb-1">Gallery</h3>
                <p className="text-xs text-white/50 mb-3">Up to 3 photos shown beneath the header.</p>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {gallery.map((url, i) => (
                    <div key={url} className="relative aspect-square">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-white/10" />
                      <button onClick={() => removeGalleryImage(i)} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1" type="button">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {gallery.length < 3 && (
                    <label className="cursor-pointer aspect-square rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1 hover:border-emerald-400/40">
                      <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
                      <ImagePlus className="h-5 w-5 text-white/40" />
                      <span className="text-[10px] text-white/40">Add</span>
                    </label>
                  )}
                </div>
              </RepCard>


              <RepCard className={cardCls}>
                <h3 className="text-white font-semibold mb-1">Colors & Theme</h3>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label className="text-white/70">Primary</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-10 w-14 rounded-md border border-white/10 bg-transparent cursor-pointer" />
                      <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className={`${inputCls} text-sm font-mono`} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-white/70">Page Background</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="h-10 w-14 rounded-md border border-white/10 bg-transparent cursor-pointer" />
                      <Input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className={`${inputCls} text-sm font-mono`} />
                    </div>
                  </div>
                </div>
                <div className="mt-4">
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
              </RepCard>

              <RepCard className={cardCls}>
                <h3 className="text-white font-semibold mb-3">Badges & Contact</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">Founding Creator Badge</p>
                      <p className="text-xs text-white/50">Adds a subtle badge beneath the bio.</p>
                    </div>
                    <Switch checked={foundingBadge} onCheckedChange={setFoundingBadge} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">Contact Card</p>
                      <p className="text-xs text-white/50">Shows a "Save Contact" pill under the bio.</p>
                    </div>
                    <Switch checked={contactCardEnabled} onCheckedChange={setContactCardEnabled} />
                  </div>
                </div>
              </RepCard>
            </TabsContent>

            {/* LEADS TAB */}
            <TabsContent value="leads" className="mt-4 space-y-4">
              <RepCard className={cardCls}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">Lead Capture Form</h3>
                    <p className="text-xs text-white/50">Adds an email input block for VIP club signups.</p>
                  </div>
                  <Switch checked={leadFormEnabled} onCheckedChange={setLeadFormEnabled} />
                </div>
              </RepCard>

              <RepCard className={cardCls}>
                <h3 className="text-white font-semibold mb-3">Form Submissions</h3>
                <div className="text-center py-10 border border-dashed border-white/10 rounded-lg bg-white/[0.01]">
                  <MessagesSquare className="h-8 w-8 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/50">No form submissions yet</p>
                  <p className="text-xs text-white/30 mt-1">Once approved, customer inquiries land here.</p>
                </div>
              </RepCard>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => navigate('/rep/restaurants')} className="flex-1 border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="flex-1 bg-emerald-500 text-[#0a0e1a] hover:bg-emerald-400">
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Demo Hub'}
            </Button>
          </div>
        </div>

        {/* RIGHT — simulator */}
        <div>
          <LivePhonePreview
            businessName={form.business_name}
            bio={form.bio}
            logoUrl={logoUrl}
            gallery={gallery}
            themeStyle={themeStyle}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            businessPhone={form.business_phone.trim()}
            headerStyle={headerStyle}
            bannerUrl={bannerUrl}
            socials={socials}
            blocks={blocks}
            contactCardEnabled={contactCardEnabled}
            foundingBadge={foundingBadge}
            leadFormEnabled={leadFormEnabled}
            hasGoogle={!!form.google_place_id.trim()}
            hasWebsite={!!form.website_url.trim()}
          />
        </div>
      </div>
    </RepShell>
  );
};

export default RepDemoCreate;
