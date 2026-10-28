// Exercise the actual edge handler. All provider/database calls are isolated.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { environment, load, request } = require('./check-personal-commerce.cjs');
const file = 'supabase/functions/hub-payment-request/index.ts';
let checks = 0;
async function pass(name, fn) { await fn(); checks++; console.log('PASS ' + name); }
async function state() {
  const s = environment(); s.context.__mode = 'live'; s.context.Deno.serve = h => s.context.__handler = h;
  const profileId = randomUUID(), version = randomUUID();
  s.offer = { profileId, requestVersion: version, username: 'fixture-burger', displayName: 'Fixture Burger',
    amount: 2000, currency: 'usd', interval: 'month', cardQuantity: 4,
    email: 'private@example.invalid', user_id: 'private-user', metrics: { views: 143, linkClicks: 65,
      googleClicks: 30, yelpClicks: 20, instagramClicks: 15, historicalViews: 8 } };
  s.row = { profile_id: profileId, request_version: version, checkout_attempt_id: randomUUID(), fulfilled_at: null };
  s.db.rows('hub_payment_requests').push(s.row);
  s.profile = { id: profileId, username: 'fixture-burger', is_approved: true, subscription_status: 'trialing', payment_state: 'payment_required' };
  s.db.rows('personal_profiles').push(s.profile);
  const rpc = s.db.rpc.bind(s.db);
  s.db.rpc = async (name, args) => {
    if (name === 'get_hub_payment_offer') return { data: args._slug === s.offer.username && !s.row.fulfilled_at ? s.offer : null };
    if (name === 'require_hub_payment') { s.requireCalls = (s.requireCalls || 0) + 1; return { data: version }; }
    return rpc(name, args);
  };
  s.stripe.prices.retrieve = async id => ({ id, active: true, type: 'recurring', currency: 'usd', unit_amount: 2000,
    livemode: true, recurring: { interval: 'month', interval_count: 1 }, product: { id: 'prod_fixture', active: true, metadata: { tapaway_plan: 'solo' } } });
  const create = s.stripe.checkout.sessions.create;
  s.stripe.checkout.sessions.create = async (...args) => {
    const session = await create(...args);
    if (!session.livemode) { s.sessions.delete(session.id); session.id = session.id.replace('cs_test_', 'cs_live_');
      session.livemode = true; session.expires_at = Math.floor(Date.now()/1000) + 86400; s.sessions.set(session.id, session); }
    return session;
  };
  s.handler = await load(file, s);
  s.call = body => s.handler(request({ slug: 'fixture-burger', ...body }));
  return s;
}
(async () => {
  await pass('Public summary contains real aggregates, not private identity or request credentials', async () => {
    const s = await state(), res = await s.call({ action: 'summary' }), body = await res.json();
    assert.equal(res.status, 200); assert.equal(body.offer.visits, 143); assert.equal(body.offer.totalClicks, 65);
    assert.equal(body.checkoutAvailable, true); assert.equal(body.offer.cardCount, 4);
    assert.doesNotMatch(JSON.stringify(body), /private|requestVersion|request_version|visitor_info/);
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });
  await pass('Other hubs are not offered an activation checkout', async () => {
    const s = await state(); assert.equal((await s.call({ action: 'summary', slug: 'other' }).then(r => r.json())).offer, null);
    assert.equal((await s.call({ action: 'checkout', slug: 'other' })).status, 409); assert.equal(s.calls.checkout.length, 0);
  });
  await pass('Only a verified admin can require payment with explicit confirmation', async () => {
    const s = await state(), body = { action: 'require', profileId: s.profile.id, confirm: true };
    assert.equal((await s.call(body)).status, 403); s.context.__auth = { user: { id: 'customer' } };
    assert.equal((await s.call(body)).status, 403); s.context.__admin = true;
    assert.equal((await s.call({ ...body, confirm: false })).status, 400);
    assert.equal((await s.call(body)).status, 200); assert.equal(s.requireCalls, 1);
  });
  await pass('Bad methods, oversized input and malformed action never reach Stripe', async () => {
    const s = await state(); assert.equal((await s.handler(new Request('https://fixture.invalid'))).status, 405);
    assert.equal((await s.call({ action: 'checkout', text: 'x'.repeat(5000) })).status, 400);
    assert.equal((await s.call({ action: 'unknown' })).status, 400);
    assert.equal((await s.call({ action: 'checkout', slug: '../admin' })).status, 400); assert.equal(s.calls.checkout.length, 0);
  });
  await pass('Unavailable or wrong Stripe prices disable payment rather than create a replacement', async () => {
    const s = await state(); s.stripe.prices.retrieve = async () => ({ active: true, type: 'recurring', currency: 'usd', unit_amount: 1 });
    assert.equal((await s.call({ action: 'summary' }).then(r => r.json())).checkoutAvailable, false);
    assert.equal((await s.call({ action: 'checkout' })).status, 503); assert.equal(s.calls.checkout.length, 0);
  });
  await pass('Checkout is exactly $20 monthly with no trial, upsell, shipping or ownership grant', async () => {
    const s = await state(); assert.equal((await s.call({ action: 'checkout' })).status, 200);
    const p = s.calls.checkout[0]; assert.equal(p.mode, 'subscription'); assert.equal(p.line_items.length, 1);
    assert.equal(p.line_items[0].price, 'price_1UF9UkDg8DaTuVNZfeu06iQ6'); assert.equal(p.line_items[0].quantity, 1);
    for (const key of ['trial_period_days', 'trial_end']) assert.equal(p.subscription_data[key], undefined);
    for (const key of ['allow_promotion_codes', 'shipping_address_collection', 'customer', 'customer_email', 'payment_method_types']) assert.equal(p[key], undefined);
    assert.equal(p.metadata.commerce_version, 'hub_payment_v1'); assert.match(p.success_url, /fixture-burger\?activation=success/);
    assert.equal(s.profile.payment_state, 'payment_required'); assert.equal(s.db.users.size, 0);
  });
  await pass('Repeated and concurrent checkout requests cannot create two open subscriptions', async () => {
    const s = await state(), result = await Promise.all([s.call({ action: 'checkout' }), s.call({ action: 'checkout' })]);
    assert.ok(result.some(x => x.status === 200)); assert.ok(result.every(x => [200, 409].includes(x.status))); assert.equal(s.calls.checkout.length, 1);
    assert.equal((await s.call({ action: 'checkout' })).status, 200); assert.equal(s.calls.checkout.length, 1);
  });
  await pass('A confirmed expired session permits a new attempt; a completed one never does', async () => {
    const s = await state(); await s.call({ action: 'checkout' }); const old = s.sessions.get(s.row.stripe_checkout_session_id);
    old.status = 'expired'; assert.equal((await s.call({ action: 'checkout' })).status, 200); assert.equal(s.calls.checkout.length, 2);
    s.sessions.get(s.row.stripe_checkout_session_id).status = 'complete';
    assert.equal((await s.call({ action: 'checkout' })).status, 409); assert.equal(s.calls.checkout.length, 2);
  });
  await pass('Provider timeout after creation retries the same persisted attempt', async () => {
    const s = await state(), create = s.stripe.checkout.sessions.create; let once = true;
    s.stripe.checkout.sessions.create = async (...args) => { const session = await create(...args); if (once) { once = false; throw new Error('ambiguous timeout'); } return session; };
    assert.equal((await s.call({ action: 'checkout' })).status, 503); const attempt = s.row.checkout_attempt_id;
    s.row.checkout_started_at = new Date(Date.now()-180000).toISOString();
    assert.equal((await s.call({ action: 'checkout' })).status, 200); assert.equal(s.row.checkout_attempt_id, attempt); assert.equal(s.calls.checkout.length, 1);
  });
  await pass('Database failure after session creation preserves idempotency on retry', async () => {
    const s = await state(), create = s.stripe.checkout.sessions.create; let once = true;
    s.stripe.checkout.sessions.create = async (...args) => { const session = await create(...args); if (once) { once = false; s.db.failures.set('hub_payment_requests:update', 1); } return session; };
    assert.equal((await s.call({ action: 'checkout' })).status, 503); s.row.checkout_started_at = new Date(Date.now()-180000).toISOString();
    assert.equal((await s.call({ action: 'checkout' })).status, 200); assert.equal(s.calls.checkout.length, 1);
  });
  await pass('An old ambiguous checkout cannot recreate a charge after provider idempotency expires', async () => {
    const s = await state(); s.row.checkout_attempt_created_at = new Date(Date.now()-24*60*60*1000).toISOString();
    assert.equal((await s.call({ action: 'checkout' })).status, 409); assert.equal(s.calls.checkout.length, 0);
  });
  await pass('Success URL alone cannot activate a hub; status binds to its stored session', async () => {
    const s = await state(); await s.call({ action: 'checkout' }); const session = s.sessions.get(s.row.stripe_checkout_session_id);
    const read = sessionId => s.call({ action: 'status', sessionId }).then(r => r.json());
    assert.deepEqual(await read('cs_live_forged'), { paid: false, active: false });
    assert.deepEqual(await read(session.id), { paid: false, active: false });
    Object.assign(session, { status: 'complete', payment_status: 'paid' });
    assert.deepEqual(await read(session.id), { paid: true, active: false }); assert.equal(s.profile.payment_state, 'payment_required');
    Object.assign(s.row, { fulfilled_at: new Date().toISOString(), stripe_subscription_id: 'sub_fixture' });
    Object.assign(s.profile, { payment_state: 'paying', subscription_status: 'active', stripe_subscription_id: 'sub_fixture' });
    s.subscriptions.set('sub_fixture', { livemode: true, status: 'active' }); assert.deepEqual(await read(session.id), { paid: true, active: true });
    s.subscriptions.get('sub_fixture').status = 'canceled'; assert.deepEqual(await read(session.id), { paid: true, active: false });
  });
  await pass('TEST mode and missing durable limits fail closed', async () => {
    const s = await state(); s.context.__mode = 'test'; assert.equal((await s.call({ action: 'checkout' })).status, 503);
    s.context.__mode = 'live'; s.db.rpc = async () => ({ error: new Error('Quota unavailable') });
    assert.equal((await s.call({ action: 'checkout' })).status, 503); assert.equal(s.calls.checkout.length, 0);
  });
  console.log(`${checks} hub payment request checks passed. No external services were contacted.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
