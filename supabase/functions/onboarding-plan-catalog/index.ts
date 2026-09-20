import Stripe from "https://esm.sh/stripe@14.21.0";
import { getPublicOnboardingCatalog } from "../_shared/onboardingCatalog.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!checkRateLimit(getRateLimitKey(req, "onboarding-plan-catalog"), 60, 60_000)) return rateLimitResponse(corsHeaders);
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe catalog is not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const catalog = await getPublicOnboardingCatalog(stripe);
    return new Response(JSON.stringify({ catalog, cachedForSeconds: 600 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("[onboarding-plan-catalog] Failed", error instanceof Error ? error.message : "unknown");
    return new Response(JSON.stringify({ error: "Plan options are temporarily unavailable" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});