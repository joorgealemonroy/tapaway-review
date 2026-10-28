// Isolated relaunch checks: real handlers, no external provider traffic.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { environment, load, request } = require('./check-personal-commerce.cjs');
let checks = 0;
const pass = async (label, run) => { await run(); checks++; console.log('PASS ' + label); };
const purchase = () => ({ checkoutVersion: 2, checkoutAttemptId: randomUUID(), plan: 'solo', interval: 'month', cardClub: false, business: { name: 'Fixture Cafe', city: 'Fixture, CA' } });
async function checkoutFixture() { const s = environment(), h = await load('supabase/functions/payment-first-checkout/index.ts', s); return { s, h, body: purchase() }; }
async function paidFixture(existing = false) {
  const f = await checkoutFixture(); assert.equal((await f.h(request(f.body))).status, 200);
  const intent = f.s.db.rows('checkout_intents')[0], session = [...f.s.sessions.values()][0];
  Object.assign(session, { status: 'complete', payment_status: 'paid', customer: 'cus_fixture', subscription: 'sub_fixture', customer_details: { email: 'buyer@example.invalid' } });
  f.s.subscriptions.set('sub_fixture', { id: 'sub_fixture', livemode: false, customer: 'cus_fixture', status: 'active', items: { data: [{ price: { id: intent.main_price_id } }] } });
  if (existing) f.s.db.users.set('buyer@example.invalid', { id: 'known_owner', email: 'buyer@example.invalid' });
  delete f.s.context.__handler;
  const api = await load('supabase/functions/_shared/paymentFirstActivation.ts', f.s);
  await api.activateCheckout(f.s.stripe, session);
  return { ...f, intent, session };
}
(async () => {
  await pass('Business checkout accepts only bounded POST objects', async () => {
    const { s, h } = await checkoutFixture();
    assert.equal((await h(new Request('https://fixture.invalid'))).status, 405);
    for (const body of [null, [], { value: 'x'.repeat(18000) }, { ...purchase(), checkoutAttemptId: 'not-a-uuid' }]) assert.equal((await h(request(body))).status, 400);
    assert.equal(s.calls.checkout.length, 0); assert.equal(s.db.rows('checkout_intents').length, 0);
  });
  await pass('The same checkout attempt reuses one intent and Stripe session', async () => {
    const { s, h, body } = await checkoutFixture();
    const a = await h(request(body)), b = await h(request(body)); assert.equal(a.status, 200); assert.equal(b.status, 200);
    assert.deepEqual(await a.json(), await b.json()); assert.equal(s.calls.checkout.length, 1); assert.equal(s.db.rows('checkout_intents').length, 1);
    assert.notEqual(s.db.rows('checkout_intents')[0].checkout_attempt_hash, body.checkoutAttemptId);
  });
  await pass('Simultaneous checkout requests converge through the unique attempt and Stripe idempotency', async () => {
    const { s, h, body } = await checkoutFixture();
    const results = await Promise.all([h(request(body)), h(request(body))]); assert.ok(results.every(r => r.status === 200));
    assert.equal(s.calls.checkout.length, 1); assert.equal(s.db.rows('checkout_intents').length, 1);
  });
  await pass('A retry cannot swap the selected plan or reuse an expired checkout', async () => {
    const { s, h, body } = await checkoutFixture(); await h(request(body));
    const changed = await h(request({ ...body, plan: 'venue' })); assert.equal(changed.status, 409); assert.equal((await changed.json()).code, 'checkout_changed');
    [...s.sessions.values()][0].status = 'expired'; const expired = await h(request(body)); assert.equal(expired.status, 409); assert.equal((await expired.json()).code, 'checkout_expired');
    assert.equal(s.calls.checkout.length, 1);
  });
  await pass('A lost session-save response recovers the same Stripe session without a second subscription', async () => {
    const { s, h, body } = await checkoutFixture(); s.db.failures.set('checkout_intents:update', 1);
    assert.equal((await h(request(body))).status, 500); assert.equal((await h(request({ ...body, attribution: { utm_source: 'changed-on-retry' } }))).status, 200);
    assert.equal(s.calls.checkout.length, 1); assert.equal(s.db.rows('checkout_intents').length, 1); assert.ok(s.db.rows('checkout_intents')[0].stripe_checkout_session_id);
  });
  await pass('Complete checkout retries return to welcome instead of creating another purchase', async () => {
    const f = await paidFixture(); const response = await f.h(request(f.body)); assert.equal(response.status, 200);
    assert.match((await response.json()).url, /\/welcome\?session_id=/); assert.equal(f.s.calls.checkout.length, 1);
  });
  await pass('A database reversal hold wins over a stale business activation write', async () => {
    const f = await checkoutFixture(); await f.h(request(f.body));
    const intent = f.s.db.rows('checkout_intents')[0], session = [...f.s.sessions.values()][0];
    Object.assign(session, { status:'complete',payment_status:'paid',customer:'cus_fixture',subscription:'sub_fixture',customer_details:{email:'buyer@example.invalid'} });
    f.s.subscriptions.set('sub_fixture',{id:'sub_fixture',livemode:false,customer:'cus_fixture',status:'active',items:{data:[{price:{id:intent.main_price_id}}]}});
    const from = f.s.db.from.bind(f.s.db);
    f.s.db.from = table => { const query = from(table), then = query.then.bind(query);
      query.then = (resolve,reject) => then(result => {
        if(table === 'checkout_intents' && query.action === 'update' && query.value.stripe_subscription_id) {
          intent.payment_hold_at = new Date().toISOString(); intent.status = 'needs_review';
        }
        return resolve(result);
      },reject); return query; };
    delete f.s.context.__handler;
    const api = await load('supabase/functions/_shared/paymentFirstActivation.ts',f.s);
    assert.equal((await api.activateCheckout(f.s.stripe,session)).onHold,true);
    assert.equal(f.s.db.rows('onboarding_sessions').length,0);assert.equal(f.s.db.rows('personal_profiles').length,0);
    assert.equal(f.s.calls.emails.length,0);assert.equal(intent.activated_at,undefined);
  });
  await pass('A paid Checkout session never returns an Auth token for a new or existing account', async () => {
    for (const existing of [false, true]) {
      const f = await paidFixture(existing); const h = await load('supabase/functions/payment-first-welcome/index.ts', f.s);
      let generated = 0; f.s.db.auth.admin.generateLink = async () => { generated++; throw new Error('No auth secret may be issued from session ID'); };
      const response = await h(request({ session_id: f.session.id })); assert.equal(response.status, 200);
      const body = await response.json(); assert.equal(body.status, 'verify_email'); assert.equal(body.token_hash, undefined); assert.equal(generated, 0);
      assert.doesNotMatch(JSON.stringify(body), /buyer@example\.invalid|access_token|refresh_token/);
    }
  });
  await pass('Unconfirmed authenticated email cannot attach a pending purchase', async () => {
    const f = await paidFixture(true); f.s.context.__user = { id: 'known_owner', email: 'buyer@example.invalid' };
    const h = await load('supabase/functions/payment-first-onboarding/index.ts', f.s); assert.equal((await h(request({ action: 'state' }))).status, 403);
    assert.equal(f.intent.status, 'pending_association'); assert.equal(f.s.db.rows('personal_profiles').length, 0);
  });
  await pass('Verified email can attach its purchase and interrupted setup repairs on retry', async () => {
    const f = await paidFixture(true); f.s.context.__user = { id: 'known_owner', email: 'buyer@example.invalid', email_confirmed_at: new Date().toISOString() };
    const h = await load('supabase/functions/payment-first-onboarding/index.ts', f.s); f.s.db.failures.set('personal_profiles:upsert', 1);
    assert.equal((await h(request({ action: 'state' }))).status, 500); assert.equal(f.intent.status, 'pending_association');
    assert.equal((await h(request({ action: 'state' }))).status, 200); assert.equal(f.intent.status, 'associated');
    assert.equal(f.s.db.rows('personal_profiles').length, 1); assert.equal(f.s.db.rows('personal_profiles')[0].user_id, 'known_owner');
    assert.equal((await h(request({ action: 'state' }))).status, 200); assert.equal(f.s.db.rows('personal_profiles').length, 1);
  });
  await pass('Malformed setup cannot mutate an otherwise valid pending association', async () => {
    const f = await paidFixture(true); f.s.context.__user = { id: 'known_owner', email: 'buyer@example.invalid', email_confirmed_at: new Date().toISOString() };
    const h = await load('supabase/functions/payment-first-onboarding/index.ts', f.s);
    assert.equal((await h(new Request('https://fixture.invalid'))).status, 405); assert.equal((await h(request({ action: 'state', big: 'x'.repeat(5000) }))).status, 400);
    assert.equal(f.intent.status, 'pending_association'); assert.equal(f.s.db.rows('personal_profiles').length, 0);
  });
  await pass('A paid session and mutable setup flags cannot authorize a password reset', async () => {
    const s = environment(), h = await load('supabase/functions/set-user-password/index.ts', s);
    let writes = 0; s.db.auth.admin.updateUserById = async () => { writes++; return { error: null }; };
    assert.equal((await h(request({ userId: 'victim', password: 'fixture-target-password', sessionId: 'cs_live_stolen' }))).status, 401);
    s.context.__auth = { user: { id: 'victim', user_metadata: { must_set_password: true }, last_sign_in_at: null } };
    assert.equal((await h(request({ userId: 'victim', password: 'fixture-target-password', sessionId: 'cs_live_stolen' }))).status, 401); assert.equal(writes, 0);
  });
  await pass('Password changes use the verified current user and reject a different target', async () => {
    const s = environment(); let changed = 0;
    s.context.__auth = { user: { id: 'owner', email_confirmed_at: new Date().toISOString(), user_metadata: {} }, userClient: { auth: { updateUser: async () => { changed++; return { error: null }; } } } };
    const h = await load('supabase/functions/set-user-password/index.ts', s);
    assert.equal((await h(request({ userId: 'victim', password: 'fixture-safe-passphrase' }))).status, 403);
    assert.equal((await h(request({ userId: 'owner', password: 'fixture-safe-passphrase' }))).status, 200); assert.equal(changed, 1);
  });
  await pass('Legacy Checkout lookup is read-only and requires an existing verified owner association', async () => {
    const s = environment(), h = await load('supabase/functions/lookup-stripe-session/index.ts', s);
    const body = { sessionId: 'cs_test_fixture' };
    assert.equal((await h(request(body))).status, 401); assert.equal(s.db.users.size, 0);
    s.context.__auth = { user: { id: 'owner', email: 'owner@example.invalid', email_confirmed_at: new Date().toISOString() } };
    s.sessions.set(body.sessionId, { livemode: false, status: 'complete', subscription: 'sub_fixture', customer: 'cus_fixture', customer_details: { email: 'victim@example.invalid' } });
    assert.equal((await h(request(body))).status, 409); assert.equal(s.db.rows('restaurants').length, 0);
    s.db.rows('restaurants').push({ id: 'r', owner_id: 'owner', stripe_subscription_id: 'sub_fixture', stripe_customer_id: 'cus_fixture', plan_type: 'monthly' });
    const response = await h(request(body)); assert.equal(response.status, 200); assert.equal((await response.json()).email, 'owner@example.invalid'); assert.equal(s.db.users.size, 0);
  });
  console.log(`${checks} payment relaunch checks passed. No external services contacted.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
