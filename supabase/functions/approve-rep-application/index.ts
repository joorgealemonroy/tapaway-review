import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the caller is an admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const isAdmin = user.email === "tap@tapaway.co" || 
      (await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()).data;

    if (!isAdmin) {
      throw new Error("Unauthorized - Admin access required");
    }

    const { applicationId } = await req.json();

    if (!applicationId) {
      throw new Error("Application ID is required");
    }

    // Fetch the application
    const { data: application, error: appError } = await supabase
      .from("rep_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      throw new Error("Application not found");
    }

    if (application.status !== "pending") {
      throw new Error("Application has already been processed");
    }

    // Check if a user with this email already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let userId: string;
    
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === application.email.toLowerCase()
    );

    if (existingUser) {
      // User already exists, use their ID
      userId = existingUser.id;
    } else {
      // Create a new auth user with a random password (they'll use magic link)
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: application.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: application.name,
          role: "sales_rep",
        },
      });

      if (createError || !newUser.user) {
        console.error("Error creating user:", createError);
        throw new Error("Failed to create user account");
      }

      userId = newUser.user.id;
    }

    // Check if sales_rep record already exists
    const { data: existingRep } = await supabase
      .from("sales_reps")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existingRep) {
      // Create sales_reps record
      const { error: repError } = await supabase.from("sales_reps").insert({
        id: userId,
        email: application.email.toLowerCase(),
        name: application.name,
        phone: application.phone,
        is_active: true,
      });

      if (repError) {
        console.error("Error creating sales rep:", repError);
        throw new Error("Failed to create sales rep record");
      }
    }

    // Add sales_rep role
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "sales_rep")
      .maybeSingle();

    if (!existingRole) {
      await supabase.from("user_roles").insert({
        user_id: userId,
        role: "sales_rep",
      });
    }

    // Update application status
    const { error: updateError } = await supabase
      .from("rep_applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", applicationId);

    if (updateError) {
      console.error("Error updating application:", updateError);
    }

    // Send password reset email so they can set their password
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: application.email,
      options: {
        redirectTo: "https://tapaway.co/rep",
      },
    });

    if (resetError) {
      console.error("Error generating magic link:", resetError);
      // Don't throw - the account is created, they can use forgot password
    }

    console.log(`Approved rep application for ${application.email}, userId: ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        message: "Rep approved successfully" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in approve-rep-application:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});