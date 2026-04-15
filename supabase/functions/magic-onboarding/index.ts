import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MagicOnboardingRequest {
  businessName: string;
  address: string;
  placeId?: string;
  userId: string;
  email: string;
  username: string;
}

interface BrandResult {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  websiteUrl: string | null;
}

interface SocialResult {
  instagramUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
}

// ── Helper: download image and upload to Supabase Storage ──
async function proxyImageToStorage(
  supabase: any,
  imageUrl: string,
  storagePath: string,
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { redirect: 'follow' });
    if (!res.ok) {
      console.log(`[magic-onboarding] Image fetch failed (${res.status}) for ${imageUrl.slice(0, 80)}`);
      return null;
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const blob = await res.blob();
    const arrayBuf = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuf);

    const { error: uploadErr } = await supabase.storage
      .from('personal-photos')
      .upload(storagePath, uint8, {
        contentType,
        upsert: true,
      });

    if (uploadErr) {
      console.error(`[magic-onboarding] Storage upload failed for ${storagePath}:`, uploadErr);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('personal-photos')
      .getPublicUrl(storagePath);

    return publicUrl;
  } catch (e) {
    console.error('[magic-onboarding] proxyImageToStorage error:', e);
    return null;
  }
}

// ── Step 1: Google Places ──
async function fetchGooglePlaceData(businessName: string, address: string, existingPlaceId?: string) {
  const googleKey = Deno.env.get('GOOGLE_PLACES_API_KEY_SERVER') || Deno.env.get('VITE_GOOGLE_MAPS_API_KEY');
  if (!googleKey) {
    console.log('[magic-onboarding] No Google API key, skipping Places lookup');
    return { placeId: existingPlaceId || null, websiteUrl: null, photoRefs: [], googleMapsUri: null };
  }

  let placeId = existingPlaceId || null;

  // Search for place if no ID provided
  if (!placeId) {
    try {
      const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleKey,
          'X-Goog-FieldMask': 'places.id',
        },
        body: JSON.stringify({ textQuery: `${businessName} ${address}`.trim(), maxResultCount: 1 }),
      });
      const searchData = await searchRes.json();
      if (searchData.places?.[0]?.id) {
        placeId = searchData.places[0].id;
      }
    } catch (e) {
      console.error('[magic-onboarding] Places search failed:', e);
    }
  }

  if (!placeId) return { placeId: null, websiteUrl: null, photoRefs: [], googleMapsUri: null };

  // Get place details — request photos, website, and Maps URI
  let websiteUrl: string | null = null;
  let googleMapsUri: string | null = null;
  const photoRefs: { name: string; url: string }[] = [];

  try {
    const detailRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': googleKey,
        'X-Goog-FieldMask': 'websiteUri,photos,googleMapsUri',
      },
    });
    const detail = await detailRes.json();
    websiteUrl = detail.websiteUri || null;
    googleMapsUri = detail.googleMapsUri || null;

    // Collect up to 3 photo references
    if (detail.photos?.length) {
      for (const photo of detail.photos.slice(0, 3)) {
        const photoName = photo.name;
        if (photoName) {
          photoRefs.push({
            name: photoName,
            url: `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=800&key=${googleKey}`,
          });
        }
      }
    }
  } catch (e) {
    console.error('[magic-onboarding] Place details failed:', e);
  }

  return { placeId, websiteUrl, photoRefs, googleMapsUri };
}

// ── Step 2: Brandfetch ──
async function fetchBrandData(websiteUrl: string | null): Promise<BrandResult> {
  const defaults: BrandResult = {
    logoUrl: null,
    primaryColor: '#0F172A',
    secondaryColor: '#1E293B',
    websiteUrl,
  };

  const brandfetchKey = Deno.env.get('BRANDFETCH_API_KEY');
  if (!brandfetchKey || !websiteUrl) {
    console.log('[magic-onboarding] No Brandfetch key or website, using defaults');
    return defaults;
  }

  try {
    const domain = new URL(websiteUrl).hostname.replace(/^www\./, '');
    const res = await fetch(`https://api.brandfetch.io/v2/brands/${domain}`, {
      headers: { 'Authorization': `Bearer ${brandfetchKey}` },
    });

    if (!res.ok) {
      console.log('[magic-onboarding] Brandfetch returned', res.status);
      return defaults;
    }

    const brand = await res.json();

    let logoUrl: string | null = null;
    if (brand.logos?.length) {
      const icon = brand.logos.find((l: any) => l.type === 'icon' || l.type === 'symbol');
      const logo = brand.logos.find((l: any) => l.type === 'logo');
      const chosen = icon || logo || brand.logos[0];
      if (chosen?.formats?.length) {
        const png = chosen.formats.find((f: any) => f.format === 'png');
        const svg = chosen.formats.find((f: any) => f.format === 'svg');
        logoUrl = (png || svg || chosen.formats[0])?.src || null;
      }
    }

    let primaryColor = defaults.primaryColor;
    let secondaryColor = defaults.secondaryColor;
    if (brand.colors?.length) {
      const primary = brand.colors.find((c: any) => c.type === 'accent' || c.type === 'brand');
      const secondary = brand.colors.find((c: any) => c.type === 'dark' || c.type === 'light');
      if (primary?.hex) primaryColor = primary.hex;
      if (secondary?.hex) secondaryColor = secondary.hex;
      if (primaryColor === defaults.primaryColor && brand.colors[0]?.hex) primaryColor = brand.colors[0].hex;
      if (secondaryColor === defaults.secondaryColor && brand.colors[1]?.hex) secondaryColor = brand.colors[1].hex;
    }

    return { logoUrl, primaryColor, secondaryColor, websiteUrl };
  } catch (e) {
    console.error('[magic-onboarding] Brandfetch failed:', e);
    return defaults;
  }
}

// ── Step 3: Social Discovery via Outscraper ──
async function discoverSocials(placeId: string | null): Promise<SocialResult> {
  const empty: SocialResult = { instagramUrl: null, tiktokUrl: null, facebookUrl: null };
  const apiKey = Deno.env.get('OUTSCRAPER_API_KEY');
  if (!apiKey || !placeId) {
    console.log('[magic-onboarding] No Outscraper key or placeId, skipping social discovery');
    return empty;
  }

  try {
    // Outscraper Google Maps enrichment — query by place_id
    const url = `https://api.app.outscraper.com/maps/search-v3?query=${encodeURIComponent(`place_id:${placeId}`)}&limit=1&async=false`;
    console.log('[magic-onboarding] Outscraper request:', url.slice(0, 120));

    const res = await fetch(url, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!res.ok) {
      console.log('[magic-onboarding] Outscraper returned', res.status);
      return empty;
    }

    const json = await res.json();
    console.log('[magic-onboarding] Outscraper raw keys:', JSON.stringify(Object.keys(json)));

    // Outscraper v3 returns { data: [[{...}]] }
    const results = json?.data?.[0] || [];
    const biz = results[0];
    if (!biz) {
      console.log('[magic-onboarding] No Outscraper results');
      return empty;
    }

    // Extract social URLs from known Outscraper fields
    const instagramUrl = biz.instagram || biz.instagram_link || null;
    const tiktokUrl = biz.tiktok || biz.tiktok_link || null;
    const facebookUrl = biz.facebook || biz.facebook_link || null;

    console.log('[magic-onboarding] Outscraper socials:', { instagramUrl, tiktokUrl, facebookUrl });
    return { instagramUrl, tiktokUrl, facebookUrl };
  } catch (e) {
    console.error('[magic-onboarding] Outscraper failed:', e);
    return empty;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!
    ).auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: MagicOnboardingRequest = await req.json();
    const { businessName, address, placeId, userId, email, username } = body;

    if (!businessName || !username) {
      return new Response(JSON.stringify({ error: 'businessName and username are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (userId && userId !== user.id) {
      return new Response(JSON.stringify({ error: 'User ID mismatch' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uid = user.id;
    console.log(`[magic-onboarding] Starting for "${businessName}" by ${uid}`);

    // ── Step 1: Google Places ──
    const googleData = await fetchGooglePlaceData(businessName, address, placeId);
    console.log('[magic-onboarding] Google:', {
      placeId: googleData.placeId,
      hasWebsite: !!googleData.websiteUrl,
      photos: googleData.photoRefs.length,
    });

    // ── Step 2: Brandfetch ──
    const brandData = await fetchBrandData(googleData.websiteUrl);
    console.log('[magic-onboarding] Brand:', { hasLogo: !!brandData.logoUrl, primaryColor: brandData.primaryColor });

    // ── Step 3: Social Discovery via Outscraper ──
    const socialData = await discoverSocials(googleData.placeId);

    // ── Step 4: Create / update profile ──
    const { data: existingProfile } = await supabase
      .from('personal_profiles')
      .select('id')
      .eq('user_id', uid)
      .eq('username', username)
      .maybeSingle();

    let profileId: string;

    if (existingProfile) {
      profileId = existingProfile.id;
      await supabase.from('personal_profiles').update({
        full_name: businessName,
        background_color: brandData.primaryColor,
        header_color: brandData.secondaryColor,
        ...(brandData.logoUrl ? { profile_photo_url: brandData.logoUrl } : {}),
      }).eq('id', profileId);
    } else {
      const { data: newProfile, error: profileError } = await supabase
        .from('personal_profiles')
        .insert({
          user_id: uid,
          username: username.toLowerCase(),
          full_name: businessName,
          email: email || user.email,
          background_color: brandData.primaryColor,
          header_color: brandData.secondaryColor,
          text_color: '#FFFFFF',
          profile_photo_url: brandData.logoUrl || null,
          subscription_status: 'active',
          button_theme: 'filled',
        })
        .select('id')
        .single();

      if (profileError) {
        console.error('[magic-onboarding] Profile creation failed:', profileError);
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      profileId = newProfile.id;
    }

    // ── Step 5: Download Google photos → Supabase Storage ──
    const uploadedPhotoUrls: string[] = [];
    for (let i = 0; i < googleData.photoRefs.length; i++) {
      const ref = googleData.photoRefs[i];
      const storagePath = `${profileId}/tile-${i}.jpg`;
      const publicUrl = await proxyImageToStorage(supabase, ref.url, storagePath);
      if (publicUrl) {
        uploadedPhotoUrls.push(publicUrl);
      }
    }
    console.log('[magic-onboarding] Uploaded photos:', uploadedPhotoUrls.length);

    // ── Step 5b: Fallback profile photo from Google if no Brandfetch logo ──
    if (!brandData.logoUrl && uploadedPhotoUrls.length > 0) {
      console.log('[magic-onboarding] Using Google photo as profile photo fallback');
      await supabase.from('personal_profiles').update({
        profile_photo_url: uploadedPhotoUrls[0],
      }).eq('id', profileId);
    }

    // ── Step 6: Create Links ──
    const linksToInsert: any[] = [];
    let sortOrder = 0;

    // Instagram tile
    if (socialData.instagramUrl) {
      linksToInsert.push({
        profile_id: profileId,
        link_type: 'instagram',
        label: 'Instagram',
        url: socialData.instagramUrl,
        sort_order: sortOrder++,
        is_active: true,
        display_style: 'grid',
        grid_size: 'half',
        thumbnail_bg_url: uploadedPhotoUrls[0] || null,
      });
    }

    // TikTok tile
    if (socialData.tiktokUrl) {
      linksToInsert.push({
        profile_id: profileId,
        link_type: 'tiktok',
        label: 'TikTok',
        url: socialData.tiktokUrl,
        sort_order: sortOrder++,
        is_active: true,
        display_style: 'grid',
        grid_size: 'half',
        thumbnail_bg_url: uploadedPhotoUrls[1] || uploadedPhotoUrls[0] || null,
      });
    }

    // Facebook pill (if found and no IG/TikTok to avoid clutter)
    if (socialData.facebookUrl && !socialData.instagramUrl && !socialData.tiktokUrl) {
      linksToInsert.push({
        profile_id: profileId,
        link_type: 'custom',
        label: 'Facebook',
        url: socialData.facebookUrl,
        sort_order: sortOrder++,
        is_active: true,
        display_style: 'pill',
        pill_color: '#1877F2',
      });
    }

    // If no social links but we have uploaded photos, create photo tile links
    if (!socialData.instagramUrl && !socialData.tiktokUrl && uploadedPhotoUrls.length >= 2) {
      linksToInsert.push({
        profile_id: profileId,
        link_type: 'custom',
        label: businessName,
        url: googleData.websiteUrl || '#',
        sort_order: sortOrder++,
        is_active: true,
        display_style: 'grid',
        grid_size: 'half',
        thumbnail_bg_url: uploadedPhotoUrls[0],
      });
      linksToInsert.push({
        profile_id: profileId,
        link_type: 'custom',
        label: 'Our Space',
        url: googleData.websiteUrl || '#',
        sort_order: sortOrder++,
        is_active: true,
        display_style: 'grid',
        grid_size: 'half',
        thumbnail_bg_url: uploadedPhotoUrls[1],
      });
    }

    // Google Review link
    if (googleData.placeId) {
      const reviewUrl = `https://search.google.com/local/writereview?placeid=${googleData.placeId}`;
      linksToInsert.push({
        profile_id: profileId,
        link_type: 'google_review',
        label: 'Leave us a Review',
        url: reviewUrl,
        sort_order: sortOrder++,
        is_active: true,
        display_style: 'pill',
        pill_color: '#FFFFFF',
      });
    }

    // Website link
    if (googleData.websiteUrl) {
      linksToInsert.push({
        profile_id: profileId,
        link_type: 'website',
        label: 'Visit Our Website',
        url: googleData.websiteUrl,
        sort_order: sortOrder++,
        is_active: true,
        display_style: 'pill',
        pill_color: brandData.secondaryColor,
      });
    }

    // Directions link
    if (address) {
      const directionsUrl = `https://maps.apple.com/?q=${encodeURIComponent(businessName)}&address=${encodeURIComponent(address)}`;
      linksToInsert.push({
        profile_id: profileId,
        link_type: 'directions',
        label: 'Get Directions',
        url: directionsUrl,
        sort_order: sortOrder++,
        is_active: true,
        display_style: 'pill',
        pill_color: brandData.secondaryColor,
      });
    }

    // Insert all links
    if (linksToInsert.length > 0) {
      await supabase.from('personal_links').delete().eq('profile_id', profileId);
      const { error: linksError } = await supabase.from('personal_links').insert(linksToInsert);
      if (linksError) {
        console.error('[magic-onboarding] Links insert failed:', linksError);
      }
    }

    console.log(`[magic-onboarding] Complete! Profile: ${profileId}, Links: ${linksToInsert.length}, Photos: ${uploadedPhotoUrls.length}`);

    return new Response(JSON.stringify({
      success: true,
      profileId,
      username,
      linksCreated: linksToInsert.length,
      photosUploaded: uploadedPhotoUrls.length,
      brandFound: !!brandData.logoUrl,
      socialsFound: !!(socialData.instagramUrl || socialData.tiktokUrl),
      placeId: googleData.placeId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[magic-onboarding] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
