import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { requireUser, adminClient, isAdmin, jsonResponse } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_RETURN_URL = "https://tapaway.co/dashboard";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if (!auth) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

    const { customerId } = await req.json();
    if (!customerId || typeof customerId !== "string") {
      return jsonResponse({ error: "Customer ID is required" }, 400, corsHeaders);
    }

    // Verify the customerId is bound to the caller (owner of a matching profile/restaurant) or admin.
    const admin = adminClient();
    const [{ data: personal }, { data: restaurant }] = await Promise.all([
      admin.from("personal_profiles").select("user_id").eq("stripe_customer_id", customerId).maybeSingle(),
      admin.from("restaurants").select("owner_id").eq("stripe_customer_id", customerId).maybeSingle(),
    ]);

    const owns =
      (personal?.user_id && personal.user_id === auth.user.id) ||
      (restaurant?.owner_id && restaurant.owner_id === auth.user.id);
    const callerIsAdmin = await isAdmin(auth.user.id);
    if (!owns && !callerIsAdmin) {
      console.warn("[create-billing-portal] Forbidden — customer not owned by caller");
      return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
    const returnUrl = Deno.env.get("STRIPE_PORTAL_RETURN_URL") || DEFAULT_RETURN_URL;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return jsonResponse({ url: portalSession.url }, 200, corsHeaders);
  } catch (error) {
    console.error("[create-billing-portal] Error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500, corsHeaders);
  }
});
