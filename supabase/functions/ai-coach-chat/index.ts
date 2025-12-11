import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize error messages for client response
function sanitizeError(error: unknown): string {
  console.error('[ai-coach-chat] Detailed error:', error);
  
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('not found')) return 'Resource not found';
    if (msg.includes('unauthorized') || msg.includes('permission')) return 'Access denied';
    if (msg.includes('rate limit')) return 'Rate limit exceeded, please try again later';
  }
  return 'An error occurred. Please try again.';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // CRITICAL: Require authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { restaurantId, message, chatHistory, stats } = await req.json();

    if (!restaurantId) {
      return new Response(
        JSON.stringify({ error: 'restaurantId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user authentication
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify restaurant ownership or admin access
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from('restaurants')
      .select('owner_id')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return new Response(
        JSON.stringify({ error: 'Restaurant not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin or owner
    const { data: isAdminData } = await supabaseClient.rpc('is_admin');
    const isAdmin = isAdminData || user.email === 'tap@tapaway.co';

    if (!isAdmin && restaurant.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to restaurant data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!stats) {
      throw new Error("Stats are required");
    }

    // Build wins and opportunities context
    let winsText = "";
    if (stats.wins && stats.wins.length > 0) {
      const winsList = stats.wins.map((w: string) => `${w}`).join('\n');
      winsText = `\n\nWHAT GUESTS LOVE:\n${winsList}`;
    }

    let opportunitiesText = "";
    if (stats.opportunities && stats.opportunities.length > 0) {
      const oppsList = stats.opportunities.map((o: { title: string; summary: string }) => `• ${o.title} — ${o.summary}`).join('\n');
      opportunitiesText = `\n\nTOP OPPORTUNITIES:\n${oppsList}`;
    }

    const systemPrompt = `You are the TapAway AI Coach. Help restaurant owners with ULTRA SHORT, mobile-friendly answers.

CRITICAL RULES:
1. MAX 2 sentences OR 220 characters total. If you need more, add 1-3 bullets (each under 60 chars).
2. If there are 1★ or 2★ reviews in the data, mention the main issue FIRST, then briefly praise what works.
3. If all reviews are 4★/5★, focus on wins and keeping standards high.
4. Only discuss: taps, Google reviews, reply rate, timing, menu feedback, service — things TapAway affects.
5. ZERO DOOM. Frame issues as "easy wins" or "next moves," never failures.
6. Use emojis sparingly 🌮😊.

CURRENT STATS (from selected review window):
- Total taps: ${stats.totalTaps}
- Sentiment: ${stats.sentiment?.percentagePositive !== null ? `${stats.sentiment.percentagePositive}%` : 'N/A'} happy (${stats.sentiment?.positiveCount || 0} good, ${stats.sentiment?.negativeCount || 0} need attention)${winsText}${opportunitiesText}

EXAMPLE SHORT ANSWERS:
Q: "What should I fix first?"
A: "Service speed is the top concern from recent reviews. Tighten that up and you'll boost ratings fast.
• Add a server during dinner rush
• Prep top 3 dishes earlier"

Q: "What are my biggest wins?"
A: "Guests love your tacos and friendly staff. Keep doing what you're doing and stack more reviews! 💚"
`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 180,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? 
      "Here's what I'm seeing: TapAway is driving solid engagement. Keep collecting taps and I'll keep surfacing your wins 🚀";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Coach chat error:", error);
    return new Response(
      JSON.stringify({
        error: sanitizeError(error),
        reply: "No pasa nada, algo falló al responder. Pero tus datos siguen seguros y TapAway sigue contando tus taps. Intenta otra pregunta en un momento 😊"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
