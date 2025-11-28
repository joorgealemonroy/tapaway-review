import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MealData {
  name: string;
  description?: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  image_url: string;
  order_url?: string;
}

interface TestimonialData {
  quote: string;
  author: string;
}

interface ImportRequest {
  restaurant_slug: string;
  meals?: MealData[];
  testimonials?: TestimonialData[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create client for auth check
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create admin client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { restaurant_slug, meals = [], testimonials = [] }: ImportRequest = await req.json();

    if (!restaurant_slug) {
      throw new Error('restaurant_slug is required');
    }

    // Look up restaurant and verify ownership
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, owner_id')
      .eq('custom_slug', restaurant_slug)
      .single();

    if (restaurantError || !restaurant) {
      throw new Error(`Restaurant with slug "${restaurant_slug}" not found`);
    }

    // Verify the calling user owns this restaurant
    if (restaurant.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Access denied - you do not own this restaurant' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const restaurantId = restaurant.id;
    let mealsImported = 0;
    let testimonialsImported = 0;

    // Import meals
    if (meals.length > 0) {
      const mealsToInsert = meals.map((meal, index) => ({
        restaurant_id: restaurantId,
        name: meal.name,
        description: meal.description || '',
        calories: meal.calories,
        protein_g: meal.protein_g || null,
        carbs_g: meal.carbs_g || null,
        fat_g: meal.fat_g || null,
        image_url: meal.image_url,
        order_url: meal.order_url || null,
        sort_order: index,
        is_active: true,
      }));

      const { error: mealsError } = await supabase
        .from('av_meal_prep_meals')
        .upsert(mealsToInsert, {
          onConflict: 'restaurant_id,name',
        });

      if (mealsError) {
        console.error('Error importing meals:', mealsError);
        throw mealsError;
      }

      mealsImported = mealsToInsert.length;
    }

    // Import testimonials
    if (testimonials.length > 0) {
      const testimonialsToInsert = testimonials.map((testimonial, index) => ({
        restaurant_id: restaurantId,
        quote: testimonial.quote,
        author: testimonial.author,
        sort_order: index,
      }));

      const { error: testimonialsError } = await supabase
        .from('av_meal_prep_testimonials')
        .upsert(testimonialsToInsert, {
          onConflict: 'restaurant_id,quote',
        });

      if (testimonialsError) {
        console.error('Error importing testimonials:', testimonialsError);
        throw testimonialsError;
      }

      testimonialsImported = testimonialsToInsert.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        restaurant_id: restaurantId,
        meals_imported: mealsImported,
        testimonials_imported: testimonialsImported,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in av-import-meals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/* 
 * USAGE EXAMPLE:
 * 
 * curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/av-import-meals \
 *   -H "Authorization: Bearer YOUR_ANON_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "restaurant_slug": "avmealpreps",
 *     "meals": [
 *       {
 *         "name": "BBQ Chicken",
 *         "description": "Savory grilled chicken coated in Sweet BBQ sauce...",
 *         "calories": 335,
 *         "protein_g": 30,
 *         "carbs_g": 28,
 *         "fat_g": 8,
 *         "image_url": "https://avmealpreps.com/path/to/bbq-chicken.jpg",
 *         "order_url": "https://avmealpreps.com/mealsbyunit/..."
 *       }
 *     ],
 *     "testimonials": [
 *       {
 *         "quote": "Portions are perfect and always fresh.",
 *         "author": "— Jasmine M."
 *       }
 *     ]
 *   }'
 */
