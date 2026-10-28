// Post-purchase onboarding for signed-in customers. Also finalizes purchases that were
// waiting for an existing account owner to confirm their email.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin, cors, json, userFromRequest, getStripe, stripeMode } from "../_shared/paymentFirst.ts";
import { ensureDraftProfile, syncBusinessSubscription } from "../_shared/paymentFirstActivation.ts";
import { readAccessBody } from "../_shared/accountAccess.ts";
import { takeQuota } from "../_shared/storefrontRateLimit.ts";

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await readAccessBody(req).catch(() => null);
  if (!body) return json({ error: "Invalid setup request." }, 400);
  const action = str(body.action, 20) || "state";
  if (!["state", "business", "logo", "shipping"].includes(action)) return json({ error: "Invalid setup action." }, 400);
  const user = await userFromRequest(req);
  if (!user?.email) return json({ error: "Please sign in." }, 401);
  if (!user.email_confirmed_at) return json({ error: "Confirm your email before connecting this purchase.", requiresEmailVerification: true }, 403);
  const db = admin();
  const email = user.email.toLowerCase();
  try {
    if (await takeQuota(req, "payment-first-setup", 300, user.id) < 0) return json({ error: "Please try again later or contact tap@tapaway.co." }, 429);
    // Signing in through the emailed link proves ownership of this email.
    const { data: pending, error: pendingError } = await db.from("checkout_intents").select("id, user_id, stripe_customer_id, stripe_subscription_id")
      .eq("email", email).eq("status", "pending_association").not("activated_at", "is", null).is("payment_hold_at", null).eq("stripe_livemode", stripeMode() === "live");
    if (pendingError) throw pendingError;
    for (const p of pending ?? []) {
      const { data: other, error: ownerError } = await db.from("checkout_intents").select("user_id")
        .eq("stripe_customer_id", p.stripe_customer_id).not("user_id", "is", null).neq("user_id", user.id).limit(1);
      if (ownerError) throw ownerError;
      if (other?.length || (p.user_id && p.user_id !== user.id)) {
        const review = await db.from("checkout_intents").update({ status: "needs_review", review_reason: "Stripe customer linked to a different account" }).eq("id", p.id).eq("status", "pending_association");
        if (review.error) throw review.error;
        continue;
      }
      const linked = await db.from("onboarding_sessions").update({ user_id: user.id }).eq("checkout_intent_id", p.id)
        .or(`user_id.is.null,user_id.eq.${user.id}`).select("id");
      if (linked.error || !linked.data?.length) throw linked.error || new Error("Setup ownership requires review");
      const clubLinked = await db.from("card_club_memberships").update({ user_id: user.id }).eq("checkout_intent_id", p.id)
        .or(`user_id.is.null,user_id.eq.${user.id}`);
      if (clubLinked.error) throw clubLinked.error;
      const profileId = await ensureDraftProfile(db, p.id, user.id);
      if (!profileId) throw new Error("Draft setup missing");
      if (p.stripe_subscription_id) await syncBusinessSubscription(getStripe(), p.stripe_subscription_id);
      // Mark associated last so an interrupted attempt repairs its missing
      // setup rows on retry instead of disappearing from the pending queue.
      const attached = await db.from("checkout_intents").update({ status: "associated", user_id: user.id })
        .eq("id", p.id).eq("status", "pending_association").or(`user_id.is.null,user_id.eq.${user.id}`);
      if (attached.error) throw attached.error;
    }

    let sessionQuery = db.from("onboarding_sessions").select("*").eq("user_id", user.id);
    if (typeof body.profileId === "string") sessionQuery = sessionQuery.eq("personal_profile_id", body.profileId);
    const { data: session, error: sessionError } = await sessionQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (sessionError) throw sessionError;

    if (!session) return json({ session: null, needsReview: (pending ?? []).length > 0 });
    const { data: intent } = await db.from("checkout_intents").select("plan, billing_interval, card_quantity, card_club_selected").eq("id", session.checkout_intent_id).single();
    const { data: club } = await db.from("card_club_memberships").select("id,status,plan,card_club_paid_at,last_approved_at,total_redemptions,declined_at,card_club_stripe_subscription_id,main_stripe_subscription_id")
      .eq("checkout_intent_id", session.checkout_intent_id).maybeSingle();

    let patch: Record<string, unknown> | null = null;
    if (action === "business") {
      if (body.notFound) {
        const name = str(body.businessName, 120), city = str(body.city, 80);
        if (!name || !city) return json({ error: "Business name and city are required." }, 400);
        patch = { business_name: name, business_city: city, business_link: str(body.link, 300) || null, google_place_id: null,
          needs_research: true, setup_status: "needs_business_research", step: "logo" };
      } else {
        const placeId = str(body.placeId, 300);
        if (!placeId) return json({ error: "Choose your business." }, 400);
        patch = { google_place_id: placeId, business_name: str(body.businessName, 120), business_address: str(body.address, 300),
          needs_research: false, setup_status: "business_identified", step: "logo" };
      }
    } else if (action === "logo") {
      const url = str(body.logoUrl, 600);
      const base = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/restaurant-logos/${user.id}/`;
      if (url && !url.startsWith(base)) return json({ error: "Invalid logo." }, 400);
      patch = { logo_url: url || null, logo_skipped: !url, step: "shipping" };
    } else if (action === "shipping") {
      const a = body.address && typeof body.address === "object" ? body.address : null;
      const shipping = a ? { name: str(a.name, 120), line1: str(a.line1), line2: str(a.line2) || null, city: str(a.city, 80),
        state: str(a.state, 40), postal_code: str(a.postal_code, 20), country: "US" } : session.shipping_address;
      if (!shipping?.line1 || !shipping?.city || !shipping?.postal_code) return json({ error: "Add a complete shipping address." }, 400);
      patch = { shipping_address: shipping, shipping_confirmed_at: new Date().toISOString(), step: "done",
        completed_at: session.completed_at ?? new Date().toISOString() };
    }
    if (action === "business" && patch) {
      await ensureDraftProfile(db, session.checkout_intent_id, user.id, String(patch.business_name || ""));
      if (patch.google_place_id) {
        const { data: sp } = await db.from("onboarding_sessions").select("personal_profile_id").eq("id", session.id).single();
        if (sp?.personal_profile_id) await db.from("personal_profiles").update({ google_place_id: patch.google_place_id, formatted_address: patch.business_address || null }).eq("id", sp.personal_profile_id).eq("is_approved", false);
      }
    }
    let current = session;
    if (patch) {
      const { data, error } = await db.from("onboarding_sessions").update(patch).eq("id", session.id).select("*").single();
      if (error || !data) throw error || new Error("Setup was not saved");
      current = data;
    }
    let entitlement = null;
    if (club && club.status !== "declined") {
      const { data } = await db.rpc("card_club_entitlement", { _membership_id: club.id });
      entitlement = Array.isArray(data) ? data[0] : data;
    }
    let redemption = null;
    if (club) {
      const { data } = await db.from("card_club_redemptions").select("id,status,requested_at,approved_at,shipped_at,tracking_number")
        .eq("membership_id", club.id).order("requested_at", { ascending: false }).limit(1).maybeSingle();
      redemption = data;
    }
    const { data: settings } = await db.from("app_settings").select("reprint_price_cents").limit(1).maybeSingle();
    const clubWithBilling = club ? { ...club, billingWithPlan: !!club.card_club_stripe_subscription_id && club.card_club_stripe_subscription_id === club.main_stripe_subscription_id, billingInterval: club.card_club_stripe_subscription_id === club.main_stripe_subscription_id ? intent?.billing_interval || "month" : "month" } : null;
    return json({ session: current, intent, club: clubWithBilling, entitlement, reprintPriceCents: settings?.reprint_price_cents ?? null, redemption });
  } catch (e) {
    console.error("[payment-first-onboarding] failed", e instanceof Error ? e.message : e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
