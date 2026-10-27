import { hashValue, takeQuota } from "../_shared/storefrontRateLimit.ts";
import { readLimitedText } from "../_shared/requestBody.ts";
// Public checkout for payment-first onboarding. No TapAway account needed.
// The browser sends only plan, interval and Card Club yes/no; the server picks prices.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from "../_shared/rateLimit.ts";
import {
  paymentFirstAllowed,
  admin,
  CARD_QUANTITY,
  cors,
  frontendUrl,
  getStripe,
  json,
  ONBOARDING_VERSION,
  stripeMode,
  TRIAL_DAYS,
  verifiedPrice,
  type Interval,
  type Plan,
} from "../_shared/paymentFirst.ts";

const ATTR_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "src",
  "via",
  "landing_path",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await paymentFirstAllowed(req)))
    return json({ error: "Not available." }, 404);
  if (
    !checkRateLimit(
      getRateLimitKey(req, "payment-first-checkout"),
      20,
      60 * 60 * 1000,
    )
  )
    return rateLimitResponse(cors);
  try {
    if (await takeQuota(req, "payment-first-checkout", 20) < 0) return json({ error: "Too many requests. Please try later or contact tap@tapaway.co." }, 429);
    let body;
    try { body = JSON.parse(await readLimitedText(req, 16384)); }
    catch { return json({ error: "Invalid checkout request." }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid checkout request." }, 400);
    if (body.checkoutAttemptId != null && (typeof body.checkoutAttemptId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.checkoutAttemptId))) return json({ error: "Refresh checkout and try again." }, 400);
    if (body.checkoutVersion != null && body.checkoutVersion !== 2)
      return json(
        { error: "Checkout has been updated. Refresh the page and try again." },
        409,
      );
    // The published storefront still sends no version. Preserve its existing billing contract until it is replaced.
    const combined = body.checkoutVersion === 2;
    const plan = body.plan as Plan;
    const interval = body.interval as Interval;
    if (plan !== "solo" && plan !== "venue")
      return json({ error: "Invalid plan selection." }, 400);
    if (interval !== "month" && interval !== "year")
      return json({ error: "Invalid billing selection." }, 400);
    if (typeof body.cardClub !== "boolean")
      return json({ error: "Please choose whether to add Card Club." }, 400);
    const cardClub = body.cardClub as boolean;
    // The public storefront collects this short brief before Stripe. Older callers may omit it.
    const brief = body.business;
    const clean = (value: unknown, max: number) =>
      typeof value === "string" ? value.trim().slice(0, max) : "";
    const business =
      brief && typeof brief === "object"
        ? {
            name: clean(brief.name, 120),
            city: clean(brief.city, 120),
            link: clean(brief.link, 300),
            goal: clean(brief.goal, 120),
            googlePlaceId: clean(brief.googlePlaceId, 300),
            address: clean(brief.address, 300),
            state: clean(brief.state, 80),
            postalCode: clean(brief.postalCode, 20),
            phone: clean(brief.phone, 50),
            googleMapsUri: clean(brief.googleMapsUri, 300),
            lat:
              typeof brief.lat === "number" &&
              Number.isFinite(brief.lat) &&
              Math.abs(brief.lat) <= 90
                ? brief.lat
                : null,
            lng:
              typeof brief.lng === "number" &&
              Number.isFinite(brief.lng) &&
              Math.abs(brief.lng) <= 180
                ? brief.lng
                : null,
          }
        : null;
    if (
      brief &&
      (!business ||
        business.name.length < 2 ||
        (!(business.googlePlaceId && business.address) &&
          business.city.length < 2))
    )
      return json(
        { error: "Add your business name and city so we can build your hub." },
        400,
      );
    if (business?.link) {
      try {
        const url = new URL(
          /^https?:\/\//i.test(business.link)
            ? business.link
            : `https://${business.link}`,
        );
        if (
          !["http:", "https:"].includes(url.protocol) ||
          !url.hostname.includes(".") ||
          url.username ||
          url.password
        )
          throw new Error();
        business.link = url.href;
      } catch {
        return json(
          { error: "Use a website or social link, or leave that field blank." },
          400,
        );
      }
    }
    const raw =
      body.attribution && typeof body.attribution === "object"
        ? body.attribution
        : {};
    const attribution: Record<string, string> = {};
    for (const k of ATTR_KEYS)
      if (typeof raw[k] === "string" && raw[k])
        attribution[k] = raw[k].slice(0, 250);
    // Test mode may return to the preview/localhost; live always returns to FRONTEND_URL.
    const ro = typeof body.returnOrigin === "string" ? body.returnOrigin : "";
    const origin =
      stripeMode() === "test" &&
      /^(http:\/\/localhost:8080|https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com))$/.test(
        ro,
      )
        ? ro
        : frontendUrl();
    const stripe = getStripe();
    let main,
      club = null;
    try {
      main = await verifiedPrice(stripe, `${plan}_${interval}`);
      if (cardClub) club = await verifiedPrice(stripe, "card_club");
    } catch (e) {
      console.error(
        "[payment-first-checkout] catalog unavailable",
        e instanceof Error ? e.message : e,
      );
      return json(
        {
          error:
            interval === "year"
              ? "Yearly is temporarily unavailable. Monthly is still available."
              : "Checkout is temporarily unavailable. Please try again shortly.",
        },
        503,
      );
    }

    const db = admin();
    const attemptHash = await hashValue(`${stripeMode()}:${body.checkoutAttemptId || crypto.randomUUID()}`);
    const requestHash = await hashValue(JSON.stringify({ plan, interval, cardClub, combined, business }));
    const findAttempt = () => db.from("checkout_intents").select("*").eq("checkout_attempt_hash", attemptHash).maybeSingle();
    const previous = await findAttempt();
    if (previous.error) throw previous.error;
    let intent = previous.data;
    if (!intent) {
      const inserted = await db
      .from("checkout_intents")
      .insert({
        checkout_attempt_hash: attemptHash,
        checkout_request_hash: requestHash,
        checkout_attempt_started_at: new Date().toISOString(),
        checkout_return_origin: origin,
        plan,
        billing_interval: interval,
        card_quantity: CARD_QUANTITY[plan],
        main_price_id: main.id,
        card_club_selected: cardClub,
        card_club_price_id: club?.id ?? null,
        onboarding_version: ONBOARDING_VERSION,
        stripe_livemode: stripeMode() === "live",
        business_details: business,
        checkout_source:
          typeof body.source === "string"
            ? body.source.slice(0, 60)
            : "onboarding",
        attribution,
      })
      .select("*")
      .single();
      if (inserted.error && inserted.error.code !== "23505") throw inserted.error;
      intent = inserted.data;
      if (!intent) { const raced = await findAttempt(); if (raced.error) throw raced.error; intent = raced.data; }
    }
    if (!intent) throw new Error("Checkout attempt unavailable");
    if (intent.checkout_request_hash !== requestHash || intent.stripe_livemode !== (stripeMode() === "live")) return json({ code: "checkout_changed", error: "Your checkout choices changed. Please try again." }, 409);
    const checkoutOrigin = intent.checkout_return_origin || frontendUrl();
    if (intent.stripe_checkout_session_id) {
      const existing = await stripe.checkout.sessions.retrieve(intent.stripe_checkout_session_id);
      if (existing.metadata?.checkout_intent_id !== intent.id || existing.metadata?.onboarding_version !== ONBOARDING_VERSION || existing.livemode !== intent.stripe_livemode) throw new Error("Checkout binding mismatch");
      if (existing.status === "open" && existing.url) return json({ url: existing.url, mode: stripeMode() });
      if (existing.status === "complete") return json({ url: `${checkoutOrigin}/welcome?session_id=${encodeURIComponent(existing.id)}`, mode: stripeMode() });
      if (existing.status === "expired") return json({ code: "checkout_expired", error: "This checkout expired. Please try again." }, 409);
      throw new Error("Checkout status unavailable");
    }
    if (Date.now() - Date.parse(intent.checkout_attempt_started_at) >= 23 * 60 * 60 * 1000) return json({ error: "We need to confirm an earlier checkout attempt. Contact tap@tapaway.co before starting another payment." }, 409);

    const meta: Record<string, string> = {
      checkout_intent_id: intent.id,
      onboarding_version: ONBOARDING_VERSION,
      onboarding_catalog: "true",
      selected_plan: plan,
      plan_type: interval === "year" ? `${plan}_yearly` : plan,
      card_quantity: String(CARD_QUANTITY[plan]),
      billing_cycle: interval,
      billing_interval: interval,
      main_price_id: main.id,
      ...(combined
        ? {
            card_club_billing: "included",
            card_club_product_id: club?.product ?? "",
          }
        : {}),
      card_club_selected: String(cardClub),
      card_club_price_id: club?.id ?? "",
      checkout_source: "payment_first",
      ...(intent.attribution || {}),
    };
    const qty = CARD_QUANTITY[plan];
    const total = `$${(main.amount + (cardClub && combined ? (interval === "year" ? 6000 : 500) : 0)) / 100}/${interval}`;
    const clubText = cardClub
      ? combined
        ? ` This total includes Card Club (${interval === "year" ? "$60/year" : "$5/month"}) on the same subscription and invoice.`
        : ` TapAway Card Club is a separate recurring charge of $5/month that also starts after your ${TRIAL_DAYS}-day trial and renews monthly until canceled.`
      : "";
    // Test-only: attach a Stripe test clock so trial end can be simulated. Never used in live mode.
    let customer: string | undefined;
    if (
      stripeMode() === "test" &&
      body.testClock === true &&
      typeof body.testEmail === "string" &&
      /^tap\+pftest[a-z0-9]+@tapaway\.co$/.test(body.testEmail)
    ) {
      const clock = await stripe.testHelpers.testClocks.create({
        frozen_time: Math.floor(Date.parse(intent.checkout_attempt_started_at) / 1000),
        name: `pf ${intent.id}`,
      }, { idempotencyKey: `pf_clock_${intent.id}` });
      const c = await stripe.customers.create({
        email: body.testEmail,
        test_clock: clock.id,
        metadata: { payment_first_test: "true" },
      }, { idempotencyKey: `pf_customer_${intent.id}` });
      customer = c.id;
      meta.test_clock_id = clock.id;
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(customer ? { customer } : {}),
      line_items: [
        { price: main.id, quantity: 1 },
        ...(club && combined
          ? interval === "month"
            ? [{ price: club.id, quantity: 1 }]
            : [
                {
                  price_data: {
                    currency: "usd",
                    product: club.product,
                    unit_amount: 6000,
                    recurring: { interval: "year" as const },
                  },
                  quantity: 1,
                },
              ]
          : []),
      ],
      success_url: `${checkoutOrigin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${checkoutOrigin}/onboarding?plan=${plan}&cycle=${interval}&canceled=1`,
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: !combined },
      payment_method_collection: "always",
      allow_promotion_codes: false,
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: meta,
        description: `TapAway ${qty} Cards`,
      },
      metadata: meta,
      client_reference_id: intent.id,
      custom_text: {
        submit: {
          message: `TapAway ${qty} Cards: ${TRIAL_DAYS} days free, then ${total}, renewing ${interval === "year" ? "yearly" : "monthly"} until canceled.${clubText} Cancel before the trial ends to avoid the first charge. Terms: https://tapaway.co/terms Refunds: https://tapaway.co/refund`,
        },
      },
    }, { idempotencyKey: `pf_checkout_${intent.id}` });
    if (session.livemode !== intent.stripe_livemode) throw new Error("Checkout environment mismatch");
    const saved = await db
      .from("checkout_intents")
      .update({
        stripe_checkout_session_id: session.id,
        status: "checkout_started",
      })
      .eq("id", intent.id).is("stripe_checkout_session_id", null).select("id");
    if (saved.error) throw saved.error;
    if (!saved.data?.length) {
      const rebound = await findAttempt();
      if (rebound.error || rebound.data?.stripe_checkout_session_id !== session.id) throw rebound.error || new Error("Checkout persistence failed");
    }
    if (!session.url) throw new Error("Checkout URL unavailable");
    return json({ url: session.url, mode: stripeMode() });
  } catch (e) {
    console.error(
      "[payment-first-checkout] failed",
      e instanceof Error ? e.message : e,
    );
    return json(
      {
        error: "Checkout is temporarily unavailable. Please try again shortly.",
      },
      500,
    );
  }
});
