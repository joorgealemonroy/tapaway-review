import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const { plan, salesRepId, repRestaurantId, restaurantName, contactEmail } = await req.json();

    if (!plan || !salesRepId) {
      throw new Error("Plan and salesRepId are required");
    }

    // Determine price ID based on plan
    let priceId: string;
    let planLabel: string;

    switch (plan) {
      case "monthly":
        priceId = "price_1SJP7CDg8DaTuVNZlcOE5Rn8"; // $30/month
        planLabel = "monthly";
        break;
      case "yearly_150":
        priceId = "price_1SJPryDg8DaTuVNZBB4at0Gc"; // $300/year (will apply promo)
        planLabel = "yearly_150";
        break;
      case "yearly_300":
        priceId = "price_1SJPryDg8DaTuVNZBB4at0Gc"; // $300/year
        planLabel = "yearly_300";
        break;
      default:
        throw new Error("Invalid plan type");
    }

    // Base URL for redirects
    const baseUrl = "https://tapaway.co";

    // Create Stripe checkout session with rep metadata
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/paywall`,
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      metadata: {
        sales_rep_id: salesRepId,
        rep_restaurant_id: repRestaurantId || "",
        restaurant_name: restaurantName || "",
        plan_type: planLabel,
        source: "rep_portal",
      },
    };

    // Add customer email if provided
    if (contactEmail) {
      sessionConfig.customer_email = contactEmail;
    }

    // Apply Christmas promo for yearly_150
    if (plan === "yearly_150") {
      const promoCode = Deno.env.get("STRIPE_PROMO_CHRISTMAS150");
      if (promoCode) {
        sessionConfig.discounts = [{ promotion_code: promoCode }];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log(`Created rep checkout session: ${session.id} for rep ${salesRepId}, plan: ${planLabel}`);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in create-rep-checkout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});