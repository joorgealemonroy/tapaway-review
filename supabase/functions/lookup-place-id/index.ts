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
    
    if (!address || typeof address !== 'string') {
      console.error('[lookup-place-id] Invalid address provided');
      return new Response(
        JSON.stringify({ error: 'Address is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleApiKey = Deno.env.get('VITE_GOOGLE_MAPS_API_KEY');
    if (!googleApiKey) {
      console.error('[lookup-place-id] VITE_GOOGLE_MAPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[lookup-place-id] Looking up place ID for address:', address);

    // Use Google Places API (New)
    const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress'
      },
      body: JSON.stringify({
        textQuery: address
      })
    });

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      console.error('[lookup-place-id] No results found:', data);
      return new Response(
        JSON.stringify({ 
          error: 'Could not find location. Please verify the address.',
          details: 'No matching location found' 
        }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const place = data.places[0];
    console.log('[lookup-place-id] Found place:', place.displayName?.text, place.id);

    return new Response(
      JSON.stringify({ 
        placeId: place.id,
        name: place.displayName?.text || '',
        formattedAddress: place.formattedAddress || ''
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[lookup-place-id] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
