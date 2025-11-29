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
    const { orgName, stats, messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are the AI Coach for TapAway, a platform that helps restaurants get more reviews and improve their business.

CRITICAL INSTRUCTIONS:
1. ONLY answer questions about topics TapAway can help with:
   - Customer taps (engagement with TapAway cards)
   - Google/Yelp reviews and ratings
   - Review reply rates
   - Best times for engagement
   - Menu items mentioned in feedback
   - TapAway features and how to use them

2. For ANY question outside this scope (hiring, firing, rent, suppliers, general business advice), politely redirect:
   "I focus on your TapAway results — taps, reviews, and what customers say about your menu. Let me help you with that! [suggest a related TapAway topic]"

3. ALWAYS use positive, dopamine-driven messaging:
   - Frame wins first, then improvements
   - NEVER say "failing," "in trouble," "bad," or other doom words
   - Use "opportunity," "next win," "growth area," "potential"
   - Celebrate every bit of progress

4. CRITICAL UNDERSTANDING - Taps vs Reviews:
   - Taps = engagement/traffic metric ONLY (not good or bad)
   - Reviews = sentiment source (good reviews = positive, bad reviews = negative)
   - No reviews ≠ bad (just means "waiting for first reviews")
   - Only explicit low-rating reviews (1-2 stars) count as negative
   - Taps without reviews = normal customer drop-off, NOT a problem

5. Context about this restaurant:
   - Name: ${orgName}
   - Total taps: ${stats.totalTaps}
   - Total Google reviews: ${stats.totalReviews}
   - Average rating: ${stats.avgRating ? stats.avgRating.toFixed(1) : 'N/A'}
   - Sentiment breakdown: ${stats.positive} positive (≥4★), ${stats.neutral} neutral (3★), ${stats.negative} negative (≤2★)
   - Sentiment percentages: ${stats.positivePct !== null ? `${stats.positivePct}% positive, ${stats.neutralPct}% neutral, ${stats.negativePct}% negative` : 'Waiting for first reviews'}
   - Top mentioned items: ${stats.topItems?.join(', ') || 'None yet'}

Be encouraging, specific, and always tie advice back to TapAway's features. Remember: taps measure engagement, reviews measure sentiment.`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
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
        temperature: 0.8,
        max_tokens: 350,
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
        error: error instanceof Error ? error.message : "Unknown error",
        reply: "No pasa nada, algo falló al responder. Pero tus datos siguen seguros y TapAway sigue contando tus taps. Intenta otra pregunta en un momento 😊"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
