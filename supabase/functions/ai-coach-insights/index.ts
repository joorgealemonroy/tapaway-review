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

    const { restaurantId, reviewLimit = 10 } = await req.json();
    
    if (!restaurantId) {
      return new Response(
        JSON.stringify({ error: 'restaurantId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate reviewLimit
    const validLimits = [5, 10, 20, 30, 40, 50];
    const limit = validLimits.includes(reviewLimit) ? reviewLimit : 10;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify restaurant ownership or admin access
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from('restaurants')
      .select('owner_id, google_rating')
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

    // Check 1,000-tap unlock for non-admins
    if (!isAdmin && totalTaps < 1000) {
      return new Response(
        JSON.stringify({ 
          error: 'AI Coach locked',
          locked: true,
          totalTaps,
          requiredTaps: 1000
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get reviews sorted by time (newest first)
    const { data: allReviews } = await supabaseClient
      .from('google_reviews')
      .select('author_name, rating, text, review_time, relative_time_description')
      .eq('restaurant_id', restaurantId)
      .order('review_time', { ascending: false });

    const reviews = allReviews ?? [];

    // CRITICAL: Filter to ONLY reviews from last 90 days (3 months)
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
    
    const recentReviews = reviews.filter(r => {
      if (!r.review_time) return false;
      const reviewDate = new Date(r.review_time);
      return reviewDate >= ninetyDaysAgo;
    });

    // Apply the selected limit to recent reviews ONLY
    const displayReviews = recentReviews.slice(0, limit);
    const recentReviewCount = displayReviews.length;

    // Compute sentiment on LIMITED reviews (selected window)
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    const negativeReviews: typeof reviews = [];
    const positiveReviews: typeof reviews = [];

    // Use ONLY displayReviews (limited window) for theme extraction
    for (const review of displayReviews) {
      if (review.rating >= 4) {
        positiveReviews.push(review);
      } else if (review.rating === 3) {
        // Treat negative 3-star reviews as needing attention
        if (review.text && (
          review.text.toLowerCase().includes('but') ||
          review.text.toLowerCase().includes('however') ||
          review.text.toLowerCase().includes('unfortunately') ||
          review.text.toLowerCase().includes('disappointed')
        )) {
          negativeReviews.push(review);
        }
      } else if (review.rating <= 2) {
        // Always include 1-2 star reviews as negative
        negativeReviews.push(review);
      }
    }

    // Calculate sentiment ONLY from the limited review window
    for (const review of displayReviews) {
      if (review.rating >= 4) {
        positive++;
      } else if (review.rating === 3) {
        neutral++;
      } else {
        negative++;
      }
    }

    // Calculate percentage ignoring 3-star reviews (positive / (positive + negative) * 100)
    const sentimentTotal = positive + negative;
    const positivePct = sentimentTotal > 0 ? Math.round((positive / sentimentTotal) * 100) : null;

    // Extract themes using AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let opportunities: Opportunity[] = [];
    let wins: string[] = [];

    if (LOVABLE_API_KEY && recentReviewCount > 0) {
      // Extract negative themes (opportunities) from limited window
      if (negativeReviews.length >= 1) {
        try {
          const negativeTexts = negativeReviews
            .filter(r => r.text && r.text.trim().length > 10)
            .slice(0, 10)
            .map(r => `[${r.rating}★] ${r.text}`);

          if (negativeTexts.length > 0) {
            const negativePrompt = `Analyze these negative restaurant reviews from the MOST RECENT review window and group them into up to 3 high-level categories. Use ONLY these categories: service, food quality, food consistency, price/value, hospitality, cleanliness, wait time, accuracy.

For each issue found, return:
- category (one of the 8 listed above)
- title (ULTRA short, under 50 chars, e.g. "Service feels rushed")
- summary (ONE sentence max, under 80 chars, e.g. "Guests mention slow service during peak hours.")
- quickWin (ONE line action, under 80 chars, e.g. "Add one more server during dinner rush.")

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

      // Extract positive themes (wins) from limited window
      if (positiveReviews.length >= 1) {
        try {
          const positiveTexts = positiveReviews
            .filter(r => r.text && r.text.trim().length > 10)
            .slice(0, 10)
            .map(r => `[${r.rating}★] ${r.text}`);

          if (positiveTexts.length > 0) {
            const positivePrompt = `Analyze these positive restaurant reviews from the MOST RECENT review window and extract what guests LOVE most. Return up to 3 ULTRA short wins (one-liners with emoji, each under 60 chars).

Format: "⭐ [Thing guests love]"

Examples:
- "⭐ Guests love your tacos"
- "⭐ Friendly staff"
- "⭐ Clean and cozy"

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

    // Return reviews based on requested limit
    const latestReviews = displayReviews.map(r => ({
      author_name: r.author_name ?? 'Anonymous',
      rating: r.rating,
      text: r.text ?? '',
      relative_time_description: r.relative_time_description ?? null,
      review_time: r.review_time,
    }));

    // Return stats
    const stats = {
      totalTaps,
      wins,
      opportunities,
      recentReviews: latestReviews,
      sentiment: {
        positiveCount: positive,
        negativeCount: negative,
        percentagePositive: positivePct,
      },
      lastUpdated: new Date().toISOString(),
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
