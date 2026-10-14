// Public checkout for payment-first onboarding. No TapAway account needed.
// The browser sends only plan, interval and Card Club yes/no; the server picks prices.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rateLimit.ts";
import {
  admin, CARD_QUANTITY, cors, frontendUrl, getStripe, json, ONBOARDING_VERSION, stripeMode, TRIAL_DAYS, verifiedPrice,
  type Interval, type Plan,
} from "../_shared/paymentFirst.ts";

const ATTR_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "src", "via", "landing_path"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!checkRateLimit(getRateLimitKey(req, "payment-first-checkout"), 20, 60 * 60 * 1000)) return rateLimitResponse(cors);
  try {
    const body = await req.json().catch(() => ({}));
    const plan = body.plan as Plan;
    const interval = body.interval as Interval;
    if (plan !== "solo" && plan !== "venue") return json({ error: "Invalid plan selection." }, 400);
    if (interval !== "month" && interval !== "year") return json({ error: "Invalid billing selection." }, 400);
    if (typeof body.cardClub !== "boolean") return json({ error: "Please choose whether to add Card Club." }, 400);
    const cardClub = body.cardClub as boolean;
    const raw = body.attribution && typeof body.attribution === "object" ? body.attribution : {};
    const attribution: Record<string, string> = {};
    for (const k of ATTR_KEYS) if (typeof raw[k] === "string" && raw[k]) attribution[k] = raw[k].slice(0, 250);
    const trybe = typeof body.trybeVisitorId === "string" && body.trybeVisitorId.length <= 128 ? body.trybeVisitorId : "";

    const stripe = getStripe();
    let main, club = null;
    try {
      main = await verifiedPrice(stripe, `${plan}_${interval}`);
      if (cardClub) club = await verifiedPrice(stripe, "card_club");
    } catch (e) {
      console.error("[payment-first-checkout] catalog unavailable", e instanceof Error ? e.message : e);
      return json({ error: interval === "year" ? "Yearly is temporarily unavailable. Monthly is still available." : "Checkout is temporarily unavailable. Please try again shortly." }, 503);
    }

    const db = admin();
    const { data: intent, error } = await db.from("checkout_intents").insert({
      plan, billing_interval: interval, card_quantity: CARD_QUANTITY[plan], main_price_id: main.id,
      card_club_selected: cardClub, card_club_price_id: club?.id ?? null, onboarding_version: ONBOARDING_VERSION,
      checkout_source: typeof body.source === "string" ? body.source.slice(0, 60) : "onboarding", attribution,
    }).select("id").single();
    if (error || !intent) throw new Error(`intent insert failed: ${error?.message}`);

    const meta: Record<string, string> = {
      checkout_intent_id: intent.id, onboarding_version: ONBOARDING_VERSION, onboarding_catalog: "true",
      selected_plan: plan, plan_type: interval === "year" ? `${plan}_yearly` : plan, card_quantity: String(CARD_QUANTITY[plan]),
      billing_cycle: interval, billing_interval: interval, main_price_id: main.id,
      card_club_selected: String(cardClub), card_club_price_id: club?.id ?? "", checkout_source: "payment_first",
      ...(trybe ? { trybe_visitor_id: trybe } : {}), ...attribution,
    };
    const qty = CARD_QUANTITY[plan];
    const total = `$${main.amount / 100}/${interval}`;
    const clubText = cardClub
      ? ` TapAway Card Club is a separate recurring charge of $5/month that also starts after your ${TRIAL_DAYS}-day trial and renews monthly until canceled.`
      : "";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: main.id, quantity: 1 }],
      success_url: `${frontendUrl()}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl()}/onboarding?plan=${plan}&cycle=${interval}&canceled=1`,
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: true },
      payment_method_collection: "always",
      allow_promotion_codes: false,
      subscription_data: { trial_period_days: TRIAL_DAYS, metadata: meta, description: `TapAway ${qty} Cards` },
      metadata: meta,
      client_reference_id: intent.id,
      custom_text: {
        submit: {
          message: `TapAway ${qty} Cards: ${TRIAL_DAYS} days free, then ${total}, renewing ${interval === "year" ? "yearly" : "monthly"} until canceled.${clubText} Cancel before the trial ends to avoid the first charge. Terms: https://tapaway.co/terms Refunds: https://tapaway.co/refund`,
        },
      },
    });
    await db.from("checkout_intents").update({ stripe_checkout_session_id: session.id, status: "checkout_started" }).eq("id", intent.id);
    return json({ url: session.url, mode: stripeMode() });
  } catch (e) {
    console.error("[payment-first-checkout] failed", e instanceof Error ? e.message : e);
    return json({ error: "Checkout is temporarily unavailable. Please try again shortly." }, 500);
  }
});
