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
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.rpc("get_auth_user_by_email", {
      lookup_email: "tap@tapaway.co",
    });

    if (existingUsers && existingUsers.length > 0) {
      return new Response(
        JSON.stringify({ error: "Account already exists", userId: existingUsers[0].id }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: "tap@tapaway.co",
      password: "Ilovelovie123!",
      email_confirm: true,
      app_metadata: { role: "admin" },
    });

    if (createError || !newUser?.user) {
      console.error("Failed to create user:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create user: " + (createError?.message || "unknown") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newUser.user.id;
    console.log(`Created admin user with ID: ${newUserId}`);

    // Insert admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "admin" });

    if (roleError) {
      console.error("Failed to insert admin role:", roleError);
    } else {
      console.log("Admin role inserted successfully");
    }

    // Check for orphaned restaurants that belonged to the old admin
    const { data: orphanedRestaurants } = await supabaseAdmin
      .from("restaurants")
      .select("id, restaurant_name, owner_id")
      .is("owner_id", null);

    console.log(`Found ${orphanedRestaurants?.length || 0} orphaned restaurants`);

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUserId,
        roleInserted: !roleError,
        orphanedRestaurants: orphanedRestaurants || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in restore-admin:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
