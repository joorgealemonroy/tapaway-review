import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whitelist of valid event types
const VALID_EVENT_TYPES = [
  'tap',
  'google_click',
  'yelp_click',
  'directions_click',
  'instagram_click',
  'menu_view',
  'menu_close'
];

// Simple in-memory rate limiting (resets on function restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (key: string, limit: number = 50, windowMs: number = 3600000): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.restaurant_id || typeof body.restaurant_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'restaurant_id is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.event_type || typeof body.event_type !== 'string') {
      return new Response(
        JSON.stringify({ error: 'event_type is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate event_type against whitelist
    if (!VALID_EVENT_TYPES.includes(body.event_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid event_type', validTypes: VALID_EVENT_TYPES }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP for rate limiting (fallback to a default if not available)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // Rate limit: 50 events per hour per IP + restaurant combination
    const rateLimitKey = `${clientIp}:${body.restaurant_id}`;
    if (!checkRateLimit(rateLimitKey, 50, 3600000)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key to bypass RLS for restaurant verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify restaurant exists
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from('restaurants')
      .select('id')
      .eq('id', body.restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return new Response(
        JSON.stringify({ error: 'Invalid restaurant_id' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert analytics event
    const { error: insertError } = await supabaseClient
      .from('analytics_events')
      .insert({
        restaurant_id: body.restaurant_id,
        location_id: body.location_id || null,
        event_type: body.event_type,
        event_data: body.event_data || {}
      });

    if (insertError) {
      console.error('Error inserting analytics event:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to track event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in track-event function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
