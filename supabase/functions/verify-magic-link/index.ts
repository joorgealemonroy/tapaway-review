import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[verify-magic-link] Verifying token...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash the token to look it up
    const tokenHash = await sha256Hex(token);

    // Find the token
    const { data: tokenData, error: lookupError } = await supabase
      .from("magic_link_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .is("used_at", null)
      .single();

    if (lookupError || !tokenData) {
      console.log("[verify-magic-link] Token not found or already used");
      return new Response(
        JSON.stringify({ error: "Invalid or expired magic link" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log("[verify-magic-link] Token expired");
      return new Response(
        JSON.stringify({ error: "Magic link has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark token as used
    const { error: updateError } = await supabase
      .from("magic_link_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    if (updateError) {
      console.error("[verify-magic-link] Error marking token as used:", updateError);
    }

    // Generate a session for the user
    // Using generateLink to create a magic link that we can use to sign in
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: tokenData.email,
    });

    if (linkError || !linkData) {
      console.error("[verify-magic-link] Error generating session link:", linkError);
      throw new Error("Failed to create session");
    }

    // Extract the token from the generated link and verify it to get a session
    const url = new URL(linkData.properties.action_link);
    const hashParams = new URLSearchParams(url.hash.slice(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      // If hash params don't work, try query params (depends on Supabase config)
      const queryToken = url.searchParams.get("token");
      if (queryToken) {
        // Verify the OTP token to get a session
        const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: queryToken,
          type: "magiclink",
        });

        if (verifyError || !sessionData.session) {
          console.error("[verify-magic-link] Error verifying OTP:", verifyError);
          throw new Error("Failed to create session");
        }

        console.log("[verify-magic-link] Session created for user:", tokenData.user_id);

        return new Response(
          JSON.stringify({
            success: true,
            session: {
              access_token: sessionData.session.access_token,
              refresh_token: sessionData.session.refresh_token,
              expires_in: sessionData.session.expires_in,
              token_type: "bearer",
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error("Failed to extract session tokens");
    }

    console.log("[verify-magic-link] Session created for user:", tokenData.user_id);

    return new Response(
      JSON.stringify({
        success: true,
        session: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: "bearer",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[verify-magic-link] Error:", error);
    const message = error instanceof Error ? error.message : "Something went wrong";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
