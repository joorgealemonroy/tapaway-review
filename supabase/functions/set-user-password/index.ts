import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, password, sessionId } = await req.json();

    if (!userId || !password) {
      return new Response(
        JSON.stringify({ error: "User ID and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic password validation
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[set-user-password] Setting password for user: ${userId}`);

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, verify the user exists and has must_set_password flag
    const { data: user, error: getUserError } = await supabase.auth.admin.getUserById(userId);
    
    if (getUserError || !user?.user) {
      console.error("[set-user-password] User not found:", getUserError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify this user actually needs to set their password
    // Check both explicit flag AND fallback (never signed in = needs password)
    const hasExplicitFlag = user.user.user_metadata?.must_set_password === true;
    const hasNeverSignedIn = !user.user.last_sign_in_at;
    
    if (!hasExplicitFlag && !hasNeverSignedIn) {
      console.error("[set-user-password] User already has a password (has signed in before and no flag)");
      return new Response(
        JSON.stringify({ error: "This user already has a password set" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[set-user-password] User needs password - explicit flag: ${hasExplicitFlag}, never signed in: ${hasNeverSignedIn}`);

    // If sessionId provided, verify it matches this user's email (extra security)
    if (sessionId) {
      try {
        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (stripeSecretKey) {
          const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
          const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          const sessionEmail = session.customer_details?.email || session.customer_email;
          
          if (sessionEmail && sessionEmail.toLowerCase() !== user.user.email?.toLowerCase()) {
            // Billing email may differ from account email (e.g. Apple Pay) — warn but don't reject
            console.warn("[set-user-password] Stripe billing email differs from account email (non-fatal):", sessionEmail, "vs", user.user.email);
          }
        }
      } catch (stripeError) {
        // Non-blocking - just log and continue
        console.warn("[set-user-password] Could not verify Stripe session:", stripeError);
      }
    }

    // Update the user's password and clear the must_set_password flag
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: password,
      user_metadata: {
        ...user.user.user_metadata,
        must_set_password: false,
      },
    });

    if (updateError) {
      console.error("[set-user-password] Failed to update password:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to set password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[set-user-password] Password set successfully for user: ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        email: user.user.email,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[set-user-password] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to set password";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
