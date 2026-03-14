import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

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
    const { public_code } = await req.json();

    if (!public_code || typeof public_code !== "string") {
      return new Response(
        JSON.stringify({ error: "public_code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify card exists and is unclaimed
    const { data: card, error: cardError } = await serviceClient
      .from("nfc_cards")
      .select("id, status, owner_user_id, card_type")
      .eq("public_code", public_code.toUpperCase())
      .single();

    if (cardError || !card) {
      return new Response(
        JSON.stringify({ error: "Card not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (card.status !== "unclaimed") {
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
    const { error: updateError } = await serviceClient
      .from("nfc_cards")
      .update({
        owner_user_id: userId,
        status: "claimed",
        destination_type: "profile",
        destination_value: profile.username,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", card.id)
      .eq("status", "unclaimed"); // Double-check to prevent race conditions

    if (updateError) {
      console.error("[claim-card] Error updating card:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to activate card. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. If VIP card, upgrade user's profile to VIP plan
    if (card.card_type === "vip") {
      const { error: vipError } = await serviceClient
        .from("personal_profiles")
        .update({
          plan_type: "vip",
          subscription_status: "active",
        })
        .eq("user_id", userId);

      if (vipError) {
        console.error("[claim-card] Error setting VIP:", vipError);
        // Card is already claimed, don't fail the whole request
      } else {
        console.log("[claim-card] VIP plan granted to user", userId);
      }
    }

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
