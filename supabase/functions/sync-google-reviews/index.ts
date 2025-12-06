import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurant_id } = await req.json();

    if (!restaurant_id) {
      return new Response(
        JSON.stringify({ error: 'restaurant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY_SERVER') || Deno.env.get('VITE_GOOGLE_MAPS_API_KEY');

    if (!googleApiKey) {
      console.error('No Google API key found');
      return new Response(
        JSON.stringify({ error: 'Google API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch restaurant data
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, google_place_id, last_google_sync_at')
      .eq('id', restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      console.error('Restaurant not found:', restaurantError);
      return new Response(
        JSON.stringify({ error: 'Restaurant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!restaurant.google_place_id) {
      // Return 200 with error flag so frontend can read the response body
      return new Response(
        JSON.stringify({ success: false, error: 'Restaurant has no Google Place ID configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: skip if synced within last 12 hours
    if (restaurant.last_google_sync_at) {
      const lastSync = new Date(restaurant.last_google_sync_at);
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      
      if (lastSync > twelveHoursAgo) {
        console.log('Skipping sync - last sync was within 12 hours');
        
        // Return existing data
        const { data: existingReviews } = await supabase
          .from('google_reviews')
          .select('*')
          .eq('restaurant_id', restaurant_id)
          .order('review_time', { ascending: false });

        return new Response(
          JSON.stringify({
            restaurant_id,
            place_id: restaurant.google_place_id,
            message: 'Using cached data (synced within last 12 hours)',
            reviews: existingReviews || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch from Google Places API (New) - request newest reviews
    console.log('Fetching Google reviews for place:', restaurant.google_place_id);
    
    // Use reviews.sortPreference to get newest reviews (NEWEST vs MOST_RELEVANT)
    const googleUrl = `https://places.googleapis.com/v1/places/${restaurant.google_place_id}`;
    
    const googleResponse = await fetch(googleUrl, {
      headers: {
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
        'X-Goog-Reviews-Sort': 'NEWEST'
      }
    });

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error('Google API error:', googleResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Google API error: ${googleResponse.status}`,
          message: errorText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleData = await googleResponse.json();
    
    const rating = googleData.rating || null;
    const userRatingsTotal = googleData.userRatingCount || null;
    const reviews = googleData.reviews || [];

    console.log(`Found ${reviews.length} reviews, rating: ${rating}, total: ${userRatingsTotal}`);

    // Delete existing reviews for this restaurant
    await supabase
      .from('google_reviews')
      .delete()
      .eq('restaurant_id', restaurant_id);

    // Insert new reviews (mapping from new API format)
    const reviewsToInsert = reviews.map((review: any) => ({
      restaurant_id,
      place_id: restaurant.google_place_id,
      author_name: review.authorAttribution?.displayName || 'Anonymous',
      rating: review.rating,
      text: review.text?.text || review.originalText?.text || '',
      review_time: review.publishTime ? new Date(review.publishTime).toISOString() : null,
      relative_time_description: review.relativePublishTimeDescription || '',
      profile_photo_url: review.authorAttribution?.photoUri || null
    }));

    if (reviewsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('google_reviews')
        .insert(reviewsToInsert);

      if (insertError) {
        console.error('Error inserting reviews:', insertError);
      }
    }

    // Update restaurant with latest stats
    await supabase
      .from('restaurants')
      .update({
        google_rating: rating,
        google_user_ratings_total: userRatingsTotal,
        last_google_sync_at: new Date().toISOString()
      })
      .eq('id', restaurant_id);

    return new Response(
      JSON.stringify({
        restaurant_id,
        place_id: restaurant.google_place_id,
        google_rating: rating,
        google_user_ratings_total: userRatingsTotal,
        reviews: reviewsToInsert
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-google-reviews:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
