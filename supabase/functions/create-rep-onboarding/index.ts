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
  solo: { name: "Solo Pro", amount: 1500, trialDays: 7, productName: "TapAway Solo Pro" },
  venue: { name: "Venue Pack", amount: 3900, trialDays: 7, productName: "TapAway Venue Pack" },
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

/** Find or create a 50% off coupon */
async function findOrCreate50OffCoupon(stripe: Stripe): Promise<string> {
  const coupons = await stripe.coupons.list({ limit: 100 });
  const existing = coupons.data.find(
    (c) => c.percent_off === 50 && c.valid && c.metadata?.tapaway_promo === "50_off"
  );
  if (existing) return existing.id;

  const coupon = await stripe.coupons.create({
    percent_off: 50,
    duration: "forever",
    name: "TapAway 50% Off Promo",
    metadata: { tapaway_promo: "50_off" },
  });
  return coupon.id;
}

/** Validate a promo token and return its discount_type, or null if invalid */
async function validatePromoToken(
  adminClient: ReturnType<typeof createClient>,
  token: string
): Promise<{ valid: boolean; discount_type?: string; tokenId?: string }> {
  if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return { valid: false };
  }

  const { data: tokenRow, error } = await adminClient
    .from("promo_tokens")
    .select("id, discount_type, expires_at, is_used")
    .eq("token", token)
    .maybeSingle();

  if (error || !tokenRow) return { valid: false };
  if (tokenRow.is_used) return { valid: false };
  if (new Date(tokenRow.expires_at) < new Date()) return { valid: false };

  return { valid: true, discount_type: tokenRow.discount_type, tokenId: tokenRow.id };
}

/** Build a Google Review URL from a place ID */
function buildGoogleReviewUrl(placeId: string | null | undefined): string | null {
  if (!placeId || typeof placeId !== "string" || placeId.trim().length === 0) return null;
  return `https://search.google.com/local/writereview?placeid=${placeId.trim()}`;
}

/** Create a slug from business name */
function makeSlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 50);
}

// ── Solo plan: create personal_profiles + optional google review link ──
async function createSoloProfile(
  adminClient: ReturnType<typeof createClient>,
  opts: {
    clientUserId: string;
    businessName: string;
    clientEmail: string;
    logoUrl?: string;
    googlePlaceId?: string;
    googlePlaceAddress?: string;
    subscriptionStatus: string;
    trialEndsAt: string | null;
  }
): Promise<{ profileId: string }> {
  const slug = makeSlug(opts.businessName);
  const googleReviewUrl = buildGoogleReviewUrl(opts.googlePlaceId);

  // Check for existing profile
  const { data: existing } = await adminClient
    .from("personal_profiles")
    .select("id")
    .eq("user_id", opts.clientUserId)
    .limit(1)
    .maybeSingle();

  let profileId: string;

  const profileData: Record<string, unknown> = {
    full_name: opts.businessName.trim(),
    email: opts.clientEmail,
    plan_type: "solo_pro",
    subscription_status: opts.subscriptionStatus,
    ...(opts.trialEndsAt ? { trial_ends_at: opts.trialEndsAt } : {}),
    ...(opts.logoUrl ? { profile_photo_url: opts.logoUrl } : {}),
  };

  if (existing) {
    await adminClient.from("personal_profiles").update(profileData).eq("id", existing.id);
    profileId = existing.id;
  } else {
    const { data: created, error } = await adminClient
      .from("personal_profiles")
      .insert({
        user_id: opts.clientUserId,
        username: slug,
        ...profileData,
      })
      .select("id")
      .single();
    if (error || !created) {
      console.error("[create-rep-onboarding] Profile creation error:", error);
      throw new Error("Failed to create profile");
    }
    profileId = created.id;

    // Owner-claim path always defaults to Solo Pro (premium layout on from day one).
    await adminClient
      .from("personal_profiles")
      .update({ plan_type: "solo_pro", is_founding_user: false, founding_number: null })
      .eq("id", profileId);
  }

  // Auto-create Google Review link if placeId provided
  if (googleReviewUrl) {
    const { data: existingLink } = await adminClient
      .from("personal_links")
      .select("id")
      .eq("profile_id", profileId)
      .eq("link_type", "google_review")
      .maybeSingle();

    if (!existingLink) {
      await adminClient.from("personal_links").insert({
        profile_id: profileId,
        link_type: "google_review",
        label: "Review Us on Google",
        url: googleReviewUrl,
        sort_order: 0,
        is_active: true,
        is_featured: true,
        pill_color: "#ffffff",
      });
    }
  }

  // Auto-create Directions link if address provided
  if (opts.googlePlaceAddress) {
    const { data: existingDirections } = await adminClient
      .from("personal_links")
      .select("id")
      .eq("profile_id", profileId)
      .eq("link_type", "directions")
      .maybeSingle();

    if (!existingDirections) {
      await adminClient.from("personal_links").insert({
        profile_id: profileId,
        link_type: "directions",
        label: "Directions",
        url: `https://maps.apple.com/?daddr=${encodeURIComponent(opts.googlePlaceAddress)}`,
        sort_order: 2,
        is_active: true,
        is_featured: false,
        pill_color: "#2563eb",
      });
    }
  }

  console.log("[create-rep-onboarding] Solo profile created/updated:", profileId);
  return { profileId };
}

// ── Venue plan: create restaurants record (existing logic) ──
async function createVenueRestaurant(
  adminClient: ReturnType<typeof createClient>,
  opts: {
    clientUserId: string;
    businessName: string;
    clientEmail: string;
    logoUrl?: string;
    googlePlaceId?: string;
    googlePlaceName?: string;
    googlePlaceAddress?: string;
    cardHeadline?: string;
    cardSubHeadline?: string;
    subscriptionStatus: string;
    trialEndsAt: string | null;
    isPromoFree: boolean;
    hasProtection: boolean;
    validPlan: string;
  }
): Promise<{ restaurantId: string }> {
  const slug = makeSlug(opts.businessName);
  const googleReviewUrl = buildGoogleReviewUrl(opts.googlePlaceId);

  const restaurantData: Record<string, unknown> = {
    restaurant_name: opts.businessName.trim(),
    custom_slug: slug,
    email: opts.clientEmail,
    subscription_status: opts.subscriptionStatus,
    onboarding_step: opts.isPromoFree ? 4 : 3,
    plan_type: opts.validPlan,
    has_loss_protection: opts.hasProtection,
    ...(opts.trialEndsAt ? { trial_ends_at: opts.trialEndsAt } : {}),
    ...(opts.isPromoFree ? { onboarding_completed: true } : {}),
    ...(opts.logoUrl ? { logo_url: opts.logoUrl } : {}),
    ...(opts.googlePlaceId ? { google_place_id: opts.googlePlaceId } : {}),
    ...(googleReviewUrl ? { google_review_url: googleReviewUrl } : {}),
    ...(opts.googlePlaceAddress ? { address: opts.googlePlaceAddress } : {}),
    ...(opts.googlePlaceName && opts.googlePlaceAddress
      ? { directions_url: `https://maps.apple.com/?q=${encodeURIComponent(opts.googlePlaceName)}&address=${encodeURIComponent(opts.googlePlaceAddress)}` }
      : {}),
    ...(opts.cardHeadline ? { card_headline: opts.cardHeadline } : {}),
    ...(opts.cardSubHeadline ? { card_sub_headline: opts.cardSubHeadline } : {}),
  };

  const { data: existingRestaurant } = await adminClient
    .from("restaurants")
    .select("id")
    .eq("owner_id", opts.clientUserId)
    .maybeSingle();

  let restaurantId: string;

  if (existingRestaurant) {
    await adminClient.from("restaurants").update(restaurantData).eq("id", existingRestaurant.id);
    restaurantId = existingRestaurant.id;
  } else {
    const { data: created, error } = await adminClient
      .from("restaurants")
      .insert({ owner_id: opts.clientUserId, ...restaurantData })
      .select("id")
      .single();
    if (error || !created) {
      console.error("[create-rep-onboarding] Restaurant creation error:", error);
      throw new Error("Failed to create restaurant");
    }
    restaurantId = created.id;
  }

  console.log("[create-rep-onboarding] Venue restaurant created/updated:", restaurantId);
  return { restaurantId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Rate limit
  const rlKey = getRateLimitKey(req, "create-rep-onboarding");
  if (!checkRateLimit(rlKey, 10, 60 * 60 * 1000)) return rateLimitResponse(corsHeaders);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // ── 1. Parse body ──
    const body = await req.json();
    const {
      clientEmail,
      businessName,
      planType,
      hasProtection,
      googlePlaceId,
      googlePlaceName,
      googlePlaceAddress,
      logoUrl,
      repRestaurantId,
      cardHeadline,
      cardSubHeadline,
      promoToken,
    } = body;

    // ── 2. Auth: either rep auth OR promo token ──
    let repUserId: string | null = null;
    let promoResult: { valid: boolean; discount_type?: string; tokenId?: string } | null = null;

    if (promoToken) {
      promoResult = await validatePromoToken(adminClient, promoToken);
      if (!promoResult.valid) {
        return json({ error: "Invalid or expired promo token" }, 403);
      }
      console.log("[create-rep-onboarding] Promo token validated:", promoResult.discount_type);
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Missing authorization" }, 401);

      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: repUser }, error: authError } = await anonClient.auth.getUser();
      if (authError || !repUser) return json({ error: "Invalid auth token" }, 401);

      const { data: repRow } = await adminClient
        .from("sales_reps")
        .select("id, is_active")
        .eq("id", repUser.id)
        .maybeSingle();

      if (!repRow?.is_active) return json({ error: "Not an active sales rep" }, 403);
      repUserId = repUser.id;
    }

    // ── 3. Validate body ──
    if (!validateEmail(clientEmail)) return json({ error: "Invalid client email" }, 400);
    if (!businessName || typeof businessName !== "string" || businessName.trim().length < 1 || businessName.length > 255) {
      return json({ error: "Invalid business name" }, 400);
    }
    if (repRestaurantId && !validateUuid(repRestaurantId)) return json({ error: "Invalid repRestaurantId" }, 400);

    const validPlan = planType === "solo" || planType === "venue" ? planType : "venue";
    const config = PLAN_CONFIG[validPlan];
    const protection = !!hasProtection;
    const isPromoFree = promoResult?.discount_type === "free";
    const isPromo50 = promoResult?.discount_type === "50_off";
    const isSolo = validPlan === "solo";

    console.log("[create-rep-onboarding] Client:", clientEmail.substring(0, 3) + "***", "Plan:", validPlan, "Promo:", promoResult?.discount_type || "none");

    // ── 4. Find or invite the client user ──
    let clientUserId: string;

    const { data: existingUsers } = await adminClient.rpc("get_auth_user_by_email", { lookup_email: clientEmail });
    if (existingUsers && existingUsers.length > 0) {
      clientUserId = existingUsers[0].id;
      console.log("[create-rep-onboarding] Existing user found:", clientUserId);
    } else {
      const inviteData: Record<string, unknown> = {};
      if (repUserId) inviteData.invited_by_rep = repUserId;
      if (promoToken) inviteData.invited_via_promo = true;

      const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(clientEmail, {
        data: inviteData,
      });
      if (inviteErr) {
        console.error("[create-rep-onboarding] Invite error:", inviteErr);
        return json({ error: "Failed to create client account: " + inviteErr.message }, 500);
      }
      clientUserId = invited.user.id;
      console.log("[create-rep-onboarding] New user invited:", clientUserId);
    }

    // ── 5. Create record based on plan type ──
    const subscriptionStatus = isPromoFree ? "active" : "trialing";
    const totalTrialDays = isPromoFree ? 0 : config.trialDays;
    const trialEndsAt = isPromoFree ? null : new Date(Date.now() + totalTrialDays * 86400000).toISOString();

    let restaurantId: string | null = null;
    let profileId: string | null = null;

    if (isSolo) {
      // Solo plan → Business Lite (personal_profiles)
      const result = await createSoloProfile(adminClient, {
        clientUserId,
        businessName,
        clientEmail,
        logoUrl,
        googlePlaceId,
        googlePlaceAddress,
        subscriptionStatus,
        trialEndsAt,
      });
      profileId = result.profileId;
    } else {
      // Venue plan → Business Plus (restaurants)
      const result = await createVenueRestaurant(adminClient, {
        clientUserId,
        businessName,
        clientEmail,
        logoUrl,
        googlePlaceId,
        googlePlaceName,
        googlePlaceAddress,
        cardHeadline,
        cardSubHeadline,
        subscriptionStatus,
        trialEndsAt,
        isPromoFree,
        hasProtection: protection,
        validPlan,
      });
      restaurantId = result.restaurantId;
    }

    // ── 6. Rep attribution (only for rep mode with venue) ──
    if (repUserId && repRestaurantId) {
      await adminClient
        .from("rep_restaurants")
        .update({ status: "closing" })
        .eq("id", repRestaurantId)
        .eq("sales_rep_id", repUserId);
    }

    // ── 7. FREE PROMO: skip Stripe, activate immediately ──
    if (isPromoFree && promoResult?.tokenId) {
      // Mark promo token as used
      await adminClient
        .from("promo_tokens")
        .update({ is_used: true, used_by_user_id: clientUserId })
        .eq("id", promoResult.tokenId);

      // Finalize onboarding (only for venue — solo profiles are already active)
      if (!isSolo && restaurantId) {
        try {
          const fnUrl = `${supabaseUrl}/functions/v1/finalize-onboarding`;
          await fetch(fnUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
              "apikey": serviceRoleKey,
            },
            body: JSON.stringify({ restaurantId }),
          });
        } catch (e) {
          console.error("[create-rep-onboarding] Finalize call failed (non-fatal):", e);
        }
      }

      const entityId = isSolo ? profileId : restaurantId;
      console.log("[create-rep-onboarding] FREE promo activated for", isSolo ? "profile" : "restaurant", ":", entityId);
      return json({ success: true, restaurantId, profileId, clientUserId });
    }

    // ── 8. Stripe checkout ──
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

    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
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
        restaurant_id: restaurantId || "",
        profile_id: profileId || "",
        sales_rep_id: repUserId || "",
        rep_restaurant_id: repRestaurantId || "",
        logo_url: logoUrl || "",
        card_headline: cardHeadline || "",
        card_sub_headline: cardSubHeadline || "",
        promo_token: promoToken || "",
      },
    };

    // Apply 50% off coupon if promo token is 50_off
    if (isPromo50) {
      const couponId = await findOrCreate50OffCoupon(stripe);
      checkoutParams.discounts = [{ coupon: couponId }];
      delete checkoutParams.subscription_data;
      console.log("[create-rep-onboarding] Applied 50% off coupon:", couponId);
    }

    const session = await stripe.checkout.sessions.create(checkoutParams);
    console.log("[create-rep-onboarding] Checkout session created:", session.id);

    return json({ url: session.url, restaurantId, profileId, clientUserId });
  } catch (error) {
    console.error("[create-rep-onboarding] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
