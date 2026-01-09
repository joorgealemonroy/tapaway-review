import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the calling user's auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, newEmail, profileId } = await req.json();

    if (!userId || !newEmail || !profileId) {
      return new Response(
        JSON.stringify({ error: "userId, newEmail, and profileId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[update-personal-account-email] Admin ${callerUser.email} updating user ${userId} email to ${newEmail}`);

    // Update the email in auth.users using admin API
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true, // Auto-confirm the new email
    });

    if (authUpdateError) {
      console.error("[update-personal-account-email] Auth update error:", authUpdateError);
      return new Response(
        JSON.stringify({ error: `Failed to update auth email: ${authUpdateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the email in personal_profiles
    const { error: profileUpdateError } = await supabase
      .from("personal_profiles")
      .update({ 
        email: newEmail,
        updated_at: new Date().toISOString()
      })
      .eq("id", profileId);

    if (profileUpdateError) {
      console.error("[update-personal-account-email] Profile update error:", profileUpdateError);
      return new Response(
        JSON.stringify({ error: `Failed to update profile email: ${profileUpdateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the action
    await supabase.from("admin_audit_log").insert({
      admin_user_id: callerUser.id,
      action: "update_personal_account_email",
      target_type: "personal_profile",
      target_id: profileId,
      details: {
        user_id: userId,
        new_email: newEmail,
      }
    });

    console.log(`[update-personal-account-email] Successfully updated email for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email updated successfully",
        newEmail 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("[update-personal-account-email] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
