import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Opportunity {
  category: string;
  title: string;
  summary: string;
  quickWin: string;
}

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
    
    if (!restaurantId) {
      return new Response(
        JSON.stringify({ error: 'restaurantId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify restaurant ownership or admin access
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from('restaurants')
      .select('owner_id, google_rating, ai_coach_unlocked')
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
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: isAdminData } = await supabaseClient.rpc('is_admin');
    const isAdmin = isAdminData || user.email === 'tap@tapaway.co';
    
    if (!isAdmin && restaurant.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to restaurant data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get totalTaps from analytics_events
    const { data: tapEvents } = await supabaseClient
      .from('analytics_events')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('event_type', 'tap');

    const totalTaps = tapEvents?.length ?? 0;

    // ===========================================
    // AI Coach Gating: ONLY based on taps + manual unlock
    // No admin bypass, no test account bypass, no legacy/paywall flags
    // ===========================================
    const isManuallyUnlocked = restaurant.ai_coach_unlocked === true;
    const isUnlocked = (totalTaps >= 1000) || isManuallyUnlocked;
    
    if (!isUnlocked) {
      // Return 200 with locked flag so frontend can properly display lock screen
      // ALL users (including admins) see locked screen, but admins can unlock via UI
      return new Response(
        JSON.stringify({ 
          locked: true,
          totalTaps,
          requiredTaps: 1000
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===========================================
    // AI Coach is UNLOCKED - fetch reviews and compute insights
    // Wrap everything in try-catch to handle Google errors gracefully
    // ===========================================
    
    let reviews: any[] = [];
    let googleError = false;

    try {
      // Get last 5 reviews (newest first)
      const { data: lastReviews, error: reviewsError } = await supabaseClient
        .from('google_reviews')
        .select('author_name, rating, text, review_time, relative_time_description')
        .eq('restaurant_id', restaurantId)
        .order('review_time', { ascending: false })
        .limit(5);

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
        googleError = true;
      } else {
        reviews = lastReviews ?? [];
      }
    } catch (e) {
      console.error('Exception fetching reviews:', e);
      googleError = true;
    }

    const reviewCount = reviews.length;

    // Compute sentiment from last 5 reviews
    let positive = 0;
    let negative = 0;

    const negativeReviews: typeof reviews = [];
    const positiveReviews: typeof reviews = [];

    // Extract themes from reviews
    for (const review of reviews) {
      if (review.rating >= 4) {
        positive++;
        positiveReviews.push(review);
      } else if (review.rating <= 2) {
        negative++;
        negativeReviews.push(review);
      }
      // 3-star reviews are completely ignored in sentiment calculation
    }

    // Calculate percentage ignoring 3-star reviews: positive / (positive + negative) * 100
    const sentimentTotal = positive + negative;
    const positivePct = sentimentTotal > 0 ? Math.round((positive / sentimentTotal) * 100) : null;
    const hasEnoughData = sentimentTotal > 0;

    // Extract themes using AI (wrap in try-catch to not fail the whole request)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let opportunities: Opportunity[] = [];
    let wins: string[] = [];

    if (LOVABLE_API_KEY && reviewCount > 0) {
      // Prepare all reviews with their ratings for a single comprehensive analysis
      const allReviewTexts = reviews
        .filter(r => r.text && r.text.trim().length > 5)
        .map(r => `[${r.rating}★] "${r.text}"`);

      if (allReviewTexts.length > 0) {
        try {
          const analysisPrompt = `You are analyzing ${allReviewTexts.length} restaurant reviews. Your job is to extract ONLY what is EXPLICITLY mentioned in these reviews. DO NOT make anything up. DO NOT infer or assume anything not directly stated.

REVIEWS:
${allReviewTexts.join('\n\n')}

INSTRUCTIONS:
1. Read each review carefully
2. For negative feedback (1-2★ reviews OR complaints mentioned in any review): Extract the EXACT issues mentioned. If a review says "food was cold", report "food was cold" - do NOT say "food is rotten"
3. For positive feedback (4-5★ reviews OR praise mentioned in any review): Extract the EXACT things praised

CRITICAL RULES:
- ONLY report what is EXPLICITLY written in the reviews
- Use the reviewer's actual words when possible
- If there are no negative reviews, return empty opportunities array
- If there are no positive reviews, return empty wins array
- DO NOT exaggerate or dramatize (e.g., "slow service" should NOT become "horrible service")
- DO NOT invent issues that aren't mentioned

Return this exact JSON structure:
{
  "opportunities": [
    {
      "category": "service|food quality|price/value|cleanliness|wait time|staff attitude",
      "title": "Short description under 50 chars using reviewer's words",
      "summary": "What the reviewer actually said, under 80 chars",
      "quickWin": "Simple actionable fix, under 80 chars"
    }
  ],
  "wins": ["⭐ Exact thing praised from review"]
}

Max 2 opportunities, max 3 wins. Return ONLY valid JSON, no explanation.`;

          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "user", content: analysisPrompt }],
              temperature: 0.1, // Very low temperature for factual extraction
              max_tokens: 800,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content ?? "";
            console.log("AI response:", content);
            try {
              const parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
              opportunities = Array.isArray(parsed.opportunities) ? parsed.opportunities.slice(0, 2) : [];
              wins = Array.isArray(parsed.wins) ? parsed.wins.slice(0, 3) : [];
            } catch (e) {
              console.error("Failed to parse AI response:", e, content);
            }
          }
        } catch (e) {
          console.error("Error extracting themes:", e);
        }
      }
    }

    // Return UNLOCKED stats - always include locked: false for consistency
    return new Response(
      JSON.stringify({
        locked: false,
        totalTaps,
        wins,
        opportunities,
        reviewCount,
        googleError,
        sentiment: {
          positiveCount: positive,
          negativeCount: negative,
          percentagePositive: positivePct,
          hasEnoughData,
        },
        lastUpdated: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-coach-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
