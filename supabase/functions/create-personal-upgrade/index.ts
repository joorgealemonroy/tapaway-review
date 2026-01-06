import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // Get the correct price based on plan type
    const prices = await stripe.prices.list({
      active: true,
      expand: ["data.product"],
      limit: 100,
    });

    // Find personal plan prices
    const personalPrices = prices.data.filter((price: Stripe.Price) => {
      const product = price.product as Stripe.Product;
      return product.name?.toLowerCase().includes("personal") || 
             product.name?.toLowerCase().includes("tapaway personal");
    });

    let selectedPrice: Stripe.Price | undefined;

    if (planType === "yearly") {
      selectedPrice = personalPrices.find(
        (p: Stripe.Price) => p.recurring?.interval === "year"
      );
    } else {
      selectedPrice = personalPrices.find(
        (p: Stripe.Price) => p.recurring?.interval === "month"
      );
    }

    // Fallback to any available price
    if (!selectedPrice) {
      selectedPrice = prices.data.find(
        (p: Stripe.Price) =>
          p.recurring?.interval === (planType === "yearly" ? "year" : "month")
      );
    }

    if (!selectedPrice) {
      console.error("[create-personal-upgrade] No suitable price found");
      return new Response(
        JSON.stringify({ error: "No suitable price found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[create-personal-upgrade] Using price:", selectedPrice.id);

    // Calculate new username (remove "tap" prefix if present)
    const newUsername = currentUsername?.startsWith("tap") 
      ? currentUsername.slice(3) 
      : currentUsername;

    const origin = Deno.env.get("FRONTEND_URL") || "https://tapaway.co";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: selectedPrice.id, quantity: 1 }],
      customer_email: email,
      success_url: `${origin}/personal/dashboard?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/personal/dashboard`,
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
