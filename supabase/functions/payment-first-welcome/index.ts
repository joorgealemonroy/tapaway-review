import { takeQuota } from "../_shared/storefrontRateLimit.ts";
import { allowAccessEmail, normalizedEmail, readAccessBody } from "../_shared/accountAccess.ts";
// /welcome return from Stripe. Verifies the session server-side.
// New account from this purchase: one short-lived sign-in token, issued once, within 2 hours.
// Existing account: never signs in; ownership must be confirmed through the emailed link.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";
import { admin, cors, getStripe, json, ONBOARDING_VERSION, sendWelcomeLink } from "../_shared/paymentFirst.ts";
import { activateCheckout } from "../_shared/paymentFirstActivation.ts";

const maskEmail = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!checkRateLimit(getRateLimitKey(req, "payment-first-welcome"), 30, 60 * 60 * 1000)) return rateLimitResponse(cors);
  try {
    if (await takeQuota(req, "payment-first-welcome", 30) < 0) return json({ error: "Too many requests. Please try later or contact tap@tapaway.co." }, 429);
    const body = await readAccessBody(req).catch(() => null);
    if (!body) return json({ error: "Invalid request." }, 400);
    const db = admin();

    // Signed-out "email me a link": only for emails with a payment-first order.
    if (body.action === "send_link") {
      const email = normalizedEmail(body.email);
      if (!email) return json({ error: "Enter a valid email." }, 400);
      // Resends share the same durable budget as verification codes and account
      // recovery. Initial paid-order delivery keeps its existing retry lease.
      if (!await allowAccessEmail(req, email)) return json({ ok: true });
      const { data } = await db.from("checkout_intents").select("id").eq("email", email).in("status", ["associated", "pending_association"]).limit(1);
      if (data?.length && !(await sendWelcomeLink(email, "login"))) console.error("[payment-first-welcome] Sign-in email unavailable");
      return json({ ok: true }); // Same answer either way.
    }

    const sessionId = typeof body.session_id === "string" ? body.session_id : "";
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return json({ error: "Invalid session." }, 400);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.onboarding_version !== ONBOARDING_VERSION) return json({ error: "Invalid session." }, 400);
    if (session.status !== "complete") return json({ status: "not_paid" });
    await activateCheckout(stripe, session); // no-op when the webhook already ran

    const { data: intent } = await db.from("checkout_intents").select("*").eq("stripe_checkout_session_id", sessionId).maybeSingle();
    if (!intent) return json({ status: "processing" });
    const emailHint = intent.email ? maskEmail(intent.email) : null;
    if (intent.status === "pending_association" || intent.status === "needs_review") return json({ status: "verify_email", emailHint });
    if (intent.status !== "associated") return json({ status: "processing" });

    const fresh = intent.paid_at && Date.now() - new Date(intent.paid_at).getTime() < 2 * 60 * 60 * 1000;
    if (!intent.user_created_by_purchase || !fresh || intent.welcome_session_issued_at) return json({ status: "sign_in", emailHint });
    const { data: claimed } = await db.from("checkout_intents").update({ welcome_session_issued_at: new Date().toISOString() })
      .eq("id", intent.id).is("welcome_session_issued_at", null).select("id");
    if (!claimed?.length) return json({ status: "sign_in", emailHint });
    const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email: intent.email });
    if (error || !link?.properties?.hashed_token) return json({ status: "sign_in", emailHint });
    return json({ status: "ready", token_hash: link.properties.hashed_token, emailHint });
  } catch (e) {
    console.error("[payment-first-welcome] failed", e instanceof Error ? e.message : e);
    return json({ error: "Something went wrong. Please refresh." }, 500);
  }
});
