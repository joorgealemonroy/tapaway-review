import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing session ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[verify-personal-upgrade] Verifying session:", sessionId);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ error: "Payment not completed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metadata = session.metadata || {};
    
    if (metadata.type !== "personal_upgrade") {
      return new Response(
        JSON.stringify({ error: "Invalid session type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profileId = metadata.profile_id;
    const oldUsername = metadata.old_username;
    const newUsername = metadata.new_username;
    const planType = metadata.plan_type || "monthly";
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    console.log("[verify-personal-upgrade] Upgrade details:", {
      profileId,
      oldUsername,
      newUsername,
      planType,
      customerId,
      subscriptionId,
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if new username is available (if different from old)
    let finalUsername = oldUsername;
    if (newUsername && newUsername !== oldUsername) {
      const { data: existingProfile } = await supabaseAdmin
        .from("personal_profiles")
        .select("id")
        .eq("username", newUsername)
        .maybeSingle();

      if (!existingProfile) {
        finalUsername = newUsername;
        console.log("[verify-personal-upgrade] New username available, will use:", finalUsername);
      } else {
        console.log("[verify-personal-upgrade] New username taken, keeping:", oldUsername);
      }
    }

    // Update the profile
    const { error: updateError } = await supabaseAdmin
      .from("personal_profiles")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan_type: planType,
        subscription_status: "active",
        username: finalUsername,
        card_confirmed: false, // Reset so they can confirm their card design
        archived_at: null, // Clear archived timestamp on upgrade
      })
      .eq("id", profileId);

    if (updateError) {
      console.error("[verify-personal-upgrade] Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Restore any archived premium content
    try {
      const response = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/restore-premium-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ profileId }),
        }
      );
      
      if (!response.ok) {
        console.error("[verify-personal-upgrade] Failed to restore premium content");
      } else {
        console.log("[verify-personal-upgrade] Premium content restored");
      }
    } catch (restoreErr) {
      console.error("[verify-personal-upgrade] Error restoring content:", restoreErr);
    }

    console.log("[verify-personal-upgrade] Profile upgraded successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        newUsername: finalUsername,
        planType,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("[verify-personal-upgrade] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
