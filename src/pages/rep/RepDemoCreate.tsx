import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useSalesRep } from '@/hooks/useSalesRep';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Upload, X, ImagePlus, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

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
    console.error('Upload failed', error);
    toast.error(`Upload failed: ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from('restaurant-logos').getPublicUrl(path);
  return data.publicUrl;
};

const RepDemoCreate = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { loading: repLoading, isSalesRep } = useSalesRep();

  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: '',
    owner_phone: '',
    website_url: '',
    google_review_url: '',
    instagram_url: '',
    yelp_review_url: '',
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [existingSlug, setExistingSlug] = useState<string | null>(null);
  const [printPdfPath, setPrintPdfPath] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    else if (!repLoading && !isSalesRep) navigate('/');
  }, [authLoading, repLoading, user, isSalesRep, navigate]);

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
      setForm({
        business_name: data.restaurant_name || '',
        owner_phone: (data as any).owner_phone || '',
        website_url: (data as any).website_url || '',
        google_review_url: data.google_review_url || '',
        instagram_url: data.instagram_url || '',
        yelp_review_url: data.yelp_review_url || '',
      });
      setLogoUrl(data.logo_url);
      setExistingSlug(data.custom_slug);
      const settings = (data.settings as any) || {};
      if (Array.isArray(settings.gallery)) setGallery(settings.gallery);
      setLoading(false);
    })();
  }, [editId, user, navigate]);

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
    if (gallery.length >= 3) {
      toast.error('Maximum 3 gallery images');
      return;
    }
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
    if (!form.owner_phone.trim()) return toast.error("Owner's phone number is required");

    setSaving(true);
    try {
      const payload: any = {
        restaurant_name: form.business_name.trim(),
        owner_phone: form.owner_phone.trim(),
        website_url: form.website_url.trim() || null,
        google_review_url: form.google_review_url.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        yelp_review_url: form.yelp_review_url.trim() || null,
        logo_url: logoUrl,
        settings: { gallery },
      };

      if (editId) {
        const { error } = await supabase
          .from('restaurants')
          .update(payload)
          .eq('id', editId);
        if (error) throw error;
        toast.success('Demo hub updated');
      } else {
        const slug = slugify(form.business_name);
        const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
        const { error } = await supabase.from('restaurants').insert({
          ...payload,
          owner_id: user.id,
          created_by: user.id,
          expires_at: expiresAt,
          subscription_status: 'trialing',
          custom_slug: slug,
          header_title: form.business_name.trim(),
          header_subtitle: '',
          menu_title: 'Menu',
        });
        if (error) throw error;
        toast.success('Demo hub created! Live for 5 days.');
      }
      navigate('/rep/restaurants');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save demo hub');
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading || repLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rep/restaurants')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{editId ? 'Edit Demo Hub' : 'New Demo Hub'}</h1>
            <p className="text-sm text-muted-foreground">
              {editId ? 'Update this demo hub' : 'Live for 5 days from creation'}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Info</CardTitle>
            <CardDescription>Fast manual entry — no address lookups.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                value={form.business_name}
                onChange={e => setForm({ ...form, business_name: e.target.value })}
                placeholder="Joe's Pizza"
              />
            </div>
            <div>
              <Label htmlFor="owner_phone">Owner's Phone Number *</Label>
              <Input
                id="owner_phone"
                type="tel"
                value={form.owner_phone}
                onChange={e => setForm({ ...form, owner_phone: e.target.value })}
                placeholder="+1 555 555 5555"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for the SMS reminder before the demo expires.
              </p>
            </div>
            <div>
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                value={form.website_url}
                onChange={e => setForm({ ...form, website_url: e.target.value })}
                placeholder="https://joespizza.com"
              />
            </div>
            <div>
              <Label htmlFor="google_review_url">Google Review Link</Label>
              <Input
                id="google_review_url"
                value={form.google_review_url}
                onChange={e => setForm({ ...form, google_review_url: e.target.value })}
                placeholder="https://search.google.com/local/writereview?placeid=..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="instagram_url">Instagram (optional)</Label>
                <Input
                  id="instagram_url"
                  value={form.instagram_url}
                  onChange={e => setForm({ ...form, instagram_url: e.target.value })}
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div>
                <Label htmlFor="yelp_review_url">Yelp (optional)</Label>
                <Input
                  id="yelp_review_url"
                  value={form.yelp_review_url}
                  onChange={e => setForm({ ...form, yelp_review_url: e.target.value })}
                  placeholder="https://yelp.com/biz/..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-24 h-24 object-cover rounded-lg border" />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-background text-sm hover:bg-accent">
                  <Upload className="h-4 w-4" />
                  {logoUrl ? 'Replace Logo' : 'Upload Logo'}
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gallery Images</CardTitle>
            <CardDescription>Up to 3 images. Grab them fast from social media.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {gallery.map((url, i) => (
                <div key={url} className="relative aspect-square">
                  <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover rounded-lg border" />
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
                <label className="cursor-pointer aspect-square rounded-lg border-2 border-dashed border-muted flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-accent/50 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Add photo</span>
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/rep/restaurants')} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="flex-1">
            {saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Demo Hub'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default RepDemoCreate;
