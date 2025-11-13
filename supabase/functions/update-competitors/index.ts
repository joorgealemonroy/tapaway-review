import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { restaurantId } = await req.json();
    
    // Validate input
    if (!restaurantId || !validateUUID(restaurantId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid restaurantId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify restaurant ownership
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from('restaurants')
      .select('restaurant_name, address, owner_id')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      console.error('Restaurant verification error:', restaurantError);
      return new Response(
        JSON.stringify({ error: 'Restaurant not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user || restaurant.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to restaurant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is the test account
    const isTestAccount = user.email === 'test@me.com';

    if (isTestAccount) {
      // Create mock competitors for test account
      const mockCompetitors = [
        { name: 'Bella Vista Restaurant', reviews: 847, rating: 4.6 },
        { name: 'The Rustic Table', reviews: 612, rating: 4.4 },
        { name: 'Savory Bites Cafe', reviews: 423, rating: 4.3 }
      ];

      // Delete existing competitors
      await supabaseClient
        .from('competitors')
        .delete()
        .eq('restaurant_id', restaurantId);

      // Insert mock competitors
      for (const comp of mockCompetitors) {
        await supabaseClient
          .from('competitors')
          .insert({
            restaurant_id: restaurantId,
            competitor_name: comp.name,
            competitor_link: `https://www.google.com/maps/search/${encodeURIComponent(comp.name)}`,
            current_review_count: comp.reviews,
            rating: comp.rating,
            last_checked_at: new Date().toISOString()
          });
      }
    } else {
      // For real accounts, use AI to identify competitors
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      const prompt = `Given a restaurant named "${restaurant.restaurant_name}" at "${restaurant.address}", 
      identify 3-5 nearby competitor restaurants that would be direct competitors. 
      For each competitor, provide:
      - Name
      - Estimated review count (realistic number)
      - Estimated rating (4.0-4.8 range)
      
      Format as JSON array: [{"name": "...", "reviews": 123, "rating": 4.5}]`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a restaurant industry analyst. Respond only with valid JSON.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      const aiData = await aiResponse.json();
      const competitorsText = aiData.choices[0].message.content;
      const competitors = JSON.parse(competitorsText.replace(/```json|```/g, '').trim());

      // Delete existing competitors
      await supabaseClient
        .from('competitors')
        .delete()
        .eq('restaurant_id', restaurantId);

      // Insert new competitors
      for (const comp of competitors) {
        await supabaseClient
          .from('competitors')
          .insert({
            restaurant_id: restaurantId,
            competitor_name: comp.name,
            competitor_link: `https://www.google.com/maps/search/${encodeURIComponent(comp.name)}`,
            current_review_count: comp.reviews,
            rating: comp.rating,
            last_checked_at: new Date().toISOString()
          });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});