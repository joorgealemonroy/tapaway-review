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

// In-memory rate limiting for claim attempts
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(cardId: string): { allowed: boolean } {
  const now = Date.now();
  const entry = rateLimitMap.get(cardId);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(cardId, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return { allowed: true };
  }
  if (entry.count >= 5) {
    return { allowed: false };
  }
  entry.count++;
  return { allowed: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const { publicCode, claimCode, action, username } = await req.json();

    if (!publicCode || !claimCode) {
      return new Response(
        JSON.stringify({ error: "publicCode and claimCode are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Look up the card
    const { data: card, error: cardError } = await supabase
      .from("nfc_cards")
      .select("*")
      .eq("public_code", publicCode.toUpperCase())
      .maybeSingle();

    if (cardError || !card) {
      return new Response(
        JSON.stringify({ error: "Card not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (card.status !== "unclaimed") {
      return new Response(
        JSON.stringify({ error: "This card has already been claimed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit
    if (!checkRateLimit(card.id)) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please wait 10 minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify claim code
    const claimHash = await sha256Hex(claimCode.toUpperCase());
    if (claimHash !== card.claim_code_hash) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid claim code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action: verify only ───
    if (action === "verify") {
      return new Response(
        JSON.stringify({ valid: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action: claim ───
    // Require auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email as string;

    if (!username) {
      return new Response(
        JSON.stringify({ error: "Username is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedUsername = username.toLowerCase();

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from("personal_profiles")
      .select("id, username")
      .eq("user_id", userId)
      .maybeSingle();

    let finalUsername: string;

    if (existingProfile) {
      // User has a profile — link to their existing username
      finalUsername = existingProfile.username;
    } else {
      // Check username availability
      const { data: usernameAvail } = await supabase.rpc("is_username_available", {
        check_username: normalizedUsername,
      });

      if (!usernameAvail) {
        return new Response(
          JSON.stringify({ error: `Username "${normalizedUsername}" is already taken` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create personal profile
      const { error: profileError } = await supabase
        .from("personal_profiles")
        .insert({
          user_id: userId,
          username: normalizedUsername,
          email: userEmail,
          full_name: normalizedUsername,
          plan_type: "pro",
          subscription_status: "active",
          header_type: "color",
          header_color: "#0d9488",
          background_color: "#ffffff",
          pfp_position: "center",
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        return new Response(
          JSON.stringify({ error: "Failed to create profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      finalUsername = normalizedUsername;
    }

    // Claim the card
    const { error: updateError } = await supabase
      .from("nfc_cards")
      .update({
        status: "claimed",
        owner_user_id: userId,
        destination_type: "profile",
        destination_value: finalUsername,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", card.id)
      .eq("status", "unclaimed"); // Optimistic lock

    if (updateError) {
      console.error("Card claim error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to claim card" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Card ${publicCode} claimed by user ${userId} → @${finalUsername}`);

    return new Response(
      JSON.stringify({
        success: true,
        username: finalUsername,
        profileUrl: `/${finalUsername}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("claim-nfc-card error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
