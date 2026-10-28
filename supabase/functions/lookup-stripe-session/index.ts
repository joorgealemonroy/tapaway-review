// Legacy return-page compatibility. This endpoint only reads an order already
// attached to the verified caller; provisioning belongs to signed webhooks.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin, getStripe, stripeMode } from "../_shared/paymentFirst.ts";
import { requireUser } from "../_shared/security.ts";
import { readAccessBody } from "../_shared/accountAccess.ts";
import { takeQuota } from "../_shared/storefrontRateLimit.ts";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const ref = (value: any) => typeof value === "string" ? value : value?.id || null;
serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);
  try {
    const body = await readAccessBody(req).catch(() => null);
    if (!body || typeof body.sessionId !== "string" || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(body.sessionId)) return json({ success: false, error: "Invalid checkout link." }, 400);
    const auth = await requireUser(req);
    if (!auth?.user?.email_confirmed_at) return json({ success: false, requiresEmailVerification: true,
      error: "Check your inbox or sign in to access your account." }, 401);
    if (await takeQuota(req, "legacy-checkout-status", 60, auth.user.id) < 0) return json({ success: false, error: "Please try again later." }, 429);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(body.sessionId);
    if (session.livemode !== (stripeMode() === "live") || session.status !== "complete" || !ref(session.subscription)) return json({ success: false, error: "Checkout is not ready.", needsRetry: true }, 409);
    const { data: restaurant, error } = await admin().from("restaurants")
      .select("id,plan_type,onboarding_step,onboarding_completed,stripe_customer_id")
      .eq("owner_id", auth.user.id).eq("stripe_subscription_id", ref(session.subscription)).maybeSingle();
    if (error) throw error;
    if (!restaurant || restaurant.stripe_customer_id !== ref(session.customer)) return json({ success: false, error: "Your purchase is being connected. Use your email sign-in link or contact tap@tapaway.co.", needsRetry: true }, 409);
    return json({ success: true, restaurantId: restaurant.id, userId: auth.user.id,
      email: auth.user.email, isNewUser: false, mustSetPassword: false,
      onboardingStep: restaurant.onboarding_step || 1, onboardingCompleted: !!restaurant.onboarding_completed,
      planType: restaurant.plan_type });
  } catch {
    return json({ success: false, error: "We could not check this purchase. Please try again." }, 503);
  }
});
