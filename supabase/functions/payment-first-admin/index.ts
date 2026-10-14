// Admin-only: retry Card Club activation (idempotent; never creates two subscriptions).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin, cors, getStripe, json, userFromRequest } from "../_shared/paymentFirst.ts";
import { ensureCardClubSubscription, syncMembership } from "../_shared/paymentFirstActivation.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const user = await userFromRequest(req);
  if (!user) return json({ error: "Please sign in." }, 401);
  const db = admin();
  const { data: roles } = await db.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
  if (!roles?.length && user.email !== "tap@tapaway.co") return json({ error: "Admins only." }, 403);
  const body = await req.json().catch(() => ({}));
  if (body.action !== "retry_card_club" || typeof body.membershipId !== "string") return json({ error: "Invalid request." }, 400);
  const stripe = getStripe();
  const m = await ensureCardClubSubscription(stripe, db, body.membershipId);
  const { data: fresh } = await db.from("card_club_memberships").select("*").eq("id", body.membershipId).single();
  if (fresh?.card_club_stripe_subscription_id) await syncMembership(stripe, db, fresh);
  const { data } = await db.from("card_club_memberships").select("status, card_club_stripe_subscription_id, review_reason").eq("id", body.membershipId).single();
  await db.from("admin_audit_log").insert({ admin_user_id: user.id, action: "retry_card_club", target_type: "card_club_membership", target_id: body.membershipId, details: { result: data?.status, had_sub: !!m?.card_club_stripe_subscription_id } });
  return json(data);
});
