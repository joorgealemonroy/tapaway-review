import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAuth } from '@/hooks/useAuth';
import { useSalesRep } from '@/hooks/useSalesRep';
import { supabase } from '@/integrations/supabase/client';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { sampleBottomEdgeColor } from '@/lib/sampleBannerColor';
import { buildGoogleReviewUrl } from '@/lib/google';

const DEMO_CAP = 50;
const TRIAL_DAYS = 7;

type PickedPlace = {
  placeId: string;
  name: string;
  address: string;
  phone?: string | null;
  website?: string | null;
  googleMapsUri?: string | null;
  photoName?: string | null;
};

const slugify = (input: string): string => {
  return (input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
};

const randomFallback = () => `demo-${Math.random().toString(36).slice(2, 8)}`;

const resolveUniqueUsername = async (base: string): Promise<string> => {
  const seed = slugify(base) || randomFallback();
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? seed : `${seed}-${i + 1}`;
    const { data: available } = await supabase.rpc('is_username_available', {
      check_username: candidate,
    });
    if (available === true) return candidate;
  }
  return randomFallback();
};

const fetchHostedPlacePhoto = async (
  photoName: string,
  slug: string,
): Promise<{ publicUrl: string | null; photoUri: string | null }> => {
  try {
    const { data, error } = await supabase.functions.invoke('lookup-place-id', {
      body: { action: 'photo_hosted', photoName, maxWidthPx: 1200, slug },
    });
    if (error) return { publicUrl: null, photoUri: null };
    return {
      publicUrl: (data as any)?.publicUrl ?? null,
      photoUri: (data as any)?.photoUri ?? null,
    };
  } catch {
    return { publicUrl: null, photoUri: null };
  }
};

const RepDemoCreate = () => {
  const navigate = useRepNavigate();
  const [searchParams] = useSearchParams();
  const { id: editId } = useParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState('');
  const submittedRef = useRef(false);

  // Legacy /rep/demo/:id → jump straight into the real dashboard for that profile.
  useEffect(() => {
    if (editId) navigate(`/dashboard?profile_id=${editId}`);
  }, [editId, navigate]);

  // Redirect guards
  useEffect(() => {
    if (editId) return;
    if (authLoading || repLoading || adminLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!isSalesRep) {
      navigate(isAdmin ? '/admin/reps' : '/');
    }
  }, [authLoading, repLoading, adminLoading, user, isSalesRep, isAdmin, editId, navigate]);

  const handlePlaceSelected = async (place: PickedPlace) => {
    if (submittedRef.current) return;
    if (!user || !salesRep) return;
    submittedRef.current = true;
    setCreating(true);

    try {
      // 1. Daily cap
      setStatus('Checking your daily quota…');
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
        navigate('/rep/restaurants');
        return;
      }

      // 2. Unique username slug (so re-hosted photo path uses the final slug)
      const username = await resolveUniqueUsername(place.name);

      // 3. Resolve photo — re-host on our storage so we can canvas-sample it
      setStatus('Grabbing business details…');
      let profilePhotoUrl: string | null = null;
      let sampledBg: string | null = null;
      if (place.photoName) {
        const { publicUrl, photoUri } = await fetchHostedPlacePhoto(place.photoName, username);
        profilePhotoUrl = publicUrl ?? photoUri; // fallback to raw Google URL
        if (publicUrl) {
          try {
            sampledBg = await sampleBottomEdgeColor(publicUrl);
          } catch {
            sampledBg = null;
          }
        }
      }

      // 4. Insert profile
      setStatus('Spinning up your demo hub…');
      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data: inserted, error } = await supabase
        .from('personal_profiles')
        .insert({
          user_id: user.id,
          username,
          full_name: place.name,
          email: `${username}@demo.tapaway.local`,
          business_phone: place.phone ?? null,
          profile_photo_url: profilePhotoUrl,
          plan_type: 'solo_pro',
          subscription_status: 'trialing',
          trial_ends_at: trialEndsAt,
          sales_rep_id: salesRep.id,
          created_by_rep_id: salesRep.id,
          is_approved: false,
          pipeline_status: 'draft',
          header_type: 'banner',
          header_color: '#0a0e1a',
          background_color: sampledBg ?? '#ffffff',
          show_username: true,
        } as any)
        .select('id')
        .single();

      if (error) throw error;
      const profileId = inserted!.id;

      // 5. Seed Website + Google Review as full-width list rows (pills). Socials
      // added later can be half-width image tiles; keeping these as pills matches
      // the target layout and reorders cleanly.
      const seedLinks: Array<Record<string, unknown>> = [];

      if (place.website) {
        let host = '';
        try { host = new URL(place.website).hostname.replace(/^www\./, ''); } catch { /* noop */ }
        const favicon = host
          ? `https://www.google.com/s2/favicons?domain=${host}&sz=256`
          : null;
        seedLinks.push({
          profile_id: profileId,
          label: 'Visit Our Website',
          url: place.website,
          link_type: 'custom',
          sort_order: 100,
          is_active: true,
          display_style: 'pill',
          grid_size: null,
          cover_image_url: null,
          thumbnail_url: favicon,
        });
      }
      const reviewUrl = buildGoogleReviewUrl(place.placeId) || place.googleMapsUri;
      if (reviewUrl) {
        seedLinks.push({
          profile_id: profileId,
          label: 'Leave us a Review',
          url: reviewUrl,
          link_type: 'google_review',
          sort_order: 100 + seedLinks.length,
          is_active: true,
          display_style: 'pill',
          grid_size: null,
          cover_image_url: null,
        });
      }
      if (seedLinks.length > 0) {
        const { error: linkError } = await supabase.from('personal_links').insert(seedLinks as any);
        if (linkError) console.warn('[RepDemoCreate] seed links failed:', linkError);
      }


      toast.success('Demo created — customize away 🎉');

      const adminViewRep = searchParams.get('admin_view_rep');
      const qs = adminViewRep
        ? `profile_id=${profileId}&admin_view_rep=${adminViewRep}`
        : `profile_id=${profileId}`;
      navigate(`/dashboard?${qs}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to create demo');
      submittedRef.current = false;
      setCreating(false);
      setStatus('');
    }
  };

  if (authLoading || repLoading || adminLoading || !isSalesRep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] px-4 py-16 flex items-start justify-center">
      <div className="w-full max-w-xl">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <div className="flex items-center gap-2 text-emerald-400 text-xs uppercase tracking-widest mb-4">
            <Sparkles className="h-4 w-4" />
            <span>1-Click Demo</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Create a new demo hub</h1>
          <p className="text-sm text-white/60 mb-6">
            Search for the business on Google. We'll auto-fill their name, phone, photo, website,
            and review link — then drop you into the dashboard to customize the rest.
          </p>

          {creating ? (
            <div className="flex flex-col items-center gap-3 py-10 text-white/70">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              <div className="text-sm">{status || 'Working…'}</div>
            </div>
          ) : (
            <>
              <GooglePlacesAutocomplete
                onPlaceSelected={handlePlaceSelected}
                label="Find the business on Google"
                placeholder="Business name, city…"
              />
              <p className="mt-4 text-xs text-white/40">
                Up to {DEMO_CAP} demos per day. Missing details are fine — you can fill them in
                from the dashboard.
              </p>
              <ReviewComplianceNotice tone="light" className="mt-4" />

            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepDemoCreate;
