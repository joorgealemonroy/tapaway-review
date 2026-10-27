import Stripe from 'https://esm.sh/stripe@14.21.0';
import { admin, getStripe, stripeMode } from '../_shared/paymentFirst.ts';
import { readLimitedText } from '../_shared/requestBody.ts';
import { takeQuota } from '../_shared/storefrontRateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
class Rejected extends Error { constructor(message: string, readonly status: number) { super(message); } }

async function quota(req: Request, scope: string, limit: number, identity?: string) {
  if (await takeQuota(req, `creator-checkout:${scope}`, limit, identity) < 0) {
    throw new Rejected('Please try again later.', 429);
  }
}
function checkoutUrl(session: Stripe.Checkout.Session) {
  const url = session.url ? new URL(session.url) : null;
  if (!session.livemode || session.mode !== 'payment' || session.status !== 'open'
    || !url || url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') {
    throw new Rejected('This checkout is no longer available. Refresh the page before trying again.', 409);
  }
  return url.href;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let body: Record<string, any>;
  try { body = JSON.parse(await readLimitedText(req, 6144)); }
  catch { return json({ error: 'Invalid request' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some(key => !['productId', 'buyerEmail', 'booking', 'requestKey'].includes(key))
    || typeof body.productId !== 'string' || !uuid.test(body.productId)) {
    return json({ error: 'Choose a product and start checkout from its page.' }, 400);
  }
  const buyerEmail = typeof body.buyerEmail === 'string' ? body.buyerEmail.trim().toLowerCase() : '';
  if (body.buyerEmail !== undefined && (!emailPattern.test(buyerEmail) || buyerEmail.length > 254)) {
    return json({ error: 'Enter a valid email address.' }, 400);
  }
  if (body.requestKey !== undefined && (typeof body.requestKey !== 'string' || !uuid.test(body.requestKey))) {
    return json({ error: 'Invalid checkout request.' }, 400);
  }
  try {
    await quota(req, 'ip', 20);
    await quota(req, 'global', 1000, 'all');
    // Production purchases never accept a browser-controlled test flag or fake
    // Connect account. Test infrastructure uses a separate server environment.
    if (stripeMode() !== 'live') throw new Rejected('Payments are temporarily unavailable.', 503);
    const db = admin(), stripe = getStripe();
    const { data: product, error: productError } = await db.from('creator_products')
      .select('id,creator_id,title,description,price_cents,product_type,duration_minutes,is_active')
      .eq('id', body.productId).eq('is_active', true).maybeSingle();
    if (productError) throw productError;
    if (!product) throw new Rejected('This product is not available.', 404);
    if (!Number.isInteger(product.price_cents) || product.price_cents < 50 || product.price_cents > 99999999
      || typeof product.title !== 'string' || !product.title.trim()) {
      throw new Rejected('This product is not ready for checkout.', 409);
    }
    const { data: creator, error: creatorError } = await db.from('personal_profiles')
      .select('id,username,stripe_connect_account_id,is_stripe_onboarded').eq('id', product.creator_id).maybeSingle();
    if (creatorError) throw creatorError;
    if (!creator || !creator.is_stripe_onboarded || !/^acct_[A-Za-z0-9]+$/.test(creator.stripe_connect_account_id || '')
      || !/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(creator.username || '')) {
      throw new Rejected('This creator is not ready to accept payments.', 409);
    }
    const entitlement = await db.rpc('personal_profile_is_active', { _profile_id: creator.id });
    if (entitlement.error) throw entitlement.error;
    if (entitlement.data !== true) throw new Rejected('This creator is currently unavailable.', 409);
    const account = await stripe.accounts.retrieve(creator.stripe_connect_account_id);
    if (account.id !== creator.stripe_connect_account_id || !account.charges_enabled || !account.payouts_enabled
      || account.capabilities?.transfers !== 'active') {
      throw new Rejected('This creator is not ready to accept payments.', 409);
    }

    const isBooking = product.product_type === 'booking';
    let reservation: Record<string, any> | null = null;
    if (isBooking) {
      const input = body.booking;
      if (!input || typeof input !== 'object' || Array.isArray(input)
        || Object.keys(input).some(key => !['date', 'startTime', 'timezone', 'requestKey'].includes(key))
        || typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)
        || typeof input.startTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(input.startTime)
        || typeof input.timezone !== 'string' || input.timezone.length > 100
        || typeof input.requestKey !== 'string' || !uuid.test(input.requestKey)
        || !buyerEmail) throw new Rejected('Choose a time and enter your email address.', 400);
      await quota(req, 'buyer', 10, buyerEmail);
      const hold = await db.rpc('reserve_creator_booking', {
        _product_id: product.id, _buyer_email: buyerEmail,
        _booking_date: input.date, _start_time: input.startTime, _timezone: input.timezone,
        _request_key: input.requestKey,
      });
      if (hold.error) {
        if (['22023', '23505'].includes(hold.error.code)) {
          throw new Rejected('That time is no longer available. Please choose another time.', 409);
        }
        throw hold.error;
      }
      reservation = hold.data;
      if (!reservation || !uuid.test(reservation.bookingId || '') || reservation.creatorId !== creator.id
        || !Number.isFinite(Date.parse(reservation.expiresAt))) throw new Error('Invalid reservation result');
      if (reservation.stripeSessionId) {
        const existing = await stripe.checkout.sessions.retrieve(reservation.stripeSessionId);
        if (existing.metadata?.commerce_version !== 'creator_marketplace_v2'
          || existing.metadata?.product_id !== product.id || existing.metadata?.creator_profile_id !== creator.id
          || existing.metadata?.booking_id !== reservation.bookingId || existing.metadata?.reservation_key !== input.requestKey
          || existing.metadata?.destination !== creator.stripe_connect_account_id
          || existing.metadata?.expected_amount !== String(reservation.priceCents)) {
          throw new Error('Reservation checkout mismatch');
        }
        return json({ url: checkoutUrl(existing) });
      }
    } else if (body.booking !== undefined) {
      throw new Rejected('This product does not accept time reservations.', 400);
    }

    const amount = reservation?.priceCents ?? product.price_cents;
    if (!Number.isInteger(amount) || amount < 50 || amount > 99999999) throw new Error('Invalid reservation amount');
    const origin = new URL(Deno.env.get('FRONTEND_URL') || 'https://tapaway.co');
    if (origin.protocol !== 'https:' || !['tapaway.co', 'www.tapaway.co'].includes(origin.hostname)
      || origin.username || origin.password) throw new Error('Invalid checkout return origin');
    const pageUrl = `${origin.origin}/${encodeURIComponent(creator.username)}`;
    const requestKey = reservation ? body.booking.requestKey : (body.requestKey || crypto.randomUUID());
    const metadata: Record<string, string> = {
      type: 'creator_marketplace', commerce_version: 'creator_marketplace_v2',
      product_id: product.id, creator_profile_id: creator.id,
      expected_amount: String(amount), currency: 'usd', destination: creator.stripe_connect_account_id,
      ...(reservation ? { booking_id: reservation.bookingId, reservation_key: requestKey } : {}),
    };
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: [{ price_data: { currency: 'usd', unit_amount: amount,
        product_data: { name: product.title.slice(0, 250), description: product.description?.slice(0, 500) || undefined } }, quantity: 1 }],
      success_url: `${pageUrl}?purchase=success&session_id={CHECKOUT_SESSION_ID}${reservation ? '&booking=success' : ''}`,
      cancel_url: pageUrl, metadata,
      payment_intent_data: { transfer_data: { destination: creator.stripe_connect_account_id }, metadata },
      ...(buyerEmail ? { customer_email: buyerEmail } : {}),
      ...(reservation ? { expires_at: Math.floor(Date.parse(reservation.expiresAt) / 1000) } : {}),
    };
    const session = await stripe.checkout.sessions.create(params, {
      idempotencyKey: `creator_checkout_${product.id}_${requestKey}`,
    });
    const url = checkoutUrl(session);
    if (reservation) {
      const saved = await db.from('bookings').update({ stripe_session_id: session.id })
        .eq('id', reservation.bookingId).eq('reservation_key', requestKey).eq('status', 'pending')
        .is('stripe_session_id', null).select('id');
      if (saved.error) throw saved.error;
      if (!saved.data?.length) {
        const current = await db.from('bookings').select('stripe_session_id,status')
          .eq('id', reservation.bookingId).eq('reservation_key', requestKey).maybeSingle();
        if (current.error || current.data?.stripe_session_id !== session.id || current.data.status !== 'pending') {
          throw new Error('Could not bind checkout to reservation');
        }
      }
    }
    return json({ url });
  } catch (error) {
    if (error instanceof Rejected) return json({ error: error.message }, error.status);
    console.error('[create-product-checkout] Request failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'We could not open secure checkout. Please try again.' }, 503);
  }
});
