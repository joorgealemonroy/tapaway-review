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
    const { email, code, password } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Password is required for new users but optional for returning users
    const userPassword = typeof password === "string" && password.length >= 8 ? password : null;

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
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error("[verify-custom-otp] Error listing users:", listError);
      throw new Error("Failed to verify account");
    }

    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    let userId: string;

    if (existingUser) {
      // User exists - update their password if provided, else use a temp password
      console.log("[verify-custom-otp] Existing user found:", existingUser.id);

      const passwordToSet = userPassword || crypto.randomUUID();
      const usedProvidedPassword = !!userPassword;

      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: passwordToSet,
        email_confirm: true,
      });

      if (updateError) {
        console.error("[verify-custom-otp] Error updating user password:", updateError);
        throw new Error("Failed to create session");
      }

      userId = existingUser.id;

      return new Response(
        JSON.stringify({
          success: true,
          userId,
          email: normalizedEmail,
          isNewUser: false,
          usedProvidedPassword,
          tempPassword: passwordToSet, // Frontend will use this to sign in immediately
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Create new user with auto-confirmed email
      console.log("[verify-custom-otp] Creating new user:", normalizedEmail);
      
      // Use user-provided password or generate a temp one
      if (!userPassword) {
        return new Response(
          JSON.stringify({ error: "Password is required to create your account" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: userPassword,
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
          usedProvidedPassword: true,
          tempPassword: userPassword, // Frontend will use this to sign in immediately
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
