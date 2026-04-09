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

    // Use legacy Text Search API (doesn't require billing on all projects)
    const encoded = encodeURIComponent(address.trim());
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encoded}&key=${googleApiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('[lookup-place-id] API status:', data.status, 'count:', data.results?.length ?? 0);

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      if (data.status === 'REQUEST_DENIED') {
        console.error('[lookup-place-id] API denied:', data.error_message);
        return new Response(
          JSON.stringify({ error: 'Google API request denied', results: [] }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ results: [] }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = data.results.slice(0, 5).map((p: any) => ({
      placeId: p.place_id,
      name: p.name || '',
      formattedAddress: p.formatted_address || ''
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
