import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Pricing (mirrors create-checkout-session) ──
const PLAN_CONFIG: Record<string, { name: string; amount: number; trialDays: number; productName: string }> = {
  solo: { name: "Solo Pro", amount: 1500, trialDays: 14, productName: "TapAway Solo Pro" },
  venue: { name: "Venue Pack", amount: 3900, trialDays: 21, productName: "TapAway Venue Pack" },
};
const PROTECTION_AMOUNT = 500;

function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  if (email.length > 255) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUuid(v: string | undefined): boolean {
  if (!v) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/** Find or create a Stripe product by metadata key */
async function findOrCreateProduct(stripe: Stripe, metaKey: string, metaValue: string, productName: string): Promise<string> {
  const existing = await stripe.products.search({ query: `metadata["${metaKey}"]:"${metaValue}" active:"true"`, limit: 1 });
  if (existing.data.length > 0) return existing.data[0].id;
  const product = await stripe.products.create({ name: productName, metadata: { [metaKey]: metaValue } });
  return product.id;
}

/** Find or create a recurring monthly USD price on a product */
async function findOrCreatePrice(stripe: Stripe, productId: string, unitAmount: number): Promise<string> {
  const prices = await stripe.prices.list({ product: productId, type: "recurring", active: true, limit: 20 });
  const match = prices.data.find((p) => p.unit_amount === unitAmount && p.currency === "usd" && p.recurring?.interval === "month");
  if (match) return match.id;
  const price = await stripe.prices.create({ product: productId, unit_amount: unitAmount, currency: "usd", recurring: { interval: "month" } });
  return price.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Rate limit
  const rlKey = getRateLimitKey(req, "create-rep-onboarding");
  if (!checkRateLimit(rlKey, 10, 60 * 60 * 1000)) return rateLimitResponse(corsHeaders);

  try {
    // ── 1. Authenticate the calling rep ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify JWT with anon client
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: repUser }, error: authError } = await anonClient.auth.getUser();
    if (authError || !repUser) return json({ error: "Invalid auth token" }, 401);

    // Check sales_reps table
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: repRow } = await adminClient
      .from("sales_reps")
      .select("id, is_active")
      .eq("id", repUser.id)
      .maybeSingle();

    if (!repRow?.is_active) return json({ error: "Not an active sales rep" }, 403);

    // ── 2. Parse & validate body ──
    const body = await req.json();
    const {
      clientEmail,
      businessName,
      shippingAddress,
      planType,
      hasProtection,
      googlePlaceId,
      googlePlaceName,
      googlePlaceAddress,
      logoUrl,
      repRestaurantId,
      cardHeadline,
      cardSubHeadline,
    } = body;

    if (!validateEmail(clientEmail)) return json({ error: "Invalid client email" }, 400);
    if (!businessName || typeof businessName !== "string" || businessName.trim().length < 1 || businessName.length > 255) {
      return json({ error: "Invalid business name" }, 400);
    }
    if (repRestaurantId && !validateUuid(repRestaurantId)) return json({ error: "Invalid repRestaurantId" }, 400);

    const validPlan = planType === "solo" || planType === "venue" ? planType : "venue";
    const config = PLAN_CONFIG[validPlan];
    const protection = !!hasProtection;

    console.log("[create-rep-onboarding] Rep:", repUser.id, "Client:", clientEmail.substring(0, 3) + "***", "Plan:", validPlan);

    // ── 3. Find or invite the client user ──
    let clientUserId: string;

    const { data: existingUsers } = await adminClient.rpc("get_auth_user_by_email", { lookup_email: clientEmail });
    if (existingUsers && existingUsers.length > 0) {
      clientUserId = existingUsers[0].id;
      console.log("[create-rep-onboarding] Existing user found:", clientUserId);
    } else {
      const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(clientEmail, {
        data: { invited_by_rep: repUser.id },
      });
      if (inviteErr) {
        console.error("[create-rep-onboarding] Invite error:", inviteErr);
        return json({ error: "Failed to create client account: " + inviteErr.message }, 500);
      }
      clientUserId = invited.user.id;
      console.log("[create-rep-onboarding] New user invited:", clientUserId);
    }

    // ── 4. Create or update restaurant ──
    const totalTrialDays = config.trialDays;
    const trialEndsAt = new Date(Date.now() + totalTrialDays * 86400000).toISOString();

    // Generate slug
    const slug = businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 50);

    // Build Google review URL if place ID provided
    let googleReviewUrl: string | null = null;
    if (googlePlaceId && typeof googlePlaceId === "string" && googlePlaceId.length > 0) {
      googleReviewUrl = `https://search.google.com/local/writereview?placeid=${googlePlaceId.trim()}`;
    }

    // Check for existing restaurant
    const { data: existingRestaurant } = await adminClient
      .from("restaurants")
      .select("id")
      .eq("owner_id", clientUserId)
      .maybeSingle();

    let restaurantId: string;
    const restaurantData = {
      restaurant_name: businessName.trim(),
      custom_slug: slug,
      email: clientEmail,
      subscription_status: "trialing",
      onboarding_step: 3,
      plan_type: validPlan,
      has_loss_protection: protection,
      trial_ends_at: trialEndsAt,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
      ...(googlePlaceId ? { google_place_id: googlePlaceId } : {}),
      ...(googleReviewUrl ? { google_review_url: googleReviewUrl } : {}),
      ...(googlePlaceAddress ? { address: googlePlaceAddress } : {}),
      ...(googlePlaceName && googlePlaceAddress
        ? { directions_url: `https://maps.apple.com/?q=${encodeURIComponent(googlePlaceName)}&address=${encodeURIComponent(googlePlaceAddress)}` }
        : {}),
      ...(cardHeadline ? { card_headline: cardHeadline } : {}),
      ...(cardSubHeadline ? { card_sub_headline: cardSubHeadline } : {}),
    };

    if (existingRestaurant) {
      await adminClient.from("restaurants").update(restaurantData).eq("id", existingRestaurant.id);
      restaurantId = existingRestaurant.id;
    } else {
      const { data: created, error: createErr } = await adminClient
        .from("restaurants")
        .insert({ owner_id: clientUserId, ...restaurantData })
        .select("id")
        .single();
      if (createErr || !created) {
        console.error("[create-rep-onboarding] Restaurant creation error:", createErr);
        return json({ error: "Failed to create restaurant" }, 500);
      }
      restaurantId = created.id;
    }

    // ── 5. Rep attribution ──
    if (repRestaurantId) {
      await adminClient
        .from("rep_restaurants")
        .update({ status: "closing" })
        .eq("id", repRestaurantId)
        .eq("sales_rep_id", repRow.id);
    }

    // ── 6. Stripe checkout ──
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) return json({ error: "Stripe not configured" }, 500);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    const baseProdId = await findOrCreateProduct(stripe, "tapaway_plan", validPlan, config.productName);
    const basePriceId = await findOrCreatePrice(stripe, baseProdId, config.amount);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price: basePriceId, quantity: 1 }];

    if (protection) {
      const protProdId = await findOrCreateProduct(stripe, "tapaway_addon", "loss_protection", "TapAway Loss Protection");
      const protPriceId = await findOrCreatePrice(stripe, protProdId, PROTECTION_AMOUNT);
      lineItems.push({ price: protPriceId, quantity: 1 });
    }

    const frontendUrl = Deno.env.get("FRONTEND_URL") || req.headers.get("origin") || "https://tapaway.co";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: lineItems,
      customer_email: clientEmail,
      success_url: `${frontendUrl}/rep-checkout-success?status=success`,
      cancel_url: `${frontendUrl}/onboarding?rep=true`,
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: ["US", "CA", "MX"] },
      subscription_data: { trial_period_days: config.trialDays },
      metadata: {
        plan_type: validPlan,
        has_protection: String(protection),
        user_id: clientUserId,
        restaurant_id: restaurantId,
        sales_rep_id: repUser.id,
        rep_restaurant_id: repRestaurantId || "",
        logo_url: logoUrl || "",
        card_headline: cardHeadline || "",
        card_sub_headline: cardSubHeadline || "",
      },
    });

    console.log("[create-rep-onboarding] Checkout session created:", session.id);

    return json({ url: session.url, restaurantId, clientUserId });
  } catch (error) {
    console.error("[create-rep-onboarding] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
