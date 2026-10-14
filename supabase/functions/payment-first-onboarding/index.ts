// Post-purchase onboarding for signed-in customers. Also finalizes purchases that were
// waiting for an existing account owner to confirm their email.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin, cors, json, userFromRequest } from "../_shared/paymentFirst.ts";

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const user = await userFromRequest(req);
  if (!user?.email) return json({ error: "Please sign in." }, 401);
  const db = admin();
  const email = user.email.toLowerCase();
  try {
    // Signing in through the emailed link proves ownership of this email.
    const { data: pending } = await db.from("checkout_intents").select("id, stripe_customer_id")
      .eq("email", email).eq("status", "pending_association");
    for (const p of pending ?? []) {
      const { data: other } = await db.from("checkout_intents").select("user_id")
        .eq("stripe_customer_id", p.stripe_customer_id).not("user_id", "is", null).neq("user_id", user.id).limit(1);
      if (other?.length) {
        await db.from("checkout_intents").update({ status: "needs_review", review_reason: "Stripe customer linked to a different account" }).eq("id", p.id);
        continue;
      }
      await db.from("checkout_intents").update({ status: "associated", user_id: user.id }).eq("id", p.id).eq("status", "pending_association");
      await db.from("onboarding_sessions").update({ user_id: user.id }).eq("checkout_intent_id", p.id);
      await db.from("card_club_memberships").update({ user_id: user.id }).eq("checkout_intent_id", p.id);
      await db.from("fulfillment_orders").update({ user_id: user.id }).eq("checkout_intent_id", p.id);
    }

    const { data: session } = await db.from("onboarding_sessions").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    const body = await req.json().catch(() => ({}));
    const action = str(body.action, 20) || "state";

    if (!session) return json({ session: null, needsReview: (pending ?? []).length > 0 });
    const { data: intent } = await db.from("checkout_intents").select("plan, billing_interval, card_quantity, card_club_selected").eq("id", session.checkout_intent_id).single();
    const { data: club } = await db.from("card_club_memberships").select("id,status,plan,card_club_paid_at,last_approved_at,total_redemptions,declined_at")
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
    // Draft hub: reuse the existing Solo/Pro hub model (personal_profiles), unapproved so it never shows publicly.
    if (action === "business" && patch && !session.personal_profile_id && intent) {
      const name = String(patch.business_name || "My Business");
      const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "business";
      let username = base;
      for (let i = 0; i < 20; i++) {
        const { data: ok } = await db.rpc("is_username_available", { check_username: username });
        if (ok) break;
        username = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
      }
      const { data: prof, error: pErr } = await db.from("personal_profiles").insert({
        user_id: user.id, username, full_name: name, email, onboarding_source: "payment_first",
        plan_type: intent.billing_interval === "year" ? `${intent.plan}_yearly` : intent.plan,
        subscription_status: "trialing", is_approved: false, pipeline_status: "draft",
        stripe_customer_id: (await db.from("checkout_intents").select("stripe_customer_id").eq("id", session.checkout_intent_id).single()).data?.stripe_customer_id ?? null,
        stripe_subscription_id: session.stripe_subscription_id, legacy_allowance: false,
      }).select("id").single();
      if (pErr) console.error("[payment-first-onboarding] draft hub failed", pErr.message);
      if (prof) {
        patch.personal_profile_id = prof.id;
        patch.hub_status = "draft";
        if (session.fulfillment_order_id) await db.from("fulfillment_orders").update({ personal_profile_id: prof.id }).eq("id", session.fulfillment_order_id);
      }
    }
    let current = session;
    if (patch) {
      const { data } = await db.from("onboarding_sessions").update(patch).eq("id", session.id).select("*").single();
      current = data ?? session;
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
    return json({ session: current, intent, club, entitlement, reprintPriceCents: settings?.reprint_price_cents ?? null, redemption });
  } catch (e) {
    console.error("[payment-first-onboarding] failed", e instanceof Error ? e.message : e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
