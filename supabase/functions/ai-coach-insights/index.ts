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
      // Get last 10 reviews (newest first)
      const { data: lastReviews, error: reviewsError } = await supabaseClient
        .from('google_reviews')
        .select('author_name, rating, text, review_time, relative_time_description')
        .eq('restaurant_id', restaurantId)
        .order('review_time', { ascending: false })
        .limit(10);

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

    // Compute sentiment from last 10 reviews
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
      // Extract negative themes (opportunities) from last 10 reviews
      if (negativeReviews.length > 0) {
        try {
          const negativeTexts = negativeReviews
            .filter(r => r.text && r.text.trim().length > 10)
            .map(r => `[${r.rating}★] ${r.text}`);

          if (negativeTexts.length > 0) {
            const negativePrompt = `Analyze these negative restaurant reviews and identify the top 3 recurring issues. Use ONLY these categories: service, food quality, price/value, cleanliness, wait time, staff attitude.

For each issue found, return:
- category (one of the 6 listed above)
- title (ULTRA short, under 50 chars, direct and blunt, e.g. "Service feels rude")
- summary (ONE sentence max, under 80 chars, e.g. "Multiple guests report unfriendly staff.")
- quickWin (ONE line action, under 80 chars, e.g. "Coach staff on greeting warmly.")

Reviews:
${negativeTexts.join('\n\n')}

Return ONLY valid JSON array of objects, no explanation. Max 3 opportunities.`;

            const negResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [{ role: "user", content: negativePrompt }],
                temperature: 0.3,
                max_tokens: 600,
              }),
            });

            if (negResponse.ok) {
              const negData = await negResponse.json();
              const negContent = negData.choices?.[0]?.message?.content ?? "";
              try {
                const parsed = JSON.parse(negContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
                opportunities = Array.isArray(parsed) ? parsed.slice(0, 3) : [];
              } catch (e) {
                console.error("Failed to parse opportunities:", e);
              }
            }
          }
        } catch (e) {
          console.error("Error extracting opportunities:", e);
        }
      }

      // Extract positive themes (wins) from last 10 reviews
      if (positiveReviews.length > 0) {
        try {
          const positiveTexts = positiveReviews
            .filter(r => r.text && r.text.trim().length > 10)
            .map(r => `[${r.rating}★] ${r.text}`);

          if (positiveTexts.length > 0) {
            const positivePrompt = `Analyze these positive restaurant reviews and extract the top 3 things guests LOVE most. Return ULTRA short wins (one-liners with emoji, each under 60 chars).

Format: "⭐ [Thing guests love]"

Examples:
- "⭐ Guests love your ceviche"
- "⭐ Friendly service"
- "⭐ Clean and welcoming"

Reviews:
${positiveTexts.join('\n\n')}

Return ONLY a JSON array of strings (max 3 wins), no explanation.`;

            const posResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [{ role: "user", content: positivePrompt }],
                temperature: 0.3,
                max_tokens: 300,
              }),
            });

            if (posResponse.ok) {
              const posData = await posResponse.json();
              const posContent = posData.choices?.[0]?.message?.content ?? "";
              try {
                const parsed = JSON.parse(posContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
                wins = Array.isArray(parsed) ? parsed.slice(0, 3) : [];
              } catch (e) {
                console.error("Failed to parse wins:", e);
              }
            }
          }
        } catch (e) {
          console.error("Error extracting wins:", e);
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
