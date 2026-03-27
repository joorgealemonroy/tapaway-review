import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hardcoded Stripe Price IDs
const PERSONAL_PRICES = {
  monthly: 'price_1SnMxKDg8DaTuVNZsc6KH8pw',  // $15/month
  yearly: 'price_1SnMz2Dg8DaTuVNZM7QjRAET',   // $99/year
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit: 10 requests per hour per IP
  const rlKey = getRateLimitKey(req, "create-personal-upgrade");
  if (!checkRateLimit(rlKey, 10, 60 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const { profileId, email, planType, currentUsername } = await req.json();

    if (!profileId || !email || !planType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[create-personal-upgrade] Creating upgrade checkout for:", {
      profileId,
      email,
      planType,
      currentUsername,
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const selectedPriceId = planType === 'yearly' 
      ? PERSONAL_PRICES.yearly 
      : PERSONAL_PRICES.monthly;

    console.log("[create-personal-upgrade] Using price:", selectedPriceId);

    // Calculate new username (remove "tap" prefix if present)
    const newUsername = currentUsername?.startsWith("tap") 
      ? currentUsername.slice(3) 
      : currentUsername;

    const origin = Deno.env.get("FRONTEND_URL") || "https://tapaway.co";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: selectedPriceId, quantity: 1 }],
      customer_email: email,
      success_url: `${origin}/dashboard?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard`,
      metadata: {
        type: "personal_upgrade",
        profile_id: profileId,
        old_username: currentUsername || "",
        new_username: newUsername || "",
        plan_type: planType,
      },
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
    });

    console.log("[create-personal-upgrade] Created session:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("[create-personal-upgrade] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
