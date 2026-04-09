import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    
    if (!address || typeof address !== 'string' || address.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Address must be at least 2 characters' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY_SERVER') || Deno.env.get('VITE_GOOGLE_MAPS_API_KEY');
    if (!googleApiKey) {
      console.error('[lookup-place-id] No Google API key configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[lookup-place-id] Searching for:', address);

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress'
      },
      body: JSON.stringify({ textQuery: address, maxResultCount: 5 })
    });

    const data = await response.json();
    console.log('[lookup-place-id] API response status:', response.status, 'body:', JSON.stringify(data).slice(0, 500));

    if (!data.places || data.places.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = data.places.map((p: any) => ({
      placeId: p.id,
      name: p.displayName?.text || '',
      formattedAddress: p.formattedAddress || ''
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
