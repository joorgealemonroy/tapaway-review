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
    const { restaurantId, reviewText, reviewerName, rating } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const prompt = `Generate a professional, warm, and personalized response to this customer review.

Reviewer: ${reviewerName || 'Guest'}
Rating: ${rating} stars
Review: "${reviewText}"

Requirements:
- Keep it 2-5 sentences
- Be genuine and specific to their feedback
- If rating is 4-5 stars: thank them warmly and encourage them to return
- If rating is 1-3 stars: apologize sincerely, acknowledge their concerns, offer to make it right
- Use a friendly but professional tone
- Include the reviewer's name if provided
- Don't be generic or robotic

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