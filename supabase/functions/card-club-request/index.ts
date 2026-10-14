// Card Club replacement request. All eligibility and quantity are decided server-side.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin, cors, json, userFromRequest } from "../_shared/paymentFirst.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const user = await userFromRequest(req);
  if (!user) return json({ error: "Please sign in." }, 401);
  try {
    const body = await req.json().catch(() => ({}));
    const key = typeof body.idempotencyKey === "string" && /^[A-Za-z0-9-]{8,80}$/.test(body.idempotencyKey) ? body.idempotencyKey : null;
    if (!key) return json({ error: "Invalid request." }, 400);
    const db = admin();
    const { data: m } = await db.from("card_club_memberships").select("id, user_id, checkout_intent_id")
      .eq("user_id", user.id).in("status", ["active", "past_due", "pending_activation"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!m) return json({ error: "Card Club isn't active on this account." }, 403);
    const { data: s } = await db.from("onboarding_sessions").select("shipping_address").eq("checkout_intent_id", m.checkout_intent_id).maybeSingle();
    const note = typeof body.designNote === "string" ? body.designNote : "";
    const { data, error } = await db.rpc("card_club_redeem", { _membership_id: m.id, _address: s?.shipping_address ?? null, _design_note: note, _idempotency_key: `${user.id}-${key}` });
    if (error) throw error;
    if (!data?.ok) {
      const msg = data?.reason === "not_yet_eligible" ? "Your next batch isn't available yet."
        : data?.reason === "missing_address" ? "Add a shipping address first." : "Card Club isn't active right now.";
      return json({ error: msg, reason: data?.reason, nextEligibleAt: data?.next_eligible_at ?? null }, 409);
    }
    return json(data);
  } catch (e) {
    console.error("[card-club-request] failed", e instanceof Error ? e.message : e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
