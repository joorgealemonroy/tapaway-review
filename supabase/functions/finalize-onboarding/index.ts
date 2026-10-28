import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { renderTemplate, sendEmailAndLog } from "../_shared/email.ts";
import { escapeHtml } from "../_shared/sanitize.ts";
import { readLimitedText } from "../_shared/requestBody.ts";
import { takeQuota } from "../_shared/storefrontRateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const idOf = (value: string | { id: string } | null | undefined) => typeof value === "string" ? value : value?.id;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ success: false, error: "Sign in required" }, 401);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await db.auth.getUser(authorization.slice(7));
    if (authError || !user?.email_confirmed_at || !user.email) return json({ success: false, error: "Verified sign-in required" }, 401);
    if (await takeQuota(req, "finalize-onboarding", 10, user.id) < 0) return json({ success: false, error: "Please try again later." }, 429);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(await readLimitedText(req, 4096));
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    } catch { return json({ success: false, error: "Invalid request" }, 400); }
    if (body.restaurantId && (typeof body.restaurantId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.restaurantId))) return json({ success: false, error: "Invalid account" }, 400);
    let query = db.from("restaurants").select("id,restaurant_name,custom_slug,owner_name,plan_type,stripe_customer_id,stripe_subscription_id,subscription_status,card_check_status,payment_state").eq("owner_id", user.id);
    if (body.restaurantId) query = query.eq("id", body.restaurantId);
    const { data: restaurant, error: restaurantError } = await query.maybeSingle();
    if (restaurantError || !restaurant) return json({ success: false, error: "Account not found" }, 404);

    // A customer ID or a client-completed onboarding flag does not prove payment.
    // Free promotions grant only the authorized hub entitlement, not free cards.
    if (!restaurant.stripe_subscription_id || !restaurant.stripe_customer_id) return json({ success: false, error: "Your order is still being confirmed. Check again shortly." }, 409);
    const key = Deno.env.get("STRIPE_SECRET_KEY");
    if (!key) return json({ success: false, error: "Order verification is temporarily unavailable." }, 503);
    const stripe = new Stripe(key, { apiVersion: "2023-10-16" });
    const subscription = await stripe.subscriptions.retrieve(restaurant.stripe_subscription_id, { expand: ["latest_invoice"] });
    const invoice = typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null;
    const paid = subscription.status === "active" && invoice?.paid === true && invoice.status === "paid";
    const verifiedTrial = subscription.status === "trialing" && restaurant.card_check_status === "passed" && (subscription.trial_end || 0) * 1000 > Date.now();
    if (!subscription.livemode || idOf(subscription.customer) !== restaurant.stripe_customer_id || (!paid && !verifiedTrial)) return json({ success: false, error: "Complete payment or card verification before preparing your order." }, 409);

    // The verified checkout/webhook creates the order. Never fabricate one from
    // customer details, which previously allowed unpaid users to enter printing.
    const { data: order, error: orderError } = await db.from("fulfillment_orders").select("*")
      .eq("restaurant_id", restaurant.id).eq("user_id", user.id)
      .eq("stripe_subscription_id", subscription.id).eq("stripe_customer_id", restaurant.stripe_customer_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (orderError) throw orderError;
    if (!order) return json({ success: false, error: "Your order is still being prepared. Check again shortly; you do not need to pay again." }, 409);
    if (!["awaiting_onboarding", "created", "pending"].includes(order.status)) return json({ success: true, fulfillmentUpdated: false, alreadyFinalized: true });
    const { error: updateError } = await db.from("fulfillment_orders").update({ status: "pending" }).eq("id", order.id).in("status", ["awaiting_onboarding", "created"]);
    if (updateError) throw updateError;

    const emailFrom = Deno.env.get("EMAIL_FROM") || "TapAway <no-reply@tapaway.co>";
    const welcomeKey = paid ? "welcome_paid" : "welcome";
    const hubUrl = `https://tapaway.co/${encodeURIComponent(restaurant.custom_slug || "")}`;
    const rendered = renderTemplate(welcomeKey, { name: restaurant.owner_name || "there", businessName: restaurant.restaurant_name, hubUrl, dashboardUrl: "https://tapaway.co/dashboard" });
    // Correlation plus provider idempotency protects refreshes and concurrent
    // retries, while a failed delivery remains retryable.
    const sendOnce = async (templateKey: string, opts: Parameters<typeof sendEmailAndLog>[0]) => {
      const { data: sent, error } = await db.from("email_sends").select("id").eq("profile_id", order.id).eq("template_key", templateKey).eq("status", "sent").limit(1);
      if (error) throw error;
      if (sent?.length) return true;
      return (await sendEmailAndLog({ ...opts, templateKey, profileId: order.id, idempotencyKey: `finalize:${order.id}:${templateKey}` })).ok;
    };
    const customerEmailSent = await sendOnce(welcomeKey, { to: user.email, from: emailFrom, templateKey: welcomeKey, subject: rendered.subject, html: rendered.html, text: rendered.text });
    const hasShippingAddress = !!(order.shipping_address_line1 && order.shipping_city && order.shipping_postal_code);
    const shipping = [order.shipping_name, order.shipping_address_line1, order.shipping_address_line2, [order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(", "), order.shipping_country].filter(Boolean).map(value => escapeHtml(String(value))).join("<br>");
    const internalEmailSent = await sendOnce("internal_order", {
      to: Deno.env.get("EMAIL_INTERNAL") || "tap@tapaway.co", from: emailFrom, templateKey: "internal_order",
      subject: `TapAway order ${order.id} — ${hasShippingAddress ? "ready for review" : "shipping address needed"}`,
      html: `<div style="font-family:Arial,sans-serif;color:#173b2d;max-width:600px;margin:auto;padding:28px;background:#f7f7ef"><h1>Order ready for review</h1><p><strong>${escapeHtml(restaurant.restaurant_name)}</strong></p><p>${escapeHtml(String(order.quantity))} cards · ${escapeHtml(order.plan)}</p><p>Owner: ${escapeHtml(user.email)}</p><p>${shipping || "Contact the owner for their shipping address."}</p><p><a href="https://tapaway.co/admin">Review in TapAway</a></p></div>`,
    });
    if (!customerEmailSent || !internalEmailSent) return json({ success: false, fulfillmentUpdated: true, error: "Your order is saved. We could not send all confirmations yet; please check again shortly." }, 503);
    return json({ success: true, fulfillmentUpdated: true, customerEmailSent, internalEmailSent, hasShippingAddress });
  } catch {
    console.error("[finalize-onboarding] Unable to finalize verified order");
    return json({ success: false, error: "We couldn't confirm your order right now. Please try again." }, 503);
  }
});
