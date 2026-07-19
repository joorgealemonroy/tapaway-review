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

    // CRITICAL: Use FRONTEND_URL env var only - never use origin from request
    const frontendUrl = Deno.env.get("FRONTEND_URL");
    if (!frontendUrl) {
      console.error("FRONTEND_URL environment variable is not set!");
      throw new Error("Server configuration error: FRONTEND_URL not set");
    }
    
    // Ensure no trailing slash
    const baseUrl = frontendUrl.replace(/\/+$/, "");
    console.log(`Using FRONTEND_URL: ${baseUrl}`);

    // Fetch the application
    const { data: application, error: appError } = await supabase
      .from("rep_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      throw new Error("Application not found");
    }

    // Idempotency: if a sales_rep already exists for this email and is active,
    // treat this call as a no-op success instead of erroring. This lets admins
    // safely retry approval when the app row was flipped to 'approved' but
    // provisioning never completed.
    const { data: existingRepByEmail } = await supabase
      .from("sales_reps")
      .select("id, is_active")
      .eq("email", application.email.toLowerCase())
      .maybeSingle();

    if (existingRepByEmail && existingRepByEmail.is_active) {
      // Make sure app status reflects approval even if only the rep row existed.
      if (application.status !== "approved") {
        await supabase
          .from("rep_applications")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          })
          .eq("id", applicationId);
      }
      return new Response(
        JSON.stringify({
          success: true,
          alreadyProvisioned: true,
          userId: existingRepByEmail.id,
          message: "Rep already provisioned",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if a user with this email already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let userId: string;
    
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === application.email.toLowerCase()
    );

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create a new auth user with a random password
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
    await supabase
      .from("rep_applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", applicationId);

    // Generate our own setup token (bypasses Supabase redirect URL restrictions)
    const setupToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days for better UX

    // Delete any existing tokens for this user
    await supabase
      .from("rep_setup_tokens")
      .delete()
      .eq("user_id", userId);

    // Insert new token
    const { error: tokenError } = await supabase
      .from("rep_setup_tokens")
      .insert({
        user_id: userId,
        token: setupToken,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error("Error creating setup token:", tokenError);
      throw new Error("Failed to create setup token");
    }

    // Build setup URL using FRONTEND_URL only
    const setupUrl = `${baseUrl}/rep/setup-password?setupToken=${setupToken}`;
    console.log(`Generated setup URL: ${setupUrl}`);

    // Send welcome email
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const { error: emailError } = await resend.emails.send({
      from: `${Deno.env.get("EMAIL_FROM") || "TapAway <onboarding@resend.dev>"}`,
      to: [application.email],
      subject: "You've been approved as a TapAway Sales Partner! 🎉",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; margin-bottom: 24px;">Welcome aboard, ${application.name}! 🎉</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Great news! Your application to become a TapAway Sales Partner has been approved.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Click below to set your password and access the Sales Rep Portal.
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
          <p style="color: #888; font-size: 12px; margin-top: 32px;">
            This link expires in 7 days. Questions? Contact tap@tapaway.co
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Error sending welcome email:", emailError);
    } else {
      console.log(`Sent welcome email to ${application.email} with setup URL: ${setupUrl}`);
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
