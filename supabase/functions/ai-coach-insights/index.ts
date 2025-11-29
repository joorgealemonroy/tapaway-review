import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // 2. Get reviews from google_reviews
    const { data: reviews } = await supabaseClient
      .from('google_reviews')
      .select('author_name, rating, text, review_time, relative_time_description')
      .eq('restaurant_id', restaurantId)
      .order('review_time', { ascending: false });

    const allReviews = reviews ?? [];
    const totalReviews = allReviews.length;

    // 3. Compute sentiment (ONLY from reviews, never from taps)
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    for (const review of allReviews) {
      if (review.rating >= 4) positive++;
      else if (review.rating === 3) neutral++;
      else negative++;
    }

    const positivePct = totalReviews > 0 ? Math.round((positive / totalReviews) * 100) : null;
    const neutralPct = totalReviews > 0 ? Math.round((neutral / totalReviews) * 100) : null;
    const negativePct = totalReviews > 0 ? Math.round((negative / totalReviews) * 100) : null;

    // 4. Get latest 3-5 reviews for display
    const latestReviews = allReviews.slice(0, 5).map(r => ({
      author_name: r.author_name ?? 'Anonymous',
      rating: r.rating,
      text: r.text ?? '',
      relative_time_description: r.relative_time_description ?? null,
    }));

    // 5. Return comprehensive stats
    const stats = {
      totalTaps,
      totalReviews,
      avgRating: restaurant.google_rating,
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
