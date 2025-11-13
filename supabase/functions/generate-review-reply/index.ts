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

const sanitizeText = (text: string): string => {
  return text.trim().substring(0, 5000);
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

    const body = await req.json();
    
    // Validate inputs
    if (!body.restaurantId || !validateUUID(body.restaurantId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid restaurantId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.reviewText || typeof body.reviewText !== 'string') {
      return new Response(
        JSON.stringify({ error: 'reviewText is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5 || !Number.isInteger(body.rating)) {
      return new Response(
        JSON.stringify({ error: 'rating must be an integer between 1 and 5' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const restaurantId = body.restaurantId;
    const reviewText = sanitizeText(body.reviewText);
    const reviewerName = body.reviewerName ? sanitizeText(body.reviewerName) : undefined;
    const rating = body.rating;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify restaurant ownership
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from('restaurants')
      .select('owner_id')
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
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const prompt = `Generate a professional response to this customer review.

Reviewer: ${reviewerName || 'Guest'}
Rating: ${rating} stars
Review: "${reviewText}"

Requirements:
- Keep it SHORT: 2-4 sentences maximum
- Be professional, warm, and appreciative
- Always thank them for visiting
- Mention something specific from their review if possible
- Invite them back naturally
- NO exaggerated language, NO emojis, NO all-caps, NO "OMG" or similar expressions
- Tone should be genuine but measured - not over-the-top
- If rating is 4-5 stars: express sincere appreciation
- If rating is 1-3 stars: apologize professionally, acknowledge concerns, offer to discuss further

Generate ONLY the reply text, no extra formatting or labels.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a restaurant manager crafting thoughtful responses to customer reviews.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const reply = aiData.choices[0].message.content.trim();

    return new Response(
      JSON.stringify({ reply }),
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