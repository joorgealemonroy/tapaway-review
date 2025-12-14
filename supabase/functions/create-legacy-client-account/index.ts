import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin-only function - verify caller is admin
async function verifyAdmin(req: Request, supabaseUrl: string, serviceKey: string): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;
  
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;
  
  // Check if admin email or has admin role
  if (user.email === "tap@tapaway.co") return true;
  
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  
  return !!roles;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin
    const isAdmin = await verifyAdmin(req, supabaseUrl, supabaseServiceKey);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, restaurantName, ownerName, stripeCustomerId, stripePriceId } = await req.json();

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`[create-legacy-client-account] User already exists: ${userId}`);
      
      // Update password for existing user
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: password,
        user_metadata: { must_set_password: false },
      });

      if (updateError) {
        console.error("[create-legacy-client-account] Failed to update password:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update user password" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Create new user with password already set
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          must_set_password: false,
          full_name: ownerName || restaurantName,
        },
      });

      if (createError || !newUser?.user) {
        console.error("[create-legacy-client-account] Failed to create user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create user account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      console.log(`[create-legacy-client-account] Created new user: ${userId}`);
    }

    // Check if restaurant already exists for this user
    const { data: existingRestaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (existingRestaurant) {
      // Update existing restaurant with Stripe info
      const { error: updateRestError } = await supabase
        .from("restaurants")
        .update({
          stripe_customer_id: stripeCustomerId || null,
          subscription_status: "active",
          plan_type: stripePriceId?.includes("yearly") ? "yearly" : "monthly",
          is_legacy_user: true,
        })
        .eq("id", existingRestaurant.id);

      if (updateRestError) {
        console.error("[create-legacy-client-account] Failed to update restaurant:", updateRestError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          userId, 
          restaurantId: existingRestaurant.id,
          message: "Updated existing restaurant with Stripe info"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create restaurant record
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .insert({
        owner_id: userId,
        restaurant_name: restaurantName,
        owner_name: ownerName || null,
        email: email,
        stripe_customer_id: stripeCustomerId || null,
        subscription_status: "active",
        plan_type: stripePriceId?.includes("yearly") ? "yearly" : "monthly",
        is_legacy_user: true,
        onboarding_completed: false,
        onboarding_step: 1,
      })
      .select("id")
      .single();

    if (restaurantError || !restaurant) {
      console.error("[create-legacy-client-account] Failed to create restaurant:", restaurantError);
      return new Response(
        JSON.stringify({ error: "Failed to create restaurant record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[create-legacy-client-account] Created restaurant: ${restaurant.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId, 
        restaurantId: restaurant.id,
        message: "Account created successfully"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[create-legacy-client-account] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create account";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
