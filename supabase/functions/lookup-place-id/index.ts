import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.internationalPhoneNumber',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.photos',
].join(',');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY_SERVER');
    if (!googleApiKey) {
      console.error('[lookup-place-id] No Google API key configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Action: fetch a photo URL for a given photo resource name ---
    if (body?.action === 'photo') {
      const photoName = typeof body.photoName === 'string' ? body.photoName.trim() : '';
      if (!photoName) {
        return new Response(
          JSON.stringify({ error: 'photoName required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const maxWidth = Number(body.maxWidthPx) > 0 ? Number(body.maxWidthPx) : 1200;
      const url = `https://places.googleapis.com/v1/${encodeURI(photoName)}/media?maxWidthPx=${maxWidth}&skipHttpRedirect=true`;
      const photoResp = await fetch(url, {
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
      return new Response(
        JSON.stringify({ photoUri: photoData?.photoUri || null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Default: text search ---
    const address = typeof body?.address === 'string' ? body.address : '';
    if (!address || address.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Address must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[lookup-place-id] Searching for:', address);

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
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
      phone: p.internationalPhoneNumber || p.nationalPhoneNumber || null,
      website: p.websiteUri || null,
      googleMapsUri: p.googleMapsUri || null,
      photoName: Array.isArray(p.photos) && p.photos[0]?.name ? p.photos[0].name : null,
    }));

    console.log('[lookup-place-id] Found', results.length, 'results');

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[lookup-place-id] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
