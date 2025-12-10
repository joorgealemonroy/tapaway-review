import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

    // ALWAYS use production URL - no dynamic origins
    const baseUrl = "https://tapaway.co";

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
      // Create a new auth user with a random password (they'll set real one)
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

    // Generate password recovery link - use Supabase's native action_link directly
    // This goes through Supabase's /auth/v1/verify which handles token verification properly
    const redirectUrl = `${baseUrl}/rep/setup-password`;
    console.log(`Generating recovery link with redirect to: ${redirectUrl}`);
    
    const { data: linkData, error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: application.email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (resetError) {
      console.error("Error generating recovery link:", resetError);
      throw new Error("Failed to generate password reset link");
    }

    // Use Supabase's action_link directly - it goes through proper verification
    const setupUrl = linkData?.properties?.action_link || `${baseUrl}/auth`;
    console.log(`Using Supabase action link for setup`);

    // Send welcome email with password setup link
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const { error: emailError } = await resend.emails.send({
      from: `${Deno.env.get("EMAIL_FROM") || "TapAway <onboarding@resend.dev>"}`,
      to: [application.email],
      subject: "Welcome to TapAway Sales Team! 🎉",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; margin-bottom: 24px;">Welcome aboard, ${application.name}! 🎉</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Great news! Your application to become a TapAway Sales Partner has been approved.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            You can now access the Sales Rep Portal to start closing restaurants and earning commissions.
          </p>
          <div style="margin: 32px 0;">
            <a href="${setupUrl}" style="background-color: #99DAFF; color: #000; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              Set Your Password & Get Started
            </a>
          </div>
          <p style="color: #555; font-size: 14px; line-height: 1.6;">
            <strong>Commission Structure:</strong><br>
            • $50 per closed restaurant<br>
            • $500 bonus for every 30 closes per month
          </p>
          <p style="color: #888; font-size: 14px; margin-top: 32px;">
            Questions? Reply to this email or contact tap@tapaway.co
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Error sending welcome email:", emailError);
    } else {
      console.log(`Sent welcome email to ${application.email}`);
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
