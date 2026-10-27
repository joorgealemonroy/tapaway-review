/* Isolated payment-required hub activation checks. No external network or customer data. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { environment, load } = require('./check-personal-commerce.cjs');
const Stripe = require(path.join(process.env.QA_MODULES, 'stripe'));
const verifier = new Stripe('sk_test_fixture');
const PROFILE = '44444444-4444-4444-8444-444444444444';
const VERSION = '55555555-5555-4555-8555-555555555555';
let count = 0;
async function pass(name, check) { await check(); count++; console.log('PASS ' + name); }

async function fixture() {
  const s = environment();
  s.context.__mode = 'live';
  Object.assign(s.env, { RESEND_API_KEY: 'fixture', SUPABASE_URL: 'https://database.invalid', STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture' });
  const metadata = { commerce_version: 'hub_payment_v1', profile_id: PROFILE, request_version: VERSION };
  const session = { id: 'cs_live_fixture', livemode: true, mode: 'subscription', status: 'complete', payment_status: 'paid',
    metadata, customer: 'cus_fixture', subscription: 'sub_fixture', customer_details: { email: 'payer@example.invalid' } };
  const invoice = { id: 'in_fixture', livemode: true, subscription: 'sub_fixture', status: 'paid', paid: true, amount_paid: 2000, currency: 'usd', customer: 'cus_fixture', payment_intent: 'pi_fixture' };
  const subscription = { id: 'sub_fixture', livemode: true, status: 'active', customer: 'cus_fixture', metadata, latest_invoice: invoice,
    items: { data: [{ quantity: 1, price: { id: 'price_1UF9UkDg8DaTuVNZfeu06iQ6', unit_amount: 2000, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } } }] } };
  const request = { profile_id: PROFILE, request_version: VERSION, stripe_checkout_session_id: session.id, fulfilled_at: null };
  const profile = { id: PROFILE, username: 'fixturecafe', full_name: 'Fixture <Cafe>', user_id: 'existing_owner', email: 'owner@example.invalid',
    payment_state: 'payment_required', subscription_status: 'trialing', is_approved: true };
  s.sessions.set(session.id, session); s.subscriptions.set(subscription.id, subscription);
  s.db.rows('hub_payment_requests').push(request); s.db.rows('personal_profiles').push(profile);
  s.stripe.invoices = { retrieve: async id => { assert.equal(id, invoice.id); return invoice; } };
  const charge = { id:'ch_fixture',livemode:true,paid:true,payment_intent:'pi_fixture',amount_refunded:0,refunded:false,disputed:false };
  const payment = { id:'pi_fixture',livemode:true,status:'succeeded',currency:'usd',amount_received:2000,customer:'cus_fixture',latest_charge:charge };
  s.stripe.paymentIntents = { retrieve: async id => { assert.equal(id,payment.id);return payment; } };

  const rpc = s.db.rpc.bind(s.db); let activations = 0;
  s.db.rpc = async (name, args) => {
    if (name === 'record_payment_reversal') {
      const result = await rpc(name,args);
      if(args._subscription_id === request.stripe_subscription_id) {
        request.payment_hold_at ||= new Date().toISOString();request.payment_hold_reason=args._reason;
        Object.assign(profile,{payment_state:'past_due',subscription_status:'past_due',is_approved:false});
      }
      return result;
    }
    if (name === 'hold_hub_payment_by_subscription') {
      assert.equal(args._subscription_id, request.stripe_subscription_id);
      request.payment_hold_at ||= new Date().toISOString(); request.payment_hold_reason ||= args._reason;
      Object.assign(profile,{payment_state:'past_due',subscription_status:'past_due',is_approved:false}); return { data: true, error: null };
    }
    if (name !== 'fulfill_hub_payment') return rpc(name, args);
    if (request.payment_hold_at) return {data:{activated:false,held:true,reviewRequired:true},error:null};
    if (s.fulfillFailure) { s.fulfillFailure = false; return { data: null, error: new Error('Injected fulfillment failure') }; }
    assert.equal(args._profile_id, PROFILE); assert.equal(args._request_version, VERSION); assert.equal(args._session_id, request.stripe_checkout_session_id);
    if (!request.fulfilled_at) {
      activations++;
      Object.assign(profile, { payment_state: 'paying', subscription_status: 'active', stripe_subscription_id: args._subscription_id, stripe_customer_id: args._customer_id, stripe_billing_email: args._billing_email });
      request.fulfilled_at = new Date().toISOString(); request.stripe_subscription_id = args._subscription_id;
    }
    return { data: { activated: true, alreadyFulfilled: activations === 0 }, error: null };
  };
  s.context.fetch = async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails', 'Real network calls are prohibited');
    s.calls.emails.push({ body: JSON.parse(init.body), headers: init.headers });
    if (s.emailFailure) { s.emailFailure = false; return new Response('temporarily unavailable', { status: 503 }); }
    return new Response(JSON.stringify({ id: 'email_fixture' }), { status: 200 });
  };
  const api = await load('supabase/functions/_shared/hubPaymentActivation.ts', s);
  return { s, api, session, subscription, invoice, payment, charge, request, profile, activations: () => activations };
}

async function signedWebhook(f) {
  delete f.s.context.__handler;
  const h = await load('supabase/functions/payment-first-webhook/index.ts', f.s);
  return (id, type, object) => {
    const payload = JSON.stringify({ id, type, livemode: true, data: { object } });
    return h(new Request('https://functions.invalid/webhook', { method: 'POST', headers: {
      'stripe-signature': verifier.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fixture' }),
    }, body: payload }));
  };
}

function chargeFixture(f, refunded = true) {
  const charge = { id: 'ch_fixture', livemode: true, refunded, customer: 'cus_fixture', invoice: 'in_fixture', payment_intent: 'pi_fixture' };
  f.s.stripe.charges = { retrieve: async id => { assert.equal(id, charge.id); return charge; } };
  return charge;
}

(async () => {
  await pass('Paid hub resumes once without changing owner, contact email or adding accounts', async () => {
    const f = await fixture();
    await f.api.activateHubPayment(f.s.stripe, f.session); await f.api.activateHubPayment(f.s.stripe, f.session);
    assert.equal(f.activations(), 1); assert.equal(f.profile.payment_state, 'paying'); assert.equal(f.profile.user_id, 'existing_owner');
    assert.equal(f.profile.email, 'owner@example.invalid'); assert.equal(f.s.db.users.size, 0); assert.equal(f.s.calls.emails.length, 1);
    assert.ok(f.request.welcome_email_sent_at); assert.equal(f.s.db.rows('email_sends')[0].template_key, 'hub_payment_receipt');
    assert.match(f.s.calls.emails[0].body.html, /Fixture &lt;Cafe&gt;/); assert.match(f.s.calls.emails[0].body.html, /\$20 per month/);
    assert.doesNotMatch(f.s.calls.emails[0].body.html, /token=|auth\/magic/);
  });
  await pass('Unpaid, incomplete and free sessions do not grant access or send mail', async () => {
    for (const patch of [{ payment_status: 'unpaid' }, { payment_status: 'no_payment_required' }, { status: 'open' }, { mode: 'payment' }]) {
      const f = await fixture(); Object.assign(f.session, patch); await f.api.activateHubPayment(f.s.stripe, f.session);
      assert.equal(f.activations(), 0); assert.equal(f.s.calls.emails.length, 0);
    }
  });
  await pass('TEST events and TEST subscriptions never unlock a production hub', async () => {
    for (const target of ['mode', 'session', 'subscription']) {
      const f = await fixture(); if (target === 'mode') f.s.context.__mode = 'test'; else f[target].livemode = false;
      await assert.rejects(() => f.api.activateHubPayment(f.s.stripe, f.session), /environment mismatch/); assert.equal(f.activations(), 0);
    }
  });
  await pass('Wrong request, session, customer, price, quantity and recurrence are rejected', async () => {
    for (const kind of ['request', 'session', 'customer', 'price', 'quantity', 'currency', 'amount', 'interval', 'count', 'extra']) {
      const f = await fixture(), item = f.subscription.items.data[0];
      if (kind === 'request') f.request.request_version = 'different';
      if (kind === 'session') f.request.stripe_checkout_session_id = 'cs_live_other';
      if (kind === 'customer') f.subscription.customer = 'cus_other';
      if (kind === 'price') item.price.id = 'price_other';
      if (kind === 'quantity') item.quantity = 2;
      if (kind === 'currency') item.price.currency = 'eur';
      if (kind === 'amount') item.price.unit_amount = 100;
      if (kind === 'interval') item.price.recurring.interval = 'year';
      if (kind === 'count') item.price.recurring.interval_count = 2;
      if (kind === 'extra') f.subscription.items.data.push(item);
      await assert.rejects(() => f.api.activateHubPayment(f.s.stripe, f.session)); assert.equal(f.activations(), 0);
    }
  });
  await pass('Stale paid events cannot revive canceled, past-due or trialing subscriptions', async () => {
    for (const status of ['canceled', 'past_due', 'trialing', 'unpaid']) {
      const f = await fixture(); f.subscription.status = status; await f.api.activateHubPayment(f.s.stripe, f.session);
      assert.equal(f.activations(), 0); assert.equal(f.profile.payment_state, 'payment_required');
    }
  });
  await pass('Active subscription alone is insufficient until the latest invoice is paid', async () => {
    for (const patch of [{ status: 'open', paid: false }, { amount_paid: 0 }, { currency: 'eur' }, { customer: 'cus_other' }]) {
      const f = await fixture(); Object.assign(f.invoice, patch); await f.api.activateHubPayment(f.s.stripe, f.session); assert.equal(f.activations(), 0);
    }
  });
  await pass('Refunded, disputed or mismatched current charges cannot reactivate a paused hub', async () => {
    for (const patch of [{refunded:true},{disputed:true},{amount_refunded:1},{paid:false},{payment_intent:'pi_other'},{livemode:false}]) {
      const f=await fixture();Object.assign(f.charge,patch);await f.api.activateHubPayment(f.s.stripe,f.session);
      assert.equal(f.activations(),0);assert.equal(f.s.calls.emails.length,0);
    }
  });
  await pass('A reversal clamped by atomic fulfillment never emits a success receipt', async () => {
    const f=await fixture(),rpc=f.s.db.rpc.bind(f.s.db);
    f.s.db.rpc=async(name,args)=>name==='fulfill_hub_payment'?{data:{activated:false,held:true,reviewRequired:true},error:null}:rpc(name,args);
    assert.equal((await f.api.activateHubPayment(f.s.stripe,f.session)).skipped,'payment_review');
    assert.equal(f.activations(),0);assert.equal(f.s.calls.emails.length,0);
  });
  await pass('Webhook retrieves current Checkout truth rather than trusting supplied paid fields', async () => {
    const f = await fixture(), stale = { ...f.session }; f.session.payment_status = 'unpaid';
    await f.api.activateHubPayment(f.s.stripe, stale); assert.equal(f.activations(), 0);
  });
  await pass('Failed fulfillment remains retryable and never sends a success receipt early', async () => {
    const f = await fixture(); f.s.fulfillFailure = true;
    await assert.rejects(() => f.api.activateHubPayment(f.s.stripe, f.session)); assert.equal(f.s.calls.emails.length, 0);
    await f.api.activateHubPayment(f.s.stripe, f.session); assert.equal(f.activations(), 1); assert.equal(f.s.calls.emails.length, 1);
  });
  await pass('Receipt failures retry after activation with the same provider idempotency key', async () => {
    const f = await fixture(); f.s.emailFailure = true;
    await assert.rejects(() => f.api.activateHubPayment(f.s.stripe, f.session), /receipt delivery failed/);
    assert.equal(f.activations(), 1); assert.equal(f.request.welcome_email_sent_at, undefined);
    await f.api.activateHubPayment(f.s.stripe, f.session); assert.equal(f.activations(), 1); assert.ok(f.request.welcome_email_sent_at);
    assert.equal(f.s.calls.emails[0].headers['Idempotency-Key'], `hub-payment-receipt/${VERSION}`);
    assert.equal(f.s.calls.emails[1].headers['Idempotency-Key'], f.s.calls.emails[0].headers['Idempotency-Key']);
  });
  await pass('Concurrent valid webhooks hold one email lease and one fulfillment', async () => {
    const f = await fixture(); const results = await Promise.allSettled([f.api.activateHubPayment(f.s.stripe, f.session), f.api.activateHubPayment(f.s.stripe, f.session)]);
    assert.ok(results.some(r => r.status === 'fulfilled')); assert.equal(f.activations(), 1); assert.equal(f.s.calls.emails.length, 1);
    await f.api.activateHubPayment(f.s.stripe, f.session); assert.equal(f.s.calls.emails.length, 1);
  });
  await pass('Invoice-first delivery activates the stored checkout and lifecycle blocks unpaid renewals', async () => {
    const f = await fixture(); assert.equal(await f.api.syncHubPaymentSubscription(f.s.stripe, 'sub_fixture'), true);
    assert.equal(f.activations(), 1); f.invoice.paid = false; f.invoice.status = 'open';
    await f.api.syncHubPaymentSubscription(f.s.stripe, 'sub_fixture'); assert.equal(f.profile.subscription_status, 'past_due');
    f.subscription.status = 'canceled'; await f.api.syncHubPaymentSubscription(f.s.stripe, 'sub_fixture'); assert.equal(f.profile.subscription_status, 'canceled');
    await f.api.activateHubPayment(f.s.stripe, f.session); assert.equal(f.profile.subscription_status, 'canceled');
  });
  await pass('Invoice-first receipt failure is delivered on the invoice retry after fulfillment', async () => {
    const f = await fixture(); f.s.emailFailure = true;
    await assert.rejects(() => f.api.syncHubPaymentSubscription(f.s.stripe, 'sub_fixture'));
    assert.equal(f.activations(), 1); assert.equal(f.request.welcome_email_sent_at, undefined);
    await f.api.syncHubPaymentSubscription(f.s.stripe, 'sub_fixture'); assert.ok(f.request.welcome_email_sent_at);
    assert.equal(f.activations(), 1); assert.equal(f.s.calls.emails.length, 2);
  });
  await pass('Signed new-flow webhook activates; missing signatures and wrong environment cannot write', async () => {
    const f = await fixture(); const h = await load('supabase/functions/payment-first-webhook/index.ts', f.s);
    const deliver = (id, livemode = true, signed = true) => {
      const payload = JSON.stringify({ id, type: 'checkout.session.completed', livemode, data: { object: f.session } });
      return h(new Request('https://functions.invalid/webhook', { method: 'POST', headers: signed ? { 'stripe-signature': verifier.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fixture' }) } : {}, body: payload }));
    };
    assert.equal((await deliver('evt_missing', true, false)).status, 400); assert.equal((await deliver('evt_test', false)).status, 400); assert.equal(f.activations(), 0);
    assert.equal((await deliver('evt_hub_paid')).status, 200); assert.equal((await deliver('evt_hub_paid')).status, 200); assert.equal(f.activations(), 1);
  });
  await pass('Legacy webhook skips the new purchase before generic account or restaurant writes', async () => {
    const f = await fixture(); const h = await load('supabase/functions/stripe-webhook/index.ts', f.s);
    const payload = JSON.stringify({ id: 'evt_legacy_skip', type: 'checkout.session.completed', livemode: true, data: { object: f.session } });
    const result = await h(new Request('https://functions.invalid/webhook', { method: 'POST', headers: { 'stripe-signature': verifier.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fixture' }) }, body: payload }));
    assert.equal(result.status, 200); assert.equal((await result.json()).skipped, 'hub_payment'); assert.equal(f.activations(), 0);
    assert.equal(f.s.db.users.size, 0); assert.equal(f.s.db.rows('restaurants').length, 0); assert.equal(f.s.calls.emails.length, 0);
  });
  await pass('A signed full refund holds only its fulfilled hub without canceling billing', async () => {
    const f = await fixture(); await f.api.activateHubPayment(f.s.stripe, f.session);
    f.s.db.rows('personal_profiles').push({ id: 'unrelated', payment_state: 'paying', subscription_status: 'active' });
    const charge = chargeFixture(f), send = await signedWebhook(f);
    assert.equal((await send('evt_full_refund', 'charge.refunded', charge)).status, 200);
    assert.ok(f.request.payment_hold_at); assert.equal(f.request.payment_hold_reason, 'refunded'); assert.equal(f.profile.payment_state, 'past_due');
    assert.equal(f.s.db.rows('personal_profiles')[1].payment_state, 'paying'); assert.equal(f.s.calls.canceled.length, 0);
  });
  await pass('Stale refund event without a current refund does not suspend the hub', async () => {
    const f = await fixture(); await f.api.activateHubPayment(f.s.stripe, f.session);
    const charge = chargeFixture(f, false), send = await signedWebhook(f);
    assert.equal((await send('evt_partial_refund', 'charge.refunded', { ...charge, refunded: true })).status, 200);
    assert.equal(f.request.payment_hold_at, undefined); assert.equal(f.profile.payment_state, 'paying');
  });
  await pass('A real partial refund holds hosted access for review without claiming a full refund', async () => {
    const f=await fixture();await f.api.activateHubPayment(f.s.stripe,f.session);
    const charge=chargeFixture(f,false);charge.amount_refunded=100;const send=await signedWebhook(f);
    assert.equal((await send('evt_actual_partial','charge.refunded',charge)).status,200);
    assert.equal(f.request.payment_hold_reason,'partial_refund');assert.equal(f.profile.payment_state,'past_due');
    assert.equal(f.profile.is_approved,false);assert.equal(f.s.calls.canceled.length,0);
  });
  await pass('A refund on an unrelated subscription cannot hold this hub', async () => {
    const f = await fixture(); await f.api.activateHubPayment(f.s.stripe, f.session);
    const charge = chargeFixture(f), send = await signedWebhook(f);
    f.s.stripe.invoices.retrieve = async () => ({ ...f.invoice, subscription: 'sub_other' });
    assert.equal((await send('evt_unrelated_refund', 'charge.refunded', charge)).status, 200);
    assert.equal(f.request.payment_hold_at, undefined); assert.equal(f.profile.payment_state, 'paying');
  });
  await pass('A signed dispute creates a durable hold even when Stripe subscription remains active', async () => {
    const f = await fixture(); await f.api.activateHubPayment(f.s.stripe, f.session);
    const charge = chargeFixture(f, false), send = await signedWebhook(f);
    assert.equal((await send('evt_dispute_created', 'charge.dispute.created', { id: 'dp_fixture', charge: charge.id })).status, 200);
    assert.equal(f.request.payment_hold_reason, 'disputed'); assert.equal(f.profile.payment_state, 'past_due'); assert.equal(f.subscription.status, 'active');
  });
  await pass('Stale paid checkout and invoice events never release a payment hold or send a receipt', async () => {
    const f = await fixture(); f.s.emailFailure = true;
    await assert.rejects(() => f.api.activateHubPayment(f.s.stripe, f.session));
    const charge = chargeFixture(f), send = await signedWebhook(f);
    assert.equal((await send('evt_refund_before_receipt', 'charge.refunded', charge)).status, 200);
    assert.equal((await send('evt_late_checkout', 'checkout.session.completed', f.session)).status, 200);
    assert.equal((await send('evt_late_invoice', 'invoice.paid', { ...f.invoice, object: 'invoice', lines: { data: [] } })).status, 200);
    assert.equal(f.profile.payment_state, 'past_due'); assert.equal(f.s.calls.emails.length, 1); assert.equal(f.request.welcome_email_sent_at, undefined);
    assert.equal(f.activations(), 1);
  });
  await pass('Stale event invoice fields cannot override current Stripe charge mapping', async () => {
    const f = await fixture(); await f.api.activateHubPayment(f.s.stripe, f.session);
    const charge = chargeFixture(f), send = await signedWebhook(f);
    assert.equal((await send('evt_invoice_stale', 'charge.refunded', { ...charge, invoice: 'in_old' })).status, 200);
    assert.equal(f.profile.payment_state, 'past_due'); assert.ok(f.request.payment_hold_at);
  });
  await pass('A refund event without invoice still holds the hub through the retrieved charge', async () => {
    const f = await fixture(); await f.api.activateHubPayment(f.s.stripe, f.session);
    const charge = chargeFixture(f), send = await signedWebhook(f);
    const { invoice: omitted, ...modernEvent } = charge;
    assert.equal((await send('evt_without_invoice', 'charge.refunded', modernEvent)).status, 200);
    assert.equal(f.profile.payment_state, 'past_due'); assert.equal(f.request.payment_hold_reason, 'refunded');
  });
  console.log(`${count} hub payment activation checks passed. No external traffic.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
