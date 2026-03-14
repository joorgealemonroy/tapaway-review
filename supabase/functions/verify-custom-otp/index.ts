import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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
    
    const userPassword = typeof password === "string" && password.length >= 8 ? password : null;

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    console.log("[verify-custom-otp] Verifying OTP for:", normalizedEmail);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find valid OTP (stored as SHA-256 hash)
    const codeHash = await sha256Hex(normalizedCode);

    const { data: otpRecord, error: fetchError } = await supabase
      .from("pending_otps")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", codeHash)
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

    // Look up existing user via DB function (efficient, no pagination issues)
    const { data: userRows, error: lookupError } = await supabase
      .rpc("get_auth_user_by_email", { lookup_email: normalizedEmail });

    if (lookupError) {
      console.error("[verify-custom-otp] Error looking up user:", lookupError);
      throw new Error("Failed to verify account");
    }

    const existingUser = userRows?.[0] ?? null;

    let userId: string;

    if (existingUser) {
      console.log("[verify-custom-otp] Existing user found:", existingUser.id);

      // If password provided, this is a password reset - update it
      if (userPassword) {
        console.log("[verify-custom-otp] Updating password for existing user");
        
        const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
          password: userPassword,
          email_confirm: true,
        });

        if (updateError) {
          console.error("[verify-custom-otp] Error updating password:", updateError);
          throw new Error("Failed to update password");
        }

        // Mark OTP as verified now that flow is complete
        await supabase
          .from("pending_otps")
          .update({ verified_at: new Date().toISOString() })
          .eq("id", otpRecord.id);

        console.log("[verify-custom-otp] Password updated for existing user:", existingUser.id);
        
        return new Response(
          JSON.stringify({
            success: true,
            userId: existingUser.id,
            email: normalizedEmail,
            isNewUser: false,
            passwordUpdated: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // No password provided - just confirm email
      await supabase.auth.admin.updateUserById(existingUser.id, {
        email_confirm: true,
      });

      // Mark OTP as verified now that flow is complete
      await supabase
        .from("pending_otps")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({
          success: true,
          userId: existingUser.id,
          email: normalizedEmail,
          isNewUser: false,
          existingAccount: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // New user - check if password was provided
      if (!userPassword) {
        // Return 200 with needsPassword flag so frontend can transition to password step
        console.log("[verify-custom-otp] New user needs password:", normalizedEmail);
        return new Response(
          JSON.stringify({ success: true, isNewUser: true, needsPassword: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new user with provided password
      console.log("[verify-custom-otp] Creating new user:", normalizedEmail);
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: userPassword,
        email_confirm: true,
      });

      if (createError) {
        console.error("[verify-custom-otp] Error creating user:", createError);
        throw new Error("Failed to create account");
      }

      userId = newUser.user.id;
      console.log("[verify-custom-otp] Created new user:", userId);

      // Mark OTP as verified now that account is created
      await supabase
        .from("pending_otps")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", otpRecord.id);
      
      console.log("[verify-custom-otp] success", {
        email: normalizedEmail,
        ts: new Date().toISOString(),
        success: true,
        isNewUser: true,
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          userId,
          email: normalizedEmail,
          isNewUser: true,
          usedProvidedPassword: true,
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
