import Stripe from 'https://esm.sh/stripe@14.21.0';
import { sendEmailAndLog, wrapEmail } from './email.ts';
import { escapeHtml } from './sanitize.ts';
const ref = (value: any): string | null => typeof value === 'string' ? value : value?.id || null;
const VERSION = 'creator_marketplace_v2';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** This branch runs before legacy restaurant/Auth provisioning, including for
 * legacy marketplace events. A purchase never grants an account or hub. */
export async function fulfillCreatorCheckout(stripe: Stripe, db: any, supplied: Stripe.Checkout.Session) {
  if (supplied.metadata?.type !== 'creator_marketplace') return { handled: false };
  const session = await stripe.checkout.sessions.retrieve(supplied.id);
  if (!session.livemode || session.mode !== 'payment' || session.metadata?.type !== 'creator_marketplace') throw new Error('Creator checkout environment mismatch');
  if (session.status !== 'complete' || session.payment_status !== 'paid') return { handled: true, pending: true };
  // Older callers did not reserve a server-owned booking or bind the destination.
  // Keep previously delivered purchases intact; do not invent a new entitlement.
  if (session.metadata.commerce_version !== VERSION) return { handled: true, reviewRequired: true };
  const meta = session.metadata;
  const amount = Number(meta.expected_amount);
  const email = (session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
  if (!uuid.test(meta.product_id || '') || !uuid.test(meta.creator_profile_id || '')
    || !Number.isSafeInteger(amount) || amount < 50 || amount > 99999999 || meta.currency !== 'usd'
    || session.currency !== 'usd' || session.amount_total !== amount || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error('Creator purchase details mismatch');
  const productResult = await db.from('creator_products').select('id,creator_id,title,product_type,price_cents').eq('id', meta.product_id).single();
  if (productResult.error || !productResult.data || productResult.data.creator_id !== meta.creator_profile_id) throw productResult.error || new Error('Creator product mismatch');
  const product = productResult.data;
  const profileResult = await db.from('personal_profiles').select('id,user_id,full_name,stripe_connect_account_id').eq('id', product.creator_id).single();
  const profile = profileResult.data;
  if (profileResult.error || !profile || profile.stripe_connect_account_id !== meta.destination) throw profileResult.error || new Error('Creator destination mismatch');
  const paymentId = ref(session.payment_intent);
  if (!paymentId) throw new Error('Creator payment missing');
  const payment = await stripe.paymentIntents.retrieve(paymentId, { expand: ['latest_charge'] });
  if (!payment.livemode || payment.status !== 'succeeded' || payment.currency !== 'usd' || payment.amount_received !== amount
    || ref(payment.transfer_data?.destination) !== meta.destination || payment.metadata?.commerce_version !== VERSION
    || payment.metadata.product_id !== product.id || payment.metadata.creator_profile_id !== profile.id) throw new Error('Creator payment mismatch');
  const chargeId = ref(payment.latest_charge);
  if (!chargeId) throw new Error('Creator charge missing');
  const charge = typeof payment.latest_charge === 'object' && payment.latest_charge ? payment.latest_charge : await stripe.charges.retrieve(chargeId);
  if (!charge.livemode || !charge.paid || ref(charge.payment_intent) !== paymentId) throw new Error('Creator charge mismatch');
  if (charge.refunded || charge.disputed || charge.amount_refunded > 0) return { handled: true, reviewRequired: true };

  const bookingProduct = product.product_type === 'booking';
  if (bookingProduct && (!uuid.test(meta.booking_id || '') || !uuid.test(meta.reservation_key || ''))) throw new Error('Creator reservation missing');
  if (!bookingProduct && (meta.booking_id || meta.reservation_key)) throw new Error('Unexpected booking reference');
  // Persist the payment identity before booking confirmation. Database guards
  // apply any durable reversal that raced the current-charge read above.
  const written = await db.from('creator_purchases').upsert({
    product_id: product.id, buyer_email: email, stripe_session_id: session.id,
    stripe_payment_intent_id: paymentId, payment_status: bookingProduct ? 'pending' : 'paid',
    access_token: crypto.randomUUID(), access_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: 'stripe_session_id', ignoreDuplicates: true });
  if (written.error) throw written.error;
  const existing = await db.from('creator_purchases').select('*').eq('stripe_session_id', session.id).single();
  let purchase = existing.data;
  if (existing.error || !purchase || purchase.product_id !== product.id || purchase.buyer_email !== email || purchase.stripe_payment_intent_id !== paymentId) throw existing.error || new Error('Creator purchase binding mismatch');
  if (!['pending', 'paid'].includes(purchase.payment_status)) return { handled: true, reviewRequired: true };
  let booking: Record<string, any> | null = null;
  if (bookingProduct) {
    const booked = await db.rpc('fulfill_creator_booking', {
      _booking_id: meta.booking_id, _reservation_key: meta.reservation_key, _session_id: session.id,
      _product_id: product.id, _amount: amount, _currency: 'usd', _buyer_email: email,
    });
    if (booked.error || !booked.data || (booked.data.confirmed !== true && booked.data.reviewRequired !== true)) throw booked.error || new Error('Creator booking was not saved');
    if (booked.data.reviewRequired === true) {
      const stopped = await db.from('creator_purchases').update({ payment_status:'payment_review',access_expires_at:new Date(Date.now()-1000).toISOString() }).eq('id',purchase.id);
      if (stopped.error) throw stopped.error;
      return {handled:true,reviewRequired:true};
    }
    const confirmed = await db.from('creator_purchases').update({ payment_status:'paid' }).eq('id',purchase.id).eq('payment_status','pending');
    if (confirmed.error) throw confirmed.error;
    const details = await db.from('bookings').select('booking_date,start_time,timezone,status').eq('id', meta.booking_id).single();
    if (details.error || !details.data) throw details.error || new Error('Creator booking unavailable');
    booking = details.data;
    const reread = await db.from('creator_purchases').select('*').eq('id',purchase.id).single();
    if (reread.error || !reread.data) throw reread.error || new Error('Creator purchase unavailable');
    purchase = reread.data;
    if (purchase.payment_status !== 'paid' || booking.status !== 'paid') return {handled:true,reviewRequired:true};
  }
  await deliverCreatorReceipt(db, purchase, product, profile, booking, 'buyer');
  await deliverCreatorReceipt(db, purchase, product, profile, booking, 'creator');
  return { handled: true, confirmed: true };
}

/** Refund-before-fulfillment is also blocked by the fresh charge check above. */
export async function revokeCreatorPurchase(stripe: Stripe, db: any, eventType: string, object: Record<string, any>) {
  const chargeId = eventType === 'charge.dispute.created' ? ref(object.charge) : object.id;
  if (!chargeId) throw new Error('Creator reversal charge missing');
  const charge = await stripe.charges.retrieve(chargeId);
  if (!charge.livemode) throw new Error('Creator reversal environment mismatch');
  const paymentId = ref(charge.payment_intent);
  if (!paymentId) return false;
  if (eventType === 'charge.refunded' && !charge.refunded && !charge.amount_refunded) return false;
  const held = await db.rpc('record_payment_reversal', { _mode: 'live', _payment_intent_id: paymentId, _subscription_id: null, _reason: eventType === 'charge.dispute.created' ? 'disputed' : charge.refunded ? 'refunded' : 'partial_refund' });
  if (held.error) throw held.error;
  const result = await db.from('creator_purchases').select('id,stripe_session_id').eq('stripe_payment_intent_id', paymentId).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return false;
  if (eventType === 'charge.refunded' && !charge.refunded && !charge.amount_refunded) return false;
  const status = eventType === 'charge.dispute.created' ? 'disputed' : charge.refunded ? 'refunded' : 'payment_review';
  const stopped = await db.from('creator_purchases').update({ payment_status: status, access_expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', result.data.id);
  if (stopped.error) throw stopped.error;
  const booking = await db.from('bookings').update({ status: 'payment_review', updated_at: new Date().toISOString() }).eq('stripe_session_id', result.data.stripe_session_id).eq('status', 'paid');
  if (booking.error) throw booking.error;
  return true;
}

async function deliverCreatorReceipt(db: any, purchase: any, product: any, profile: any, booking: any, recipient: 'buyer' | 'creator') {
  const sentAt = `${recipient}_email_sent_at`, startedAt = `${recipient}_email_started_at`;
  const current = await db.from('creator_purchases').select('*').eq('id', purchase.id).single();
  if (current.error || !current.data) throw current.error || new Error('Creator receipt unavailable');
  if (current.data[sentAt] || current.data.payment_status !== 'paid') return;
  const started = new Date().toISOString();
  const claimed = await db.from('creator_purchases').update({ [startedAt]: started }).eq('id', purchase.id)
    .eq('payment_status', 'paid').is(sentAt, null).or(`${startedAt}.is.null,${startedAt}.lt.${new Date(Date.now() - 120000).toISOString()}`).select('id');
  if (claimed.error || !claimed.data?.length) throw claimed.error || new Error('Creator receipt in progress; retry');
  try {
    let email = purchase.buyer_email;
    if (recipient === 'creator') {
      const owner = await db.auth.admin.getUserById(profile.user_id);
      if (owner.error || !owner.data?.user?.email) throw owner.error || new Error('Creator notification recipient unavailable');
      email = owner.data.user.email;
    }
    const latest = await db.from('creator_purchases').select('payment_status').eq('id', purchase.id).single();
    if (latest.error) throw latest.error;
    if (latest.data?.payment_status !== 'paid') {
      await db.from('creator_purchases').update({ [startedAt]: null }).eq('id', purchase.id).eq(startedAt, started);
      return;
    }
    const origin = (Deno.env.get('FRONTEND_URL') || 'https://tapaway.co').replace(/\/$/, '');
    const download = `${Deno.env.get('SUPABASE_URL')}/functions/v1/download-product?token=${encodeURIComponent(purchase.access_token)}`;
    const time = booking ? `${booking.booking_date} at ${String(booking.start_time).slice(0, 5)} (${booking.timezone || 'UTC'})` : '';
    const title = product.title || 'Your purchase';
    const intro = recipient === 'buyer'
      ? booking ? `Your booking for ${title} is confirmed: ${time}. The creator will follow up with meeting details.` : `Thank you for purchasing ${title}. Your download is ready.`
      : booking ? `A customer has booked ${title}: ${time}. Open your dashboard for the booking details.` : `A customer purchased ${title}. Open your dashboard to view the sale.`;
    const url = recipient === 'creator' ? `${origin}/dashboard` : booking ? `${origin}/support` : download;
    const result = await sendEmailAndLog({ to: email, subject: booking ? `Booking confirmed: ${title}` : recipient === 'buyer' ? `Your purchase: ${title}` : `New sale: ${title}`,
      templateKey: `creator_${booking ? 'booking' : 'purchase'}_${recipient}`, profileId: profile.id, replyTo: 'tap@tapaway.co',
      idempotencyKey: `creator-receipt/${purchase.id}/${recipient}`,
      html: wrapEmail({ preheader: intro, headline: recipient === 'buyer' ? booking ? 'Your time is reserved.' : 'Your purchase is ready.' : 'You have a new customer.',
        introHtml: `<p>${escapeHtml(intro)}</p>`, bodyHtml: "", ctaLabel: recipient === 'creator' ? 'View dashboard' : booking ? 'Get help' : 'Download purchase', ctaUrl: escapeHtml(url),
        footerNote: !booking && recipient === 'buyer' ? 'Your private download link expires in 72 hours. Please do not share it.' : 'Questions? Reply to this email and we can help.' }),
      text: `${intro}\n\n${url}` });
    if (!result.ok) throw new Error('Creator receipt delivery failed; retry');
    const saved = await db.from('creator_purchases').update({ [sentAt]: new Date().toISOString(), [startedAt]: null }).eq('id', purchase.id).eq(startedAt, started).select('id');
    if (saved.error || !saved.data?.length) throw saved.error || new Error('Creator receipt lease lost; retry');
  } catch (error) {
    await db.from('creator_purchases').update({ [startedAt]: null }).eq('id', purchase.id).eq(startedAt, started);
    throw error;
  }
}
