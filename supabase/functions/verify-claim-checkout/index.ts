// Read-only status for the /claim success screen.
// Activation happens exclusively in the signed Stripe webhook.
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!checkRateLimit(getRateLimitKey(req, 'verify-claim-checkout'), 60, 15 * 60 * 1000)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
      return json({ error: 'Invalid session id' }, 400);
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const paid = session.status === 'complete' &&
      (session.payment_status === 'paid' || session.payment_status === 'no_payment_required');

    return json({
      ok: paid,
      status: session.status,
      email: session.customer_details?.email ?? null,
      plan: session.metadata?.plan === 'annual' ? 'yearly' : 'monthly',
      cardClub: session.metadata?.card_club === 'true',
    });
  } catch (error) {
    console.error('[verify-claim-checkout] Error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
