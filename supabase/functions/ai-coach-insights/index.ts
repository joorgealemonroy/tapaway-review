import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReviewTheme {
  theme: string;
  count: number;
  exampleQuotes: string[];
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
      .select('owner_id, google_rating, google_user_ratings_total, last_google_sync_at, google_place_id')
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

    // Check if user is admin
    const { data: isAdminData } = await supabaseClient.rpc('is_admin');
    const isAdmin = isAdminData || user.email === 'tap@tapaway.co';
    
    if (!isAdmin && restaurant.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to restaurant data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Get totalTaps from analytics_events
    const { data: tapEvents } = await supabaseClient
      .from('analytics_events')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('event_type', 'tap');

    const totalTaps = tapEvents?.length ?? 0;

    // 2. Get ALL reviews from google_reviews
    const { data: allReviews } = await supabaseClient
      .from('google_reviews')
      .select('author_name, rating, text, review_time, relative_time_description')
      .eq('restaurant_id', restaurantId)
      .order('review_time', { ascending: false });

    const reviews = allReviews ?? [];
    const totalReviews = reviews.length;

    // 3. Define RECENT review window
    let recentReviews = reviews;
    let recentWindowDescription = "all your Google reviews";

    if (totalReviews >= 10) {
      // Calculate 6 months ago
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const reviewsLast6Months = reviews.filter(r => 
        r.review_time && new Date(r.review_time) >= sixMonthsAgo
      );

      if (reviewsLast6Months.length >= 50) {
        recentReviews = reviewsLast6Months;
        recentWindowDescription = `last ${reviewsLast6Months.length} Google reviews (last 6 months)`;
      } else {
        // Use up to 50 most recent reviews
        recentReviews = reviews.slice(0, Math.min(50, reviews.length));
        recentWindowDescription = `last ${recentReviews.length} Google reviews`;
      }
    }

    const recentReviewCount = recentReviews.length;

    // 4. Compute sentiment on recentReviews
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    const negativeReviews: typeof reviews = [];
    const positiveReviews: typeof reviews = [];

    for (const review of recentReviews) {
      if (review.rating >= 4) {
        positive++;
        positiveReviews.push(review);
      } else if (review.rating === 3) {
        neutral++;
        // Include negative-sounding 3★ reviews in negativeReviews for theme analysis
        if (review.text && (
          review.text.toLowerCase().includes('but') ||
          review.text.toLowerCase().includes('however') ||
          review.text.toLowerCase().includes('unfortunately') ||
          review.text.toLowerCase().includes('disappointed')
        )) {
          negativeReviews.push(review);
        }
      } else {
        negative++;
        negativeReviews.push(review);
      }
    }

    const positivePct = recentReviewCount > 0 ? Math.round((positive / recentReviewCount) * 100) : null;
    const neutralPct = recentReviewCount > 0 ? Math.round((neutral / recentReviewCount) * 100) : null;
    const negativePct = recentReviewCount > 0 ? Math.round((negative / recentReviewCount) * 100) : null;

    // 5. Extract themes using AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let negativeThemes: ReviewTheme[] = [];
    let positiveThemes: ReviewTheme[] = [];

    if (LOVABLE_API_KEY && recentReviewCount > 0) {
      // Extract negative themes
      if (negativeReviews.length >= 3) {
        try {
          const negativeTexts = negativeReviews
            .filter(r => r.text && r.text.trim().length > 10)
            .slice(0, 30)
            .map(r => `[${r.rating}★] ${r.text}`);

          if (negativeTexts.length > 0) {
            const negativePrompt = `Analyze these negative restaurant reviews and group them into up to 5 high-level themes. Return a JSON array of objects with: theme (2-4 word name), count (estimated number of reviews mentioning this), exampleQuotes (1-3 very short excerpts, max 10 words each).

Reviews:
${negativeTexts.join('\n\n')}

Return ONLY valid JSON array, no explanation.`;

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
                max_tokens: 500,
              }),
            });

            if (negResponse.ok) {
              const negData = await negResponse.json();
              const negContent = negData.choices?.[0]?.message?.content ?? "";
              try {
                const parsed = JSON.parse(negContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
                negativeThemes = Array.isArray(parsed) ? parsed.slice(0, 5) : [];
              } catch (e) {
                console.error("Failed to parse negative themes:", e);
              }
            }
          }
        } catch (e) {
          console.error("Error extracting negative themes:", e);
        }
      }

      // Extract positive themes
      if (positiveReviews.length >= 3) {
        try {
          const positiveTexts = positiveReviews
            .filter(r => r.text && r.text.trim().length > 10)
            .slice(0, 30)
            .map(r => `[${r.rating}★] ${r.text}`);

          if (positiveTexts.length > 0) {
            const positivePrompt = `Analyze these positive restaurant reviews and extract what guests LOVE most. Group into up to 5 themes. Return a JSON array of objects with: theme (2-4 word name like "Friendly staff" or "Shrimp tacos"), count (estimated number mentioning this), exampleQuotes (1-3 very short excerpts, max 10 words each).

Reviews:
${positiveTexts.join('\n\n')}

Return ONLY valid JSON array, no explanation.`;

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
                max_tokens: 500,
              }),
            });

            if (posResponse.ok) {
              const posData = await posResponse.json();
              const posContent = posData.choices?.[0]?.message?.content ?? "";
              try {
                const parsed = JSON.parse(posContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
                positiveThemes = Array.isArray(parsed) ? parsed.slice(0, 5) : [];
              } catch (e) {
                console.error("Failed to parse positive themes:", e);
              }
            }
          }
        } catch (e) {
          console.error("Error extracting positive themes:", e);
        }
      }
    }

    // 6. Get latest 3-5 reviews for display
    const latestReviews = reviews.slice(0, 5).map(r => ({
      author_name: r.author_name ?? 'Anonymous',
      rating: r.rating,
      text: r.text ?? '',
      relative_time_description: r.relative_time_description ?? null,
    }));

    // 7. Return comprehensive stats
    const stats = {
      totalTaps,
      totalReviews,
      avgRating: restaurant.google_rating,
      recentReviewCount,
      recentWindowDescription,
      positive,
      neutral,
      negative,
      positivePct,
      neutralPct,
      negativePct,
      googleRating: restaurant.google_rating,
      googleUserRatingsTotal: restaurant.google_user_ratings_total,
      lastGoogleSyncAt: restaurant.last_google_sync_at,
      hasGooglePlaceId: !!restaurant.google_place_id,
      latestReviews,
      negativeThemes,
      positiveThemes,
    };

    return new Response(
      JSON.stringify(stats),
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
