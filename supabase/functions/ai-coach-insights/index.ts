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

    // Get ALL reviews from google_reviews
    const { data: allReviews } = await supabaseClient
      .from('google_reviews')
      .select('author_name, rating, text, review_time, relative_time_description')
      .eq('restaurant_id', restaurantId)
      .order('review_time', { ascending: false });

    const reviews = allReviews ?? [];

    // Define window: last 90 days OR last 10 reviews, whichever is FEWER
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const reviewsLast90Days = reviews.filter(r => 
      r.review_time && new Date(r.review_time) >= ninetyDaysAgo
    );

    const recentReviews = reviewsLast90Days.length <= 10 
      ? reviewsLast90Days 
      : reviews.slice(0, 10);

    const recentReviewCount = recentReviews.length;

    // Compute sentiment on recentReviews
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

    // Extract themes using AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let opportunities: Opportunity[] = [];
    let wins: string[] = [];

    if (LOVABLE_API_KEY && recentReviewCount > 0) {
      // Extract negative themes (opportunities)
      if (negativeReviews.length >= 2) {
        try {
          const negativeTexts = negativeReviews
            .filter(r => r.text && r.text.trim().length > 10)
            .slice(0, 20)
            .map(r => `[${r.rating}★] ${r.text}`);

          if (negativeTexts.length > 0) {
            const negativePrompt = `Analyze these negative restaurant reviews and group them into up to 3 high-level categories. Use ONLY these categories: service, food quality, food consistency, price/value, hospitality, cleanliness, wait time, accuracy.

For each issue found, return:
- category (one of the 8 listed above)
- title (short, blunt but kind, e.g. "Service speed could be smoother")
- summary (very short, 1 sentence, e.g. "Some guests said food takes long during busy hours.")
- quickWin (1-line action step, e.g. "Prep your top 3 dishes earlier.")

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

      // Extract positive themes (wins)
      if (positiveReviews.length >= 2) {
        try {
          const positiveTexts = positiveReviews
            .filter(r => r.text && r.text.trim().length > 10)
            .slice(0, 20)
            .map(r => `[${r.rating}★] ${r.text}`);

          if (positiveTexts.length > 0) {
            const positivePrompt = `Analyze these positive restaurant reviews and extract what guests LOVE most. Return up to 3 short wins (one-liners with emoji).

Format: "⭐ [Thing guests love]"

Examples:
- "⭐ Guests love your ceviche bowl"
- "⭐ Friendly staff mentioned repeatedly"
- "⭐ Clean, comfortable vibe"

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

    // Get latest 3 reviews for display
    const latestReviews = recentReviews.slice(0, 3).map(r => ({
      author_name: r.author_name ?? 'Anonymous',
      rating: r.rating,
      text: r.text ?? '',
      relative_time_description: r.relative_time_description ?? null,
      review_time: r.review_time,
    }));

    // Get next 3 reviews for "Show more"
    const moreReviews = recentReviews.slice(3, 6).map(r => ({
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
      moreReviews,
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
