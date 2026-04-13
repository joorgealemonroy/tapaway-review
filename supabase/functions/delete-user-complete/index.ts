import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin
    const isAdmin = caller.email === "tap@tapaway.co" || 
      caller.app_metadata?.role === "admin";
    
    if (!isAdmin) {
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "admin")
        .single();
      
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { restaurantId, userId, isPersonalAccount, deleteAuthUserOnly } = await req.json();

    // Handle orphan auth user deletion (no profile, no restaurant)
    if (deleteAuthUserOnly && userId) {
      if (userId === caller.id) {
        return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteUserError) {
        console.error("Error deleting orphan auth user:", deleteUserError);
        return new Response(JSON.stringify({ error: "Failed to delete auth user: " + deleteUserError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Successfully deleted orphan auth user ${userId}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle personal account deletion
    if (isPersonalAccount && userId) {
      // SAFETY CHECK: Prevent admin from deleting their own account
      if (userId === caller.id) {
        return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete personal profile related data
      const { data: profile } = await supabaseAdmin
        .from("personal_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (profile) {
        await supabaseAdmin.from("personal_analytics").delete().eq("profile_id", profile.id);
        await supabaseAdmin.from("personal_links").delete().eq("profile_id", profile.id);
        await supabaseAdmin.from("personal_blocks").delete().eq("profile_id", profile.id);
        await supabaseAdmin.from("personal_email_captures").delete().eq("profile_id", profile.id);
        
        // Delete the profile
        await supabaseAdmin.from("personal_profiles").delete().eq("id", profile.id);
      }

      // Delete user roles
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

      // Delete the auth user
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteUserError) {
        console.error("Error deleting auth user:", deleteUserError);
        return new Response(JSON.stringify({ 
          success: true, 
          warning: "Profile deleted but could not remove auth user" 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Successfully deleted personal account for user ${userId}`);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle restaurant deletion (existing logic)
    if (!restaurantId) {
      return new Response(JSON.stringify({ error: "restaurantId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the restaurant to find the owner_id
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("owner_id")
      .eq("id", restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return new Response(JSON.stringify({ error: "Restaurant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerId = restaurant.owner_id;
    const isOwnAccount = ownerId === caller.id;

    // Delete related data first
    await supabaseAdmin.from("locations").delete().eq("restaurant_id", restaurantId);
    await supabaseAdmin.from("analytics_events").delete().eq("restaurant_id", restaurantId);
    await supabaseAdmin.from("google_reviews").delete().eq("restaurant_id", restaurantId);
    await supabaseAdmin.from("goals").delete().eq("restaurant_id", restaurantId);
    await supabaseAdmin.from("competitors").delete().eq("restaurant_id", restaurantId);
    await supabaseAdmin.from("coach_ignored").delete().eq("restaurant_id", restaurantId);
    await supabaseAdmin.from("menu_sections").delete().eq("restaurant_id", restaurantId);
    await supabaseAdmin.from("restaurant_engagement").delete().eq("restaurant_id", restaurantId);
    await supabaseAdmin.from("review_sentiments").delete().eq("restaurant_id", restaurantId);
    await supabaseAdmin.from("fulfillment_orders").delete().eq("restaurant_id", restaurantId);
    await supabaseAdmin.from("av_meal_prep_meals").delete().eq("restaurant_id", restaurantId);
    await supabaseAdmin.from("av_meal_prep_testimonials").delete().eq("restaurant_id", restaurantId);
    await supabaseAdmin.from("av_trainer_bundles").delete().eq("restaurant_id", restaurantId);
    await supabaseAdmin.from("rep_restaurants").delete().eq("linked_restaurant_id", restaurantId);

    // Delete the restaurant
    const { error: deleteRestaurantError } = await supabaseAdmin
      .from("restaurants")
      .delete()
      .eq("id", restaurantId);

    if (deleteRestaurantError) {
      console.error("Error deleting restaurant:", deleteRestaurantError);
      return new Response(JSON.stringify({ error: "Failed to delete restaurant" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If the restaurant owner is the admin themselves, only delete the restaurant — not the auth user
    if (isOwnAccount) {
      console.log(`Admin deleted own restaurant ${restaurantId} (auth user preserved)`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete user roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", ownerId);

    // Delete the auth user completely
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(ownerId);

    if (deleteUserError) {
      console.error("Error deleting auth user:", deleteUserError);
      return new Response(JSON.stringify({ 
        success: true, 
        warning: "Restaurant deleted but could not remove auth user" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Successfully deleted restaurant ${restaurantId} and user ${ownerId}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in delete-user-complete:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
