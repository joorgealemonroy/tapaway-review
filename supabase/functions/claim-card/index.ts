import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";
import { readLimitedText } from "../_shared/requestBody.ts";
import { takeQuota } from "../_shared/storefrontRateLimit.ts";

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

  // Rate limit: 10 requests per hour per IP
  const rlKey = getRateLimitKey(req, "claim-card");
  if (!checkRateLimit(rlKey, 10, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user with anon client
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;
    if (await takeQuota(req, "claim-card-account", 20, userId) < 0)
      return new Response(JSON.stringify({ error: "Too many attempts. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { public_code } = JSON.parse(await readLimitedText(req, 4096));

    if (typeof public_code !== "string" || !/^[a-z0-9_-]{3,128}$/i.test(public_code)) {
      return new Response(
        JSON.stringify({ error: "public_code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify card exists and is unclaimed
    const { data: card, error: cardError } = await serviceClient
      .from("nfc_cards")
      .select("id, status, owner_user_id, card_type, paid_order_ref")
      .eq("public_code", public_code.toUpperCase())
      .single();

    if (cardError || !card) {
      return new Response(
        JSON.stringify({ error: "Card not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (card.status !== "unclaimed" || (card.owner_user_id && card.owner_user_id !== userId)) {
      return new Response(
        JSON.stringify({ error: "This card has already been claimed" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Look up user's personal profile username
    const { data: profile, error: profileError } = await serviceClient
      .from("personal_profiles")
      .select("username")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "You need a TapAway profile to activate a card. Please complete signup first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Claim the card
    const { data: claimedCard, error: updateError } = await serviceClient
      .from("nfc_cards")
      .update({
        owner_user_id: userId,
        status: "claimed",
        destination_type: "profile",
        destination_value: profile.username,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", card.id)
      .eq("status", "unclaimed")
      .or(`owner_user_id.is.null,owner_user_id.eq.${userId}`)
      .select("id").maybeSingle();

    if (updateError) {
      console.error("[claim-card] Error updating card:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to activate card. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!claimedCard)
      return new Response(JSON.stringify({ error: "This card has already been claimed" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // A physical card claim only links its destination. It is not proof of a
    // paid subscription, even if a legacy card carries a paid_order_ref.
    // Billing and plan access are granted only by verified payment activation.

    console.log("[claim-card] Card claimed successfully", {
      cardId: card.id,
      userId,
      username: profile.username,
      cardType: card.card_type,
    });

    return new Response(
      JSON.stringify({
        success: true,
        username: profile.username,
        cardType: card.card_type,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[claim-card] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Something went wrong" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
