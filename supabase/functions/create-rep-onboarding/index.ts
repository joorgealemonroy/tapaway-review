import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { resolveOnboardingPrice } from "../_shared/onboardingCatalog.ts";
import { readLimitedText } from "../_shared/requestBody.ts";
import { takeQuota } from "../_shared/storefrontRateLimit.ts";

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

class OnboardingConflict extends Error {}

function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  if (email.length > 255) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUuid(v: string | undefined): boolean {
  if (!v) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
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
    throw new OnboardingConflict("An account already exists. Ask the owner to sign in to manage billing.");
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

    // Owner-claim path always defaults to TapAway Solo (premium layout on from day one).
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
    throw new OnboardingConflict("An account already exists. Ask the owner to sign in to manage billing.");
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

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // ── 1. Parse body ──
    let body: Record<string, any>;
    try {
      body = JSON.parse(await readLimitedText(req, 16384));
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    } catch { return json({ error: "Invalid request" }, 400); }
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
      billingInterval,
    } = body;

    // A promotion is not proof of account ownership or a sales-rep identity.
    // Owners redeem promotions after email verification through the normal
    // onboarding flow; this endpoint is reserved for verified staff.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user: repUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !repUser?.email_confirmed_at) return json({ error: "Verified sign-in required" }, 401);
    const [{ data: repRow }, { data: isAdmin }] = await Promise.all([
      adminClient.from("sales_reps").select("id,is_active").eq("id", repUser.id).maybeSingle(),
      userClient.rpc("is_admin"),
    ]);
    if (!repRow?.is_active && isAdmin !== true) return json({ error: "Staff access required" }, 403);
    if (promoToken) return json({ error: "Ask the owner to open their promotion link and verify their email to redeem it." }, 400);
    const repUserId = repUser.id;
    if (await takeQuota(req, "rep-onboarding", 30, repUserId) < 0) return json({ error: "Please try again later." }, 429);

    // ── 3. Validate body ──
    if (!validateEmail(clientEmail)) return json({ error: "Invalid client email" }, 400);
    if (!businessName || typeof businessName !== "string" || businessName.trim().length < 1 || businessName.length > 255) {
      return json({ error: "Invalid business name" }, 400);
    }
    if (repRestaurantId && !validateUuid(repRestaurantId)) return json({ error: "Invalid repRestaurantId" }, 400);

    if (planType !== "solo" && planType !== "venue") return json({ error: "Invalid plan" }, 400);
    const validPlan = planType;
    const interval = billingInterval === "year" ? "year" : "month";
    if (hasProtection) return json({ error: "This add-on is no longer available through this checkout." }, 400);
    const isSolo = validPlan === "solo";
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) return json({ error: "Checkout is temporarily unavailable." }, 503);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    let price;
    try { price = await resolveOnboardingPrice(stripe, validPlan, interval, true); }
    catch { return json({ error: "Checkout is temporarily unavailable. Please try again later." }, 503); }
    if (repRestaurantId && repRow?.is_active) {
      const { data: prospect } = await adminClient.from("rep_restaurants").select("id").eq("id", repRestaurantId).eq("sales_rep_id", repUserId).maybeSingle();
      if (!prospect) return json({ error: "Prospect not found" }, 404);
    }

    // ── 4. Find or invite the client user ──
    let clientUserId: string;

    const { data: existingUsers } = await adminClient.rpc("get_auth_user_by_email", { lookup_email: clientEmail });
    if (existingUsers && existingUsers.length > 0) {
      clientUserId = existingUsers[0].id;
      console.log("[create-rep-onboarding] Existing user found:", clientUserId);
    } else {
      const inviteData: Record<string, unknown> = {};
      if (repUserId) inviteData.invited_by_rep = repUserId;

      const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(clientEmail, {
        data: inviteData,
      });
      if (inviteErr) {
        console.error("[create-rep-onboarding] Invite error:", inviteErr);
        return json({ error: "We could not prepare the account. Please try again later." }, 503);
      }
      clientUserId = invited.user.id;
      console.log("[create-rep-onboarding] New user invited:", clientUserId);
    }

    // ── 5. Create record based on plan type ──
    // Payment and card verification must finish before any public entitlement.
    const subscriptionStatus = "pending_payment";
    const trialEndsAt = null;

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
        isPromoFree: false,
        hasProtection: false,
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

    // Use the verified existing catalog, never create new prices/products.
    const frontendUrl = "https://tapaway.co";

    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: price.priceId, quantity: 1 }],
      customer_email: clientEmail,
      success_url: `${frontendUrl}/rep-checkout-success?status=success`,
      cancel_url: `${frontendUrl}/onboarding?rep=true`,
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: ["US", "CA", "MX"] },
      subscription_data: { trial_period_days: price.trialDays },
      metadata: {
        plan_type: validPlan,
        has_protection: "false",
        billing_interval: interval,
        user_id: clientUserId,
        restaurant_id: restaurantId || "",
        profile_id: profileId || "",
        sales_rep_id: repUserId || "",
        rep_restaurant_id: repRestaurantId || "",
        logo_url: logoUrl || "",
        card_headline: cardHeadline || "",
        card_sub_headline: cardSubHeadline || "",

      },
    };

    const session = await stripe.checkout.sessions.create(checkoutParams);
    console.log("[create-rep-onboarding] Checkout session created:", session.id);

    return json({ url: session.url, restaurantId, profileId, clientUserId });
  } catch (error) {
    if (error instanceof OnboardingConflict) return json({ error: error.message }, 409);
    console.error("[create-rep-onboarding] Unable to prepare checkout");
    return json({ error: "We could not prepare checkout. Please try again or contact TapAway." }, 503);
  }
});
