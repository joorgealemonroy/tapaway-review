// verify-trial-card
//
// $1 card-verification hold for trial signups.
//
// Input:  { customerId } OR { paymentMethodId } (optionally both; paymentMethodId wins)
//         Optional: { clientIp } — end-user IP to rate-limit on instead of the caller IP
//                   { idempotencyKey } — forwarded to Stripe to dedupe retries
//
// What it does:
//   1. Resolves a usable card payment method server-side (never trusts a
//      client-supplied full card number — only Stripe IDs).
//   2. Creates a $1.00 USD PaymentIntent (capture_method='manual', confirm=true,
//      off_session=true) and IMMEDIATELY cancels it — the hold is voided and
//      never captured. A declined/errored card surfaces Stripe's decline code.
//   3. Returns { ok: true } or { ok: false, code, message } with plain-language
//      messages the frontend can show the customer directly.
//
// This function does NOT create any subscription and does NOT gate on admin.
// It is invoked server-to-server by the checkout verifier functions
// (verify-personal-checkout, stripe-webhook) with the service-role bearer —
// the bearer check below rejects any other caller. It never logs raw card
// data — only the last4 and the result.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FUNCTION_NAME = '[verify-trial-card]';

// Plain-language messages for the common Stripe decline codes.
// Keys are Stripe decline_code / error codes; the frontend can render `message` directly.
const DECLINE_MESSAGES: Record<string, string> = {
  insufficient_funds:
    "This card doesn't have enough available funds to verify it. Please try a different card.",
  card_declined:
    "Your card was declined. Please try a different card or contact your bank.",
  expired_card:
    "This card is expired. Please use a different card.",
  incorrect_cvc:
    "The security code (CVC) on this card doesn't match. Please check it and try again.",
  incorrect_number:
    "The card number doesn't look right. Please check it and try again.",
  invalid_expiry_month:
    "The expiration month isn't valid. Please check the card and try again.",
  invalid_expiry_year:
    "The expiration year isn't valid. Please check the card and try again.",
  invalid_cvc:
    "The security code (CVC) isn't valid. Please check it and try again.",
  do_not_honor:
    "Your bank declined this card. Please try a different card or contact your bank.",
  generic_decline:
    "Your card was declined. Please try a different card or contact your bank.",
  lost_card:
    "Your card was declined. Please try a different card or contact your bank.",
  stolen_card:
    "Your card was declined. Please try a different card or contact your bank.",
  pickup_card:
    "Your card was declined. Please try a different card or contact your bank.",
  restricted_card:
    "This card can't be used for this purchase. Please try a different card.",
  transaction_not_allowed:
    "This card doesn't allow this kind of transaction. Please try a different card.",
  do_not_try_again:
    "Your card was declined. Please try a different card or contact your bank.",
  no_action_taken:
    "Your bank didn't approve this. Please try a different card or contact your bank.",
  not_permitted:
    "This card can't be used for this purchase. Please try a different card.",
  try_again_later:
    "Your bank asked us to try again later. Please wait a moment and try once more.",
  authentication_required:
    "Your bank needs extra verification for this card. Please go back to checkout and try again, or use a different card.",
  processing_error:
    "Something went wrong on our end — please try again.",
  rate_limit_error:
    "Something went wrong on our end — please try again.",
  api_error:
    "Something went wrong on our end — please try again.",
  payment_method_unactivated:
    "This card isn't activated yet. Please activate it with your bank or try a different card.",
  issuer_not_available:
    "We couldn't reach your bank just now. Please try again in a moment.",
  offline_pin_required:
    "This card needs a PIN to be verified. Please try a different card.",
};

function plainLanguageMessage(code: string | null | undefined): string {
  if (code && DECLINE_MESSAGES[code]) return DECLINE_MESSAGES[code];
  return "Your card couldn't be verified. Please try a different card or contact your bank.";
}

// Very loose IP check — just enough to pick a sensible rate-limit key.
function looksLikeIp(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-fA-F:.]{3,45}$/.test(value.trim());
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Server-to-server only: the caller must present our own service-role
    // bearer (this is how verify-personal-checkout / stripe-webhook call
    // sibling functions, e.g. send-van-handoff). This keeps the endpoint
    // from being usable by random internet callers even though
    // verify_jwt=false in config.toml.
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }
    const authHeader = req.headers.get('Authorization') || '';
    if (authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(
        JSON.stringify({ ok: false, code: 'unauthorized', message: 'Unauthorized.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    const body = await req.json().catch(() => ({}));
    const { customerId, paymentMethodId, clientIp, idempotencyKey } = body as {
      customerId?: string;
      paymentMethodId?: string;
      clientIp?: string;
      idempotencyKey?: string;
    };

    // Rate limit ~10/hour. Prefer the END USER's IP (passed through by the
    // calling verifier from the original request's x-forwarded-for) so all
    // server-side calls don't share one bucket on the function's egress IP.
    const rlIp = looksLikeIp(clientIp)
      ? clientIp.trim()
      : (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         'unknown');
    if (!checkRateLimit(`${rlIp}:verify-trial-card`, 10, 60 * 60 * 1000)) {
      return rateLimitResponse(corsHeaders);
    }

    // Resolve the payment method server-side. We only ever accept Stripe IDs
    // here — never raw card numbers.
    let resolvedPmId: string | null = null;
    let resolvedCustomerId: string | null = null;
    let last4: string | null = null;

    if (typeof paymentMethodId === 'string' && paymentMethodId.startsWith('pm_')) {
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (pm.type !== 'card') {
        return new Response(
          JSON.stringify({
            ok: false,
            code: 'unsupported_payment_method',
            message: "We can only verify a card. Please use a credit or debit card.",
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      resolvedPmId = pm.id;
      last4 = pm.card?.last4 ?? null;
      resolvedCustomerId =
        typeof customerId === 'string' && customerId.startsWith('cus_') ? customerId : null;
    } else if (typeof customerId === 'string' && customerId.startsWith('cus_')) {
      resolvedCustomerId = customerId;
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer || customer.deleted) {
        return new Response(
          JSON.stringify({
            ok: false,
            code: 'customer_not_found',
            message: plainLanguageMessage(null),
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      // Prefer the customer's default payment method (the one Stripe will
      // bill for the subscription); fall back to the first saved card.
      const defaultPm = (customer as Stripe.Customer).invoice_settings?.default_payment_method;
      if (typeof defaultPm === 'string' && defaultPm.startsWith('pm_')) {
        resolvedPmId = defaultPm;
      } else {
        const pms = await stripe.paymentMethods.list({
          customer: customerId,
          type: 'card',
          limit: 3,
        });
        const first = pms.data[0];
        if (!first) {
          return new Response(
            JSON.stringify({
              ok: false,
              code: 'no_card_on_file',
              message: "We couldn't find a card on your account. Please go back to checkout and add one.",
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        resolvedPmId = first.id;
      }
      const pm = await stripe.paymentMethods.retrieve(resolvedPmId);
      last4 = pm.card?.last4 ?? null;
    } else {
      return new Response(
        JSON.stringify({
          ok: false,
          code: 'missing_input',
          message: plainLanguageMessage(null),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`${FUNCTION_NAME} Verifying card:`, {
      last4: last4 ? `****${last4}` : 'unknown',
      by: paymentMethodId ? 'paymentMethodId' : 'customerId',
    });

    // $1.00 auth hold: manual capture + off_session. Never captured — we
    // cancel immediately below. The card is only verified, never charged.
    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.create(
        {
          amount: 100,
          currency: 'usd',
          ...(resolvedCustomerId ? { customer: resolvedCustomerId } : {}),
          payment_method: resolvedPmId!,
          confirm: true,
          off_session: true,
          capture_method: 'manual',
          description: 'TapAway trial card verification ($1 hold, immediately released)',
          metadata: { purpose: 'tapaway_trial_card_check' },
        },
        ...(idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.length > 0
          ? [{ idempotencyKey }]
          : []),
      );
    } catch (piErr: unknown) {
      // The $1 auth itself failed — this is the decline signal we want.
      const err = piErr as { code?: string; decline_code?: string; message?: string; type?: string };
      const code = err.decline_code || err.code || 'card_error';
      console.log(`${FUNCTION_NAME} Card verification failed:`, {
        last4: last4 ? `****${last4}` : 'unknown',
        code,
        type: err.type,
      });
      return new Response(
        JSON.stringify({ ok: false, code, message: plainLanguageMessage(code) }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Success: void the hold immediately. A manual-capture intent that
    // confirmed but required extra steps (requires_action) is also canceled
    // so nothing is left dangling.
    try {
      await stripe.paymentIntents.cancel(intent.id);
    } catch (cancelErr) {
      // If cancel fails, a manual-capture intent expires uncaptured on its
      // own (max ~7 days); the $1 is still never charged. Log and continue.
      console.error(`${FUNCTION_NAME} Failed to cancel $1 hold (non-fatal, never captured):`, {
        intent_id: intent.id,
        last4: last4 ? `****${last4}` : 'unknown',
        error: cancelErr instanceof Error ? cancelErr.message : 'unknown',
      });
    }

    console.log(`${FUNCTION_NAME} Card verified + hold voided:`, {
      last4: last4 ? `****${last4}` : 'unknown',
      intent_id: intent.id,
    });

    return new Response(
      JSON.stringify({ ok: true, last4: last4 ? `****${last4}` : null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error(`${FUNCTION_NAME} Error:`, error);
    return new Response(
      JSON.stringify({
        ok: false,
        code: 'processing_error',
        message: plainLanguageMessage('processing_error'),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
