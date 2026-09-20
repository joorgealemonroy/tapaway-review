import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://tapaway.co";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limit: 5 per IP per hour
    const rlKey = getRateLimitKey(req, "email-signup");
    if (!checkRateLimit(rlKey, 5, 3600000)) {
      return rateLimitResponse(corsHeaders);
    }

    const { email, businessName, password } = await req.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!businessName || typeof businessName !== "string" || businessName.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Business name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // C-1: use the public signUp flow (anon key), NOT auth.admin.createUser.
    // admin.createUser does not reliably send the verification email, which
    // left users created-but-unconfirmed with no way to verify. signUp makes
    // Supabase Auth send the confirmation email and starts the user
    // unconfirmed, exactly matching the client's "check your email" UX.
    //
    // No enumeration: we deliberately do NOT pre-check listUsers (it was also
    // paginated and broken past 50 users). signUp's response for an already
    // registered address is opaque; we map only the explicit error.
    // (Requires https://tapaway.co/auth* in the Auth redirect allowlist.)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: businessName.trim() },
        emailRedirectTo: `${SITE_URL}/auth?redirect=/onboarding`,
      },
    });

    if (signUpError) {
      console.error("[create-email-signup] signUp error:", signUpError.message);
      const alreadyRegistered = /already registered|already exists/i.test(signUpError.message);
      return new Response(
        JSON.stringify({
          error: alreadyRegistered
            ? "An account with this email already exists. Please log in."
            : "Could not create your account. Please try again.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Never return passwords or sessions from this endpoint. The account is
    // unconfirmed until the user clicks the verification email; the client
    // sends them to /auth?redirect=/onboarding.
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[create-email-signup] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
