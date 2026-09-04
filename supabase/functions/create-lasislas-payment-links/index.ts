// ONE-TIME admin function: create two Stripe Payment Links for /lasnuevasislas
// ($20/mo and $200/yr, NO trial). Token-gated; deleted immediately after use.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-invoke-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("ONE_TIME_ADMIN_INVOKE_TOKEN");
  const provided = req.headers.get("x-admin-invoke-token");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Dedicated product for this hub so reporting stays clean
    const existing = await stripe.products.search({
      query: 'metadata["tapaway_slug"]:"lasnuevasislas" active:"true"',
      limit: 1,
    });
    const productId = existing.data.length > 0
      ? existing.data[0].id
      : (await stripe.products.create({
          name: "TapAway — Las Nuevas Islas",
          metadata: { tapaway_slug: "lasnuevasislas" },
        })).id;

    const makePrice = async (unitAmount: number, interval: "month" | "year") => {
      const prices = await stripe.prices.list({ product: productId, type: "recurring", active: true, limit: 50 });
      const match = prices.data.find(
        (p) => p.unit_amount === unitAmount && p.currency === "usd" && p.recurring?.interval === interval,
      );
      if (match) return match.id;
      return (await stripe.prices.create({
        product: productId,
        unit_amount: unitAmount,
        currency: "usd",
        recurring: { interval },
      })).id;
    };

    const monthlyPriceId = await makePrice(2000, "month"); // $20/mo
    const yearlyPriceId = await makePrice(20000, "year"); // $200/yr

    const makeLink = async (priceId: string, planType: string) => {
      const link = await stripe.paymentLinks.create({
        line_items: [{ price: priceId, quantity: 1 }],
        // No trial: subscription starts billing immediately
        billing_address_collection: "required",
        metadata: {
          slug: "lasnuevasislas",
          plan_type: planType,
          dashboard_type: "restaurant",
          no_trial: "true",
        },
        after_completion: {
          type: "redirect",
          redirect: { url: "https://tapaway.co/onboarding?source=stripe&slug=lasnuevasislas" },
        },
      });
      return link.url;
    };

    const monthlyUrl = await makeLink(monthlyPriceId, "monthly_20");
    const yearlyUrl = await makeLink(yearlyPriceId, "yearly_200");

    console.log("[create-lasislas-payment-links] Created links", { monthlyUrl, yearlyUrl });

    return new Response(
      JSON.stringify({ ok: true, productId, monthlyPriceId, yearlyPriceId, monthlyUrl, yearlyUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("[create-lasislas-payment-links] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
