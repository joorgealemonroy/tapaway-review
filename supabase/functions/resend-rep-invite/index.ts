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

    const { repId } = await req.json();

    if (!repId) {
      throw new Error("Rep ID is required");
    }

    // CRITICAL: Use FRONTEND_URL env var only
    const frontendUrl = Deno.env.get("FRONTEND_URL");
    if (!frontendUrl) {
      console.error("FRONTEND_URL environment variable is not set!");
      throw new Error("Server configuration error: FRONTEND_URL not set");
    }
    
    const baseUrl = frontendUrl.replace(/\/+$/, "");
    console.log(`Using FRONTEND_URL: ${baseUrl}`);

    // Fetch the sales rep
    const { data: rep, error: repError } = await supabase
      .from("sales_reps")
      .select("*")
      .eq("id", repId)
      .single();

    if (repError || !rep) {
      throw new Error("Sales rep not found");
    }

    // Check if already signed agreement - shouldn't resend if they've completed setup
    if (rep.agreement_accepted) {
      throw new Error("This rep has already completed setup. They can use the regular login.");
    }

    // Generate new setup token (7 days expiration for better UX)
    const setupToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Delete any existing tokens for this user
    await supabase
      .from("rep_setup_tokens")
      .delete()
      .eq("user_id", repId);

    // Insert new token
    const { error: tokenError } = await supabase
      .from("rep_setup_tokens")
      .insert({
        user_id: repId,
        token: setupToken,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error("Error creating setup token:", tokenError);
      throw new Error("Failed to create setup token");
    }

    // Build setup URL
    const setupUrl = `${baseUrl}/rep/setup-password?setupToken=${setupToken}`;
    console.log(`Generated new setup URL for ${rep.email}: ${setupUrl}`);

    // Send new invite email
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const { error: emailError } = await resend.emails.send({
      from: `${Deno.env.get("EMAIL_FROM") || "TapAway <onboarding@resend.dev>"}`,
      to: [rep.email],
      subject: "Your TapAway Sales Partner setup link (new link)",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; margin-bottom: 24px;">New Setup Link, ${rep.name}!</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Here's a fresh link to set up your TapAway Sales Partner account.
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
      console.error("Error sending invite email:", emailError);
      throw new Error("Failed to send invite email");
    }

    console.log(`Resent invite to ${rep.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "New invite sent successfully" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in resend-rep-invite:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
