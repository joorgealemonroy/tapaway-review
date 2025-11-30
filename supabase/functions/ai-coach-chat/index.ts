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

    // Build themes context
    let posThemesText = "";
    if (stats.positiveThemes && stats.positiveThemes.length > 0) {
      const themes = stats.positiveThemes.map((t: any) => `${t.theme} (${t.count} mentions)`).join(', ');
      posThemesText = `\n- What guests LOVE most: ${themes}`;
    }

    let negThemesText = "";
    if (stats.negativeThemes && stats.negativeThemes.length > 0) {
      const themes = stats.negativeThemes.map((t: any) => `${t.theme} (${t.count} mentions)`).join(', ');
      negThemesText = `\n- Top opportunity themes from unhappy reviews: ${themes}`;
    }

    const systemPrompt = `You are an AI coach helping a restaurant called "${orgName}" improve their TapAway experience.
The restaurant owner can see stats about customer taps (hub visits) and reviews.

TapAway is a smart NFC card system that makes it easy for customers to leave reviews by tapping a card at their table.

CRITICAL BUSINESS RULES YOU MUST FOLLOW:

1. TAPS vs REVIEWS (most important rule):
   - Taps = customer visits to the review hub = ENGAGEMENT/TRAFFIC only
   - Taps are NEVER considered "good" or "bad" — they are purely a volume metric
   - Reviews (from Google) = the ONLY source of sentiment
   - Sentiment is computed ONLY from reviews:
     * Positive = rating >= 4 stars
     * Neutral = rating = 3 stars
     * Negative = rating <= 2 stars

2. NO REVIEWS ≠ NEGATIVE:
   - If totalReviews = 0, this is NOT bad or negative
   - It simply means "waiting for reviews"
   - Frame this positively: "You're collecting taps, and as soon as reviews start flowing in, we'll see even more."
   - NEVER imply negativity from a lack of reviews

3. NEGATIVE ONLY WHEN REAL BAD REVIEWS EXIST:
   - Only explicit 1-2 star reviews count as "negative" or "unhappy experiences"
   - Taps with no review = natural drop-off, NOT a problem
   - Frame negative reviews as opportunities, not doom

4. ALWAYS START WITH WINS:
   - Begin every response by mentioning 1-3 things guests LOVE from positiveThemes
   - Examples: "Guests keep praising your friendly staff and shrimp tacos"
   - Then gently transition to 1-2 opportunity areas from negativeThemes (if they exist)

5. FRAME OPPORTUNITIES GENTLY:
   - Use softened language like "A few guests mention..." or "Some reviews highlight..."
   - Never say "you're failing", "this is bad", "you're in trouble"
   - Instead: "This is a powerful place to focus next" / "Easy win here" / "Dialing this in could turn more visits into 5★ reviews"

6. SCOPE OF COACHING (what TapAway CAN help with):
   - Hub taps (customer visits to review hub)
   - Google reviews and Yelp reviews
   - Review response rate and timing
   - Best times and days for reviews
   - Menu items mentioned in feedback
   - How TapAway can help grow their review presence

7. OUT-OF-SCOPE QUESTIONS (gently redirect):
   - If someone asks about things outside TapAway's scope (staffing, hiring, rent, suppliers, general business):
   - Acknowledge the question kindly
   - Redirect to what TapAway CAN help with
   - Example: "That's a big business decision outside TapAway's realm. What I can help with is making sure TapAway drives more reviews for you..."

8. TONE & MESSAGING (zero doom, all dopamine):
   - Always frame wins FIRST, then suggest improvements
   - NEVER say "you're failing", "this is in trouble", "you're doing bad", or any negative framing
   - Instead use: "Great base here" / "Lots of upside" / "Easy win" / "Next step" / "You're on the right track"
   - Speak with energy and positivity
   - Use emojis sparingly but keep it friendly

Current stats for ${orgName}:
- Total taps: ${stats.totalTaps}
- Total Google reviews: ${stats.totalReviews}
- Recent review window: ${stats.recentWindowDescription || 'all reviews'}
- Average rating: ${stats.avgRating ? stats.avgRating.toFixed(1) : 'N/A'}
- Sentiment breakdown: ${stats.positive} positive (≥4★), ${stats.neutral} neutral (3★), ${stats.negative} negative (≤2★)
- Sentiment percentages: ${stats.positivePct !== null ? `${stats.positivePct}% positive, ${stats.neutralPct}% neutral, ${stats.negativePct}% negative` : 'Waiting for first reviews'}${posThemesText}${negThemesText}

When answering questions:
- Reference real data when you have it
- Keep answers short, encouraging, and action-oriented
- Always tie advice back to using TapAway better
- Remember: taps = traffic, reviews = sentiment, no reviews ≠ bad
- Start with wins from positiveThemes, then gently mention 1-2 opportunities from negativeThemes`;

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
