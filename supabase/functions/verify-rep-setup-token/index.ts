import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit: 10 requests per 15 minutes per IP
  const rlKey = getRateLimitKey(req, "verify-rep-setup-token");
  if (!checkRateLimit(rlKey, 10, 15 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { setupToken, newPassword, agreementAccepted, signatureName } = await req.json();

    if (!setupToken) {
      throw new Error("Setup token is required");
    }

    // Find the token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("rep_setup_tokens")
      .select("*")
      .eq("token", setupToken)
      .maybeSingle();

    if (tokenError || !tokenRecord) {
      console.error("Token not found:", setupToken);
      throw new Error("Invalid or expired setup link. Please contact support for a new invite.");
    }

    // Check if already used
    if (tokenRecord.used_at) {
      throw new Error("This setup link has already been used. Please log in with your password, or contact support if you need help.");
    }

    // Check if expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      throw new Error("This setup link has expired. Please contact support for a new invite.");
    }

    // If no password provided, just validate the token
    if (!newPassword) {
      // Get user email for display
      const { data: userData } = await supabase.auth.admin.getUserById(tokenRecord.user_id);
      
      return new Response(
        JSON.stringify({ 
          valid: true,
          email: userData?.user?.email,
          userId: tokenRecord.user_id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate agreement acceptance
    if (!agreementAccepted) {
      throw new Error("You must accept the Sales Partner Agreement to continue.");
    }
    
    if (!signatureName || signatureName.trim().split(/\s+/).length < 2) {
      throw new Error("Please enter your full legal name (first and last name).");
    }

    // Set the new password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenRecord.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      throw new Error("Failed to set password. Please try again.");
    }

    // Update sales_reps with agreement acceptance
    const now = new Date().toISOString();
    const { error: repUpdateError } = await supabase
      .from("sales_reps")
      .update({
        agreement_accepted: true,
        agreement_accepted_at: now,
        agreement_version: "1.0",
        signature_name: signatureName.trim(),
        signature_at: now,
      })
      .eq("id", tokenRecord.user_id);

    if (repUpdateError) {
      console.error("Error updating sales_reps agreement:", repUpdateError);
      // Don't throw - password was set successfully
    }

    // Mark token as used
    await supabase
      .from("rep_setup_tokens")
      .update({ used_at: now })
      .eq("id", tokenRecord.id);

    // Get user email for sign in
    const { data: userData } = await supabase.auth.admin.getUserById(tokenRecord.user_id);

    console.log(`Password set successfully for user ${tokenRecord.user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        email: userData?.user?.email,
        message: "Password set successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-rep-setup-token:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
