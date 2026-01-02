import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    console.log("[verify-custom-otp] Verifying OTP for:", normalizedEmail);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from("pending_otps")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", normalizedCode)
      .is("verified_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (fetchError) {
      console.error("[verify-custom-otp] Error fetching OTP:", fetchError);
      throw new Error("Failed to verify code");
    }

    if (!otpRecord) {
      console.log("[verify-custom-otp] Invalid or expired code for:", normalizedEmail);
      return new Response(
        JSON.stringify({ error: "Invalid or expired code. Please try again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as verified
    await supabase
      .from("pending_otps")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    let userId: string;
    let accessToken: string;
    let refreshToken: string;

    if (existingUser) {
      // User exists - generate magic link session
      console.log("[verify-custom-otp] Existing user found:", existingUser.id);
      
      // Generate a session for the existing user
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
        options: {
          redirectTo: `${Deno.env.get("FRONTEND_URL") || "https://tapaway.co"}/onboarding/start`,
        },
      });

      if (sessionError) {
        console.error("[verify-custom-otp] Error generating session:", sessionError);
        throw new Error("Failed to create session");
      }

      // Extract the token from the link and verify it to get session
      const tokenHash = sessionData.properties?.hashed_token;
      
      // Use signInWithOtp to create a session - we'll return special data for frontend
      userId = existingUser.id;
      
      // Return user info - frontend will use this to sign in
      return new Response(
        JSON.stringify({ 
          success: true, 
          userId,
          email: normalizedEmail,
          isNewUser: false,
          // Include a one-time token for frontend to use
          verificationToken: tokenHash,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Create new user with auto-confirmed email
      console.log("[verify-custom-otp] Creating new user:", normalizedEmail);
      
      // Generate a random password (user won't need it - they use OTP)
      const tempPassword = crypto.randomUUID();
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true, // Auto-confirm since they verified OTP
      });

      if (createError) {
        console.error("[verify-custom-otp] Error creating user:", createError);
        throw new Error("Failed to create account");
      }

      userId = newUser.user.id;
      console.log("[verify-custom-otp] Created new user:", userId);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          userId,
          email: normalizedEmail,
          isNewUser: true,
          tempPassword, // Frontend will use this to sign in immediately
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("[verify-custom-otp] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Something went wrong" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
