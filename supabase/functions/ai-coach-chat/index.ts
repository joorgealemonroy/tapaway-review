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
    const { restaurantId, message, chatHistory, stats } = await req.json();
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
      const oppsList = stats.opportunities.map((o: any) => `• ${o.title} — ${o.summary}`).join('\n');
      opportunitiesText = `\n\nTOP OPPORTUNITIES:\n${oppsList}`;
    }

    const systemPrompt = `You are the TapAway AI Coach. You help restaurant owners understand their Google reviews, taps, and what moves TapAway can help them with.

CRITICAL RULES:
1. Only talk about things TapAway can actually affect: taps, Google reviews, reply rate/quality, timing, what customers say in reviews (menu, service, etc.).
2. If asked about something unrelated (pricing, marketing, staff wages, etc.), gently redirect: "I focus on reviews and taps — but here's a TapAway angle..."
3. ZERO DOOM. Always be encouraging. Frame feedback as "easy wins" and "next moves," never as failures or crises.
4. Be concise and mobile-friendly. Use short bullet points (1-2 lines each) for action items.
5. Use emojis sparingly but naturally 🌮😊.

KEY STATS:
- Total taps: ${stats.totalTaps}
- Positive sentiment: ${stats.sentiment?.percentagePositive !== null ? `${stats.sentiment.percentagePositive}%` : 'N/A'} (${stats.sentiment?.positiveCount || 0} happy, ${stats.sentiment?.negativeCount || 0} needs attention)${winsText}${opportunitiesText}

When answering:
- Start with 1-2 wins from the "What guests love" section.
- Then highlight the top 1-2 opportunities to improve.
- Use bullet points for action items (max 2 lines each).
- Connect advice back to TapAway features (more taps, better replies, tracking, etc.).
- Keep answers short and scannable on mobile.

Examples:
Q: "What should I fix first?"
A: "You're crushing it on friendly staff and shrimp tacos — guests love those 🌮

Top moves:
• **Service speed** — a few guests mention slow service on busy nights. Focus here first.
• Keep collecting taps to see if changes work.

Use TapAway replies to calm any unhappy guests fast 🚀"

Q: "What are my biggest wins?"
A: "Here's what's working:
• **Shrimp tacos** — guests mention these constantly (8+ reviews)
• **Friendly staff** — people love your team's vibe
• **Clean space** — guests notice and appreciate this

Keep doing what you're doing and stack more reviews! 💚"
`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.map((m: any) => ({
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
        temperature: 0.8,
        max_tokens: 400,
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
