import { safeFetch, publicUrl } from "../_shared/safeFetch.ts";
import { readLimitedText } from "../_shared/requestBody.ts";
import { takeQuota } from "../_shared/storefrontRateLimit.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";
import { requireUser, isAdmin } from "../_shared/security.ts";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
  'places.internationalPhoneNumber',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.photos',
  'places.location',
].join(',');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  // Google Places calls cost money. Authenticated callers get 20/min per IP;
  // unauthenticated callers are allowed at a strict 8/min per IP because the
  // address autocomplete is funnel-critical (used in unauthenticated
  // onboarding: Onboarding.tsx / OnboardingNew.tsx via
  // GooglePlacesAutocomplete). The tight public throttle bounds abuse cost
  // without breaking signup.
  const caller = await requireUser(req);
  const perMinuteLimit = caller ? 20 : 8;
  if (!checkRateLimit(getRateLimitKey(req, "lookup-place-id"), perMinuteLimit, 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    if (await takeQuota(req, "places-network", caller ? 100 : 30) < 0 ||
        await takeQuota(req, "places-global", 2000, "all") < 0) return rateLimitResponse(corsHeaders);
    const body = JSON.parse(await readLimitedText(req, 4096));
    if (body?.action === 'photo_hosted') {
      if (!caller) return new Response(JSON.stringify({ error: "Sign in to import a photo." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: rep } = await caller.userClient.from("sales_reps").select("is_active").eq("id", caller.user.id).maybeSingle();
      if (!(await isAdmin(caller.user.id)) && rep?.is_active !== true)
        return new Response(JSON.stringify({ error: "Photo import is available to the TapAway team." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (await takeQuota(req, "places-photo-import", 30, caller.user.id) < 0) return rateLimitResponse(corsHeaders);
    }
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY_SERVER');
    if (!googleApiKey) {
      console.error('[lookup-place-id] No Google API key configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Action: fetch a photo URL for a given photo resource name ---
    if (body?.action === 'photo' || body?.action === 'photo_hosted') {
      const photoName = typeof body.photoName === 'string' ? body.photoName.trim() : '';
      if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(photoName) || photoName.length > 1024) {
        return new Response(
          JSON.stringify({ error: 'photoName required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const requestedWidth = Number(body.maxWidthPx);
      const maxWidth = Number.isFinite(requestedWidth) ? Math.min(1600, Math.max(100, Math.floor(requestedWidth))) : 1200;
      const url = `https://places.googleapis.com/v1/${encodeURI(photoName)}/media?maxWidthPx=${maxWidth}&skipHttpRedirect=true`;
      const photoResp = await fetch(url, {
        signal: AbortSignal.timeout(8000), redirect: 'error',
        headers: { 'X-Goog-Api-Key': googleApiKey },
      });
      const photoData = await photoResp.json().catch(() => ({}));
      if (!photoResp.ok) {
        console.error('[lookup-place-id] photo error:', photoData);
        return new Response(
          JSON.stringify({ error: photoData?.error?.message || 'photo error', photoUri: null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Default: return Google's short-lived photo URI as-is.
      if (body.action === 'photo') {
        return new Response(
          JSON.stringify({ photoUri: photoData?.photoUri ? publicUrl(photoData.photoUri, { allowHosts: ['googleusercontent.com', 'google.com', 'googleapis.com'] }).href : null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // photo_hosted: download the bytes server-side (no browser CORS)
      // and re-host in personal-photos so the client can canvas-sample it.
      const googlePhotoUri: string | null = photoData?.photoUri || null;
      if (!googlePhotoUri) {
        return new Response(
          JSON.stringify({ photoUri: null, publicUrl: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        // SSRF guard: only accept https URLs that resolve to Google's photo CDN.
        const { isSafeExternalUrl } = await import("../_shared/security.ts");
        if (!isSafeExternalUrl(googlePhotoUri, { allowHosts: ["googleusercontent.com", "google.com", "googleapis.com"] })) {
          throw new Error("photo url not allowed");
        }
        const imgResp = await safeFetch(googlePhotoUri, { allowHosts: ['googleusercontent.com', 'google.com', 'googleapis.com'], maxBytes: 4000000, timeoutMs: 10000 });
        if (!imgResp.ok) throw new Error(`photo download ${imgResp.status}`);
        const contentType = (imgResp.headers.get('content-type') || '').split(';')[0];
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) throw new Error('Unsupported photo type');
        const ext = contentType.includes('png') ? 'png'
          : contentType.includes('webp') ? 'webp'
          : 'jpg';
        const bytes = new Uint8Array(await imgResp.arrayBuffer());

        // Never accept a caller-selected path for a service-role storage write.
        const objectPath = `place-imports/${caller!.user.id}/${crypto.randomUUID()}.${ext}`;

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!supabaseUrl || !serviceKey) throw new Error('supabase env missing');

        const uploadResp = await fetch(
          `${supabaseUrl}/storage/v1/object/personal-photos/${objectPath}`,
          {
            method: 'POST',
            signal: AbortSignal.timeout(10000), redirect: 'error',
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
              'Content-Type': contentType,
              'x-upsert': 'false',
              'cache-control': '3600',
            },
            body: bytes,
          }
        );
        if (!uploadResp.ok) {
          const errText = await uploadResp.text().catch(() => '');
          throw new Error(`storage upload ${uploadResp.status}: ${errText}`);
        }

        const publicUrl = `${supabaseUrl}/storage/v1/object/public/personal-photos/${objectPath}`;
        return new Response(
          JSON.stringify({ photoUri: googlePhotoUri, publicUrl, path: objectPath }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (rehostErr) {
        console.error('[lookup-place-id] rehost error:', rehostErr);
        return new Response(
          JSON.stringify({ photoUri: googlePhotoUri, publicUrl: null, error: 'rehost_failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // --- Default: text search ---
    const address = typeof body?.address === 'string' ? body.address : '';
    if (!address || address.trim().length < 2 || address.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Address must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[lookup-place-id] Searching for:', address);

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      signal: AbortSignal.timeout(8000), redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: address.trim(),
        maxResultCount: 5,
      }),
    });

    const data = await response.json();
    console.log('[lookup-place-id] Response status:', response.status);

    if (!response.ok) {
      const errMsg = data?.error?.message || 'Google API error';
      console.error('[lookup-place-id] API error:', errMsg);
      return new Response(
        JSON.stringify({ error: errMsg, results: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const places = data.places || [];
    const results = places.map((p: any) => ({
      placeId: p.id,
      name: p.displayName?.text || '',
      formattedAddress: p.formattedAddress || '',
      city: p.addressComponents?.find((c: { types: string[] }) => c.types.includes('locality') || c.types.includes('postal_town'))?.longText || '',
      state: p.addressComponents?.find((c: { types: string[] }) => c.types.includes('administrative_area_level_1'))?.shortText || '',
      postalCode: p.addressComponents?.find((c: { types: string[] }) => c.types.includes('postal_code'))?.longText || '',
      phone: p.internationalPhoneNumber || p.nationalPhoneNumber || null,
      website: p.websiteUri || null,
      googleMapsUri: p.googleMapsUri || null,
      photoName: Array.isArray(p.photos) && p.photos[0]?.name ? p.photos[0].name : null,
      lat: typeof p.location?.latitude === 'number' ? p.location.latitude : null,
      lng: typeof p.location?.longitude === 'number' ? p.location.longitude : null,
    }));

    console.log('[lookup-place-id] Found', results.length, 'results');

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[lookup-place-id] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Place search is temporarily unavailable. You can enter the business details manually.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
