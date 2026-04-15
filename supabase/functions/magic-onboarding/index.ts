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
  instagramImages: string[];
  tiktokImages: string[];
}

// ── Step 1: Google Places ──
async function fetchGooglePlaceData(businessName: string, address: string, existingPlaceId?: string) {
  const googleKey = Deno.env.get('GOOGLE_PLACES_API_KEY_SERVER') || Deno.env.get('VITE_GOOGLE_MAPS_API_KEY');
  if (!googleKey) {
    console.log('[magic-onboarding] No Google API key, skipping Places lookup');
    return { placeId: existingPlaceId || null, websiteUrl: null, photoUrls: [] };
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

  if (!placeId) return { placeId: null, websiteUrl: null, photoUrls: [] };

  // Get place details
  let websiteUrl: string | null = null;
  const photoUrls: string[] = [];

  try {
    const detailRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': googleKey,
        'X-Goog-FieldMask': 'websiteUri,photos',
      },
    });
    const detail = await detailRes.json();
    websiteUrl = detail.websiteUri || null;

    // Get up to 2 photo URLs
    if (detail.photos?.length) {
      for (const photo of detail.photos.slice(0, 2)) {
        const photoName = photo.name;
        if (photoName) {
          photoUrls.push(
            `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=800&key=${googleKey}`
          );
        }
      }
    }
  } catch (e) {
    console.error('[magic-onboarding] Place details failed:', e);
  }

  return { placeId, websiteUrl, photoUrls };
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
    // Extract domain from URL
    const domain = new URL(websiteUrl).hostname.replace(/^www\./, '');
    
    const res = await fetch(`https://api.brandfetch.io/v2/brands/${domain}`, {
      headers: { 'Authorization': `Bearer ${brandfetchKey}` },
    });

    if (!res.ok) {
      console.log('[magic-onboarding] Brandfetch returned', res.status);
      return defaults;
    }

    const brand = await res.json();

    // Extract logo
    let logoUrl: string | null = null;
    if (brand.logos?.length) {
      // Prefer icon/symbol, then logo
      const icon = brand.logos.find((l: any) => l.type === 'icon' || l.type === 'symbol');
      const logo = brand.logos.find((l: any) => l.type === 'logo');
      const chosen = icon || logo || brand.logos[0];
      if (chosen?.formats?.length) {
        // Prefer PNG or SVG
        const png = chosen.formats.find((f: any) => f.format === 'png');
        const svg = chosen.formats.find((f: any) => f.format === 'svg');
        logoUrl = (png || svg || chosen.formats[0])?.src || null;
      }
    }

    // Extract colors
    let primaryColor = defaults.primaryColor;
    let secondaryColor = defaults.secondaryColor;
    if (brand.colors?.length) {
      const primary = brand.colors.find((c: any) => c.type === 'accent' || c.type === 'brand');
      const secondary = brand.colors.find((c: any) => c.type === 'dark' || c.type === 'light');
      if (primary?.hex) primaryColor = primary.hex;
      if (secondary?.hex) secondaryColor = secondary.hex;
      // Fallback: just use first two colors
      if (primaryColor === defaults.primaryColor && brand.colors[0]?.hex) primaryColor = brand.colors[0].hex;
      if (secondaryColor === defaults.secondaryColor && brand.colors[1]?.hex) secondaryColor = brand.colors[1].hex;
    }

    return { logoUrl, primaryColor, secondaryColor, websiteUrl };
  } catch (e) {
    console.error('[magic-onboarding] Brandfetch failed:', e);
    return defaults;
  }
}

// ── Step 3: Social Discovery (stubbed — requires Outscraper or similar) ──
async function discoverSocials(_businessName: string, _websiteUrl: string | null): Promise<SocialResult> {
  const outscraper = Deno.env.get('OUTSCRAPER_API_KEY');
  if (!outscraper) {
    console.log('[magic-onboarding] No Outscraper key, skipping social discovery');
    return { instagramUrl: null, tiktokUrl: null, instagramImages: [], tiktokImages: [] };
  }

  // TODO: Implement Outscraper API call when key is provided
  // For now, return empty — the function gracefully degrades
  console.log('[magic-onboarding] Social discovery not yet implemented');
  return { instagramUrl: null, tiktokUrl: null, instagramImages: [], tiktokImages: [] };
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

    // Ensure the userId matches the authenticated user
    if (userId && userId !== user.id) {
      return new Response(JSON.stringify({ error: 'User ID mismatch' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uid = user.id;

    console.log(`[magic-onboarding] Starting for "${businessName}" by ${uid}`);

    // ── Step 1: Google Places ──
    const googleData = await fetchGooglePlaceData(businessName, address, placeId);
    console.log('[magic-onboarding] Google:', { placeId: googleData.placeId, hasWebsite: !!googleData.websiteUrl, photos: googleData.photoUrls.length });

    // ── Step 2: Brandfetch ──
    const brandData = await fetchBrandData(googleData.websiteUrl);
    console.log('[magic-onboarding] Brand:', { hasLogo: !!brandData.logoUrl, primaryColor: brandData.primaryColor });

    // ── Step 3: Social Discovery ──
    const socialData = await discoverSocials(businessName, googleData.websiteUrl);

    // ── Step 4: Database Insertion ──
    // Check for existing profile
    const { data: existingProfile } = await supabase
      .from('personal_profiles')
      .select('id')
      .eq('user_id', uid)
      .eq('username', username)
      .maybeSingle();

    let profileId: string;

    if (existingProfile) {
      // Update existing profile with brand data
      profileId = existingProfile.id;
      await supabase.from('personal_profiles').update({
        full_name: businessName,
        background_color: brandData.primaryColor,
        header_color: brandData.secondaryColor,
        ...(brandData.logoUrl ? { profile_photo_url: brandData.logoUrl } : {}),
      }).eq('id', profileId);
    } else {
      // Create new profile
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

    // ── Create Links ──
    const linksToInsert: any[] = [];
    let sortOrder = 0;

    // Social tile links (Instagram)
    if (socialData.instagramUrl) {
      linksToInsert.push({
        profile_id: profileId,
        link_type: 'instagram',
        label: 'Instagram',
        url: socialData.instagramUrl,
        sort_order: sortOrder++,
        is_active: true,
        display_style: 'card',
        grid_size: 'half',
        thumbnail_bg_url: socialData.instagramImages[0] || googleData.photoUrls[0] || null,
      });
    }

    // Social tile links (TikTok)
    if (socialData.tiktokUrl) {
      linksToInsert.push({
        profile_id: profileId,
        link_type: 'tiktok',
        label: 'TikTok',
        url: socialData.tiktokUrl,
        sort_order: sortOrder++,
        is_active: true,
        display_style: 'card',
        grid_size: 'half',
        thumbnail_bg_url: socialData.tiktokImages[0] || googleData.photoUrls[1] || null,
      });
    }

    // If no social links but we have Google photos, create placeholder tile links
    if (!socialData.instagramUrl && !socialData.tiktokUrl && googleData.photoUrls.length >= 2) {
      linksToInsert.push({
        profile_id: profileId,
        link_type: 'custom',
        label: businessName,
        url: googleData.websiteUrl || '#',
        sort_order: sortOrder++,
        is_active: true,
        display_style: 'card',
        grid_size: 'half',
        thumbnail_bg_url: googleData.photoUrls[0],
      });
      linksToInsert.push({
        profile_id: profileId,
        link_type: 'custom',
        label: 'Our Space',
        url: googleData.websiteUrl || '#',
        sort_order: sortOrder++,
        is_active: true,
        display_style: 'card',
        grid_size: 'half',
        thumbnail_bg_url: googleData.photoUrls[1],
      });
    }

    // Google Review link (always present if we have a placeId)
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
      // Delete existing links first to avoid duplicates on re-run
      await supabase.from('personal_links').delete().eq('profile_id', profileId);
      
      const { error: linksError } = await supabase.from('personal_links').insert(linksToInsert);
      if (linksError) {
        console.error('[magic-onboarding] Links insert failed:', linksError);
      }
    }

    console.log(`[magic-onboarding] Complete! Profile: ${profileId}, Links: ${linksToInsert.length}`);

    return new Response(JSON.stringify({
      success: true,
      profileId,
      username,
      linksCreated: linksToInsert.length,
      brandFound: !!brandData.logoUrl,
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
