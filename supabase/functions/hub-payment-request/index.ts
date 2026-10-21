import Stripe from 'https://esm.sh/stripe@14.21.0';
import { admin, getStripe, stripeMode } from '../_shared/paymentFirst.ts';
import { requireUser, isAdmin } from '../_shared/security.ts';
import { resolveOnboardingPrice } from '../_shared/onboardingCatalog.ts';
import { takeQuota } from '../_shared/storefrontRateLimit.ts';
import { readLimitedText } from '../_shared/requestBody.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9][a-z0-9_-]{0,99}$/;
class Rejected extends Error { constructor(message: string, readonly status: number) { super(message); } }

async function quota(req: Request, scope: string, limit: number, identity?: string) {
  if (await takeQuota(req, `hub-payment:${scope}`, limit, identity) < 0) {
    throw new Rejected('Please try again later or contact tap@tapaway.co.', 429);
  }
}
async function availablePrice(stripe: Stripe, refresh = true) {
  // This flow reactivates an existing production hub. TEST payments can never
  // unlock it, and it must not mint replacement products or free trials.
  if (stripeMode() !== 'live') throw new Rejected('Payment is temporarily unavailable.', 503);
  const item = await resolveOnboardingPrice(stripe, 'solo', 'month', refresh);
  if (item.amount !== 2000 || item.currency !== 'usd') throw new Error('Catalog unavailable');
  return item;
}
async function getOffer(db: ReturnType<typeof admin>, slug: string) {
  const { data, error } = await db.rpc('get_hub_payment_offer', { _slug: slug });
  if (error) throw error;
  return data as Record<string, any> | null;
}
function publicOffer(o: Record<string, any>) {
  const m = o.metrics || {};
  return {
    profileId: o.profileId, slug: o.username, name: o.displayName,
    photoUrl: o.profilePhotoUrl, headerUrl: o.headerImageUrl,
    amount: o.amount, currency: o.currency, interval: o.interval, cardCount: o.cardQuantity,
    visits: m.views, totalClicks: m.linkClicks, googleClicks: m.googleClicks,
    yelpClicks: m.yelpClicks, instagramClicks: m.instagramClicks,
    directionsClicks: m.directionsClicks, contactSaves: m.contactSaves,
    since: m.firstActivityAt, lastActivityAt: m.lastActivityAt,
    historicalViews: m.historicalViews,
  };
}

async function checkout(req: Request, db: ReturnType<typeof admin>, stripe: Stripe, slug: string) {
  const offer = await getOffer(db, slug);
  if (!offer) throw new Rejected('This page does not need a new activation payment.', 409);
  const price = await availablePrice(stripe);
  await quota(req, 'checkout-global', 1000, 'global');
  const read = async () => {
    const { data, error } = await db.from('hub_payment_requests').select('*')
      .eq('profile_id', offer.profileId).eq('request_version', offer.requestVersion).single();
    if (error || !data) throw error || new Error('Payment request unavailable');
    if (data.fulfilled_at) throw new Rejected('Payment is already complete. Refresh your page.', 409);
    return data;
  };
  let row = await read();
  if (row.stripe_checkout_session_id) {
    const previous = await stripe.checkout.sessions.retrieve(row.stripe_checkout_session_id);
    if (!previous.livemode || previous.metadata?.request_version !== row.request_version
      || previous.metadata?.commerce_version !== 'hub_payment_v1'
      || previous.metadata?.profile_id !== row.profile_id
      || previous.metadata?.checkout_attempt_id !== row.checkout_attempt_id) throw new Error('Checkout mismatch');
    if (previous.status === 'open' && previous.url) return { url: previous.url };
    if (previous.status === 'complete') throw new Rejected('Your payment is being confirmed. Refresh your page in a moment.', 409);
    if (previous.status !== 'expired') throw new Error('Checkout status unavailable');
    // A new attempt is safe only after Stripe confirms the old one expired.
    const reset = await db.from('hub_payment_requests').update({ stripe_checkout_session_id: null,
      checkout_session_expires_at: null, checkout_started_at: null, checkout_attempt_created_at: null, checkout_attempt_id: crypto.randomUUID() })
      .eq('profile_id', row.profile_id).eq('request_version', row.request_version)
      .eq('stripe_checkout_session_id', previous.id).is('fulfilled_at', null).select('profile_id');
    if (reset.error) throw reset.error;
    if (!reset.data?.length) throw new Rejected('Checkout is already opening. Please try again in a moment.', 409);
    row = await read();
  }
  if (row.checkout_attempt_created_at && Date.now() - Date.parse(row.checkout_attempt_created_at) > 23 * 60 * 60 * 1000) {
    throw new Rejected('We need to confirm an earlier checkout attempt. Contact tap@tapaway.co before trying another payment.', 409);
  }
  const lease = await db.from('hub_payment_requests').update({ checkout_started_at: new Date().toISOString(),
    checkout_attempt_created_at: row.checkout_attempt_created_at || new Date().toISOString() })
    .eq('profile_id', row.profile_id).eq('request_version', row.request_version)
    .eq('checkout_attempt_id', row.checkout_attempt_id).is('fulfilled_at', null).is('stripe_checkout_session_id', null)
    .or(`checkout_started_at.is.null,checkout_started_at.lt.${new Date(Date.now() - 120000).toISOString()}`)
    .select('profile_id');
  if (lease.error) throw lease.error;
  if (!lease.data?.length) throw new Rejected('Checkout is already opening. Please try again in a moment.', 409);

  const origin = (Deno.env.get('FRONTEND_URL') || 'https://tapaway.co').replace(/\/$/, '');
  const returnUrl = `${origin}/${encodeURIComponent(slug)}`;
  const metadata = { commerce_version: 'hub_payment_v1', profile_id: row.profile_id,
    request_version: row.request_version, checkout_attempt_id: row.checkout_attempt_id };
  // No customer or account identity comes from the public request. Checkout
  // collects payment details, but paying never grants someone another owner's login.
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription', line_items: [{ price: price.priceId, quantity: 1 }],
    billing_address_collection: 'auto',
    success_url: `${returnUrl}?activation=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?activation=canceled`,
    metadata, subscription_data: { metadata },
    custom_text: { submit: { message: 'Reactivate your existing TapAway hub and 4 cards for $20/month. Renews monthly. Cancel anytime.' } },
  }, { idempotencyKey: `hub_payment_${row.request_version}_${row.checkout_attempt_id}` });
  if (!session.livemode || !session.url) throw new Error('Checkout unavailable');
  const saved = await db.from('hub_payment_requests').update({ stripe_checkout_session_id: session.id,
    checkout_session_expires_at: new Date(session.expires_at * 1000).toISOString(), checkout_started_at: null })
    .eq('profile_id', row.profile_id).eq('request_version', row.request_version)
    .eq('checkout_attempt_id', row.checkout_attempt_id).is('fulfilled_at', null).select('profile_id');
  // Keep the attempt id after any ambiguous provider/database failure. A retry
  // uses Stripe's same idempotency key instead of charging a second subscription.
  if (saved.error || !saved.data?.length) throw saved.error || new Error('Could not save checkout');
  return { url: session.url };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let body: Record<string, unknown>;
  try { body = JSON.parse(await readLimitedText(req, 4096)); }
  catch { return json({ error: 'Invalid request' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid request' }, 400);
  try {
    const db = admin();
    if (body.action === 'require') {
      const auth = await requireUser(req);
      if (!auth || !(await isAdmin(auth.user.id))) return json({ error: 'Admin access required' }, 403);
      if (body.confirm !== true || typeof body.profileId !== 'string' || !uuid.test(body.profileId)) return json({ error: 'Confirm the selected hub first.' }, 400);
      await quota(req, 'admin', 40, auth.user.id);
      await availablePrice(getStripe());
      const result = await db.rpc('require_hub_payment', { _profile_id: body.profileId, _requested_by: auth.user.id });
      if (result.error) return json({ error: 'This hub cannot be paused for this offer. Check its billing and gift status first.' }, 409);
      return json({ ok: true });
    }
    if (!['summary', 'checkout', 'status'].includes(String(body.action))) return json({ error: 'Invalid request' }, 400);
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    if (!slugPattern.test(slug)) return json({ error: 'Invalid hub' }, 400);
    await quota(req, String(body.action), body.action === 'checkout' ? 20 : 300);
    if (body.action === 'checkout') return json(await checkout(req, db, getStripe(), slug));
    await quota(req, 'reads-global', 20000, 'global');
    if (body.action === 'summary') {
      const offer = await getOffer(db, slug);
      if (!offer) return json({ offer: null });
      let checkoutAvailable = false;
      try { await availablePrice(getStripe(), false); checkoutAvailable = true; } catch { /* Keep branding and real stats available. */ }
      return json({ offer: publicOffer(offer), checkoutAvailable });
    }
    if (typeof body.sessionId !== 'string' || !/^cs_live_[A-Za-z0-9]+$/.test(body.sessionId)) return json({ error: 'Invalid checkout' }, 400);
    const profile = await db.from('personal_profiles').select('id,subscription_status,payment_state,is_approved,stripe_subscription_id').eq('username', slug).maybeSingle();
    if (profile.error) throw profile.error;
    if (!profile.data) return json({ paid: false, active: false });
    const record = await db.from('hub_payment_requests').select('request_version,fulfilled_at,stripe_checkout_session_id,stripe_subscription_id')
      .eq('profile_id', profile.data.id).eq('stripe_checkout_session_id', body.sessionId).maybeSingle();
    if (record.error) throw record.error;
    if (!record.data) return json({ paid: false, active: false });
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(body.sessionId);
    const paid = session.livemode && session.metadata?.commerce_version === 'hub_payment_v1'
      && session.metadata?.request_version === record.data.request_version
      && session.status === 'complete' && session.payment_status === 'paid';
    let active = false;
    if (paid && record.data.fulfilled_at && record.data.stripe_subscription_id === profile.data.stripe_subscription_id
      && profile.data.is_approved && profile.data.payment_state === 'paying' && profile.data.subscription_status === 'active') {
      const sub = await stripe.subscriptions.retrieve(record.data.stripe_subscription_id);
      active = sub.livemode && sub.status === 'active';
    }
    return json({ paid: !!paid, active: !!active });
  } catch (error) {
    if (error instanceof Rejected) return json({ error: error.message }, error.status);
    // Do not echo provider errors, account details, or credentials to visitors.
    console.error('[hub-payment-request] Request failed', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'We could not complete that request. Please try again or contact tap@tapaway.co.' }, 503);
  }
});
