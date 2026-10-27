// Actual edge-handler regression checks with isolated database/Stripe boundaries.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { environment, load, request } = require('./check-personal-commerce.cjs');
let checks = 0;
const pass = async (name, fn) => { await fn(); checks++; console.log(`PASS ${name}`); };
async function state(type = 'booking') {
  const s = environment(); s.context.__mode = 'live'; s.context.Deno.serve = h => s.context.__handler = h;
  s.product = { id: randomUUID(), creator_id: randomUUID(), title: 'Fixture appointment', description: 'A fixture product', price_cents: 4500, product_type: type, duration_minutes: 30, is_active: true };
  s.creator = { id: s.product.creator_id, username: 'fixture-creator', stripe_connect_account_id: 'acct_fixtureCreator', is_stripe_onboarded: true };
  s.account = { id: s.creator.stripe_connect_account_id, charges_enabled: true, payouts_enabled: true, capabilities: { transfers: 'active' } };
  s.db.rows('creator_products').push(s.product); s.db.rows('personal_profiles').push(s.creator);
  s.active = true; s.reservations = 0; s.accountReads = 0;
  const rpc = s.db.rpc.bind(s.db);
  s.db.rpc = async (name, args) => {
    if (name === 'personal_profile_is_active') { assert.equal(args._profile_id, s.creator.id); return { data: s.active }; }
    if (name === 'reserve_creator_booking') {
      s.reservations++; s.reserveArgs = args;
      if (s.reservationError) return { data: null, error: s.reservationError };
      let row = s.db.rows('bookings').find(row => row.reservation_key === args._request_key);
      if (!row) { row = { id: randomUUID(), reservation_key: args._request_key, product_id: s.product.id, creator_id: s.creator.id, buyer_email: args._buyer_email, price_cents: s.product.price_cents,
        status: 'pending', reserved_until: new Date(Date.now() + 35 * 60000).toISOString(), stripe_session_id: null }; s.db.rows('bookings').push(row); }
      s.booking = row;
      return { data: { bookingId: row.id, creatorId: row.creator_id, expiresAt: row.reserved_until, priceCents: row.price_cents, durationMinutes: 30, stripeSessionId: row.stripe_session_id } };
    }
    return rpc(name, args);
  };
  s.stripe.accounts = { retrieve: async id => { s.accountReads++; assert.equal(id, s.creator.stripe_connect_account_id); return s.account; } };
  const create = s.stripe.checkout.sessions.create;
  s.stripe.checkout.sessions.create = async (...args) => {
    const session = await create(...args);
    session.livemode = true; session.url = 'https://checkout.stripe.com/c/pay/fixture'; session.expires_at = args[0].expires_at;
    return session;
  };
  s.body = { productId: s.product.id, buyerEmail: 'buyer@example.invalid', ...(type === 'booking' ? {
    booking: { date: '2026-11-02', startTime: '11:00:00', timezone: 'America/Los_Angeles', requestKey: randomUUID() },
  } : { requestKey: randomUUID() }) };
  s.handler = await load('supabase/functions/create-product-checkout/index.ts', s);
  s.call = (patch = {}) => s.handler(request({ ...s.body, ...patch }));
  return s;
}
(async () => {
  await pass('Methods, oversized bodies and malformed JSON are rejected before provider calls', async () => {
    const s = await state();
    assert.equal((await s.handler(new Request('https://fixture.invalid'))).status, 405);
    assert.equal((await s.handler(new Request('https://fixture.invalid', { method: 'POST', body: '{' }))).status, 400);
    assert.equal((await s.call({ extra: 'x'.repeat(7000) })).status, 400);
    assert.equal(s.accountReads, 0); assert.equal(s.calls.checkout.length, 0);
  });
  await pass('Browser test mode, arbitrary booking IDs, account IDs and amounts cannot control checkout', async () => {
    for (const patch of [{ testMode: true }, { testMode: false }, { bookingId: randomUUID() }, { creatorId: randomUUID() }, { price: 1 }, { stripeAccount: 'acct_other' }]) {
      const s = await state(); assert.equal((await s.call(patch)).status, 400); assert.equal(s.calls.checkout.length, 0); assert.equal(s.reservations, 0);
    }
  });
  await pass('Missing, inactive and invalid-price products cannot reach Stripe checkout', async () => {
    const absent = await state(); absent.product.is_active = false; assert.equal((await absent.call()).status, 404);
    for (const price of [-1, 0, 49, 99.5, 100000000]) { const s = await state(); s.product.price_cents = price; assert.equal((await s.call()).status, 409); assert.equal(s.calls.checkout.length, 0); }
  });
  await pass('Unentitled creators and fake Connect accounts cannot accept payments', async () => {
    const s = await state(); s.active = false; assert.equal((await s.call()).status, 409); assert.equal(s.accountReads, 0);
    const fake = await state(); fake.creator.stripe_connect_account_id = 'acct_test_fixture'; assert.equal((await fake.call()).status, 409); assert.equal(fake.accountReads, 0);
    const missing = await state(); missing.creator.is_stripe_onboarded = false; assert.equal((await missing.call()).status, 409);
  });
  await pass('Current Stripe account readiness and destination are verified server-side', async () => {
    for (const change of [{ id: 'acct_other' }, { charges_enabled: false }, { payouts_enabled: false }, { capabilities: { transfers: 'inactive' } }]) {
      const s = await state(); Object.assign(s.account, change); assert.equal((await s.call()).status, 409); assert.equal(s.reservations, 0); assert.equal(s.calls.checkout.length, 0);
    }
    const s = await state(); s.context.__mode = 'test'; assert.equal((await s.call()).status, 503); assert.equal(s.calls.checkout.length, 0);
  });
  await pass('Bookings require a bounded slot, email and stable request key; direct purchases reject slots', async () => {
    for (const patch of [{ booking: undefined }, { buyerEmail: '' }, { buyerEmail: 'invalid' }, { booking: { date: 'bad' } }]) {
      const s = await state(); assert.equal((await s.call(patch)).status, 400); assert.equal(s.reservations, 0);
    }
    const digital = await state('pdf'); assert.equal((await digital.call({ booking: {} })).status, 400); assert.equal(digital.calls.checkout.length, 0);
  });
  await pass('Only an atomic server reservation can supply the booking identity and its price', async () => {
    const s = await state(); const response = await s.call(); assert.equal(response.status, 200);
    assert.equal(s.reserveArgs._product_id, s.product.id); assert.equal(s.reserveArgs._buyer_email, s.body.buyerEmail);
    assert.equal(s.reserveArgs._request_key, s.body.booking.requestKey);
    const p = s.calls.checkout[0]; assert.equal(p.metadata.booking_id, s.booking.id); assert.equal(p.metadata.reservation_key, s.body.booking.requestKey);
    assert.equal(p.metadata.commerce_version, 'creator_marketplace_v2'); assert.equal(p.metadata.expected_amount, '4500'); assert.equal(p.metadata.currency, 'usd');
    assert.equal(p.line_items[0].price_data.unit_amount, 4500); assert.equal(p.line_items[0].quantity, 1);
    assert.equal(p.payment_intent_data.transfer_data.destination, s.account.id);
    assert.equal(p.expires_at, Math.floor(Date.parse(s.booking.reserved_until) / 1000));
    assert.equal(p.payment_method_types, undefined); assert.equal(p.allow_promotion_codes, undefined);
    assert.equal(s.booking.stripe_session_id, [...s.sessions.keys()][0]); assert.equal(s.booking.status, 'pending');
    assert.deepEqual(Object.keys(await response.json()), ['url']); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(s.db.users.size, 0); assert.equal(s.calls.emails.length, 0);
  });
  await pass('Unavailable or overlapping slot errors do not create a Stripe session', async () => {
    for (const code of ['23505', '22023']) { const s = await state(); s.reservationError = { code, message: 'private details' }; const res = await s.call(); assert.equal(res.status, 409); assert.doesNotMatch(await res.text(), /private details/); assert.equal(s.calls.checkout.length, 0); }
  });
  await pass('Retry and concurrent requests reuse one bound checkout session', async () => {
    const s = await state(); const responses = await Promise.all([s.call(), s.call()]); assert.ok(responses.every(r => r.status === 200)); assert.equal(s.calls.checkout.length, 1);
    assert.equal((await s.call()).status, 200); assert.equal(s.calls.checkout.length, 1);
    [...s.sessions.values()][0].status = 'complete'; assert.equal((await s.call()).status, 409); assert.equal(s.calls.checkout.length, 1);
  });
  await pass('A failed booking persistence retries the same Stripe idempotency key', async () => {
    const s = await state(); s.db.failures.set('bookings:update', 1);
    assert.equal((await s.call()).status, 503); assert.equal(s.booking.stripe_session_id, null);
    assert.equal((await s.call()).status, 200); assert.equal(s.calls.checkout.length, 1); assert.ok(s.booking.stripe_session_id);
  });
  await pass('Ambiguous provider timeout cannot cause a second checkout on retry', async () => {
    const s = await state(), create = s.stripe.checkout.sessions.create; let once = true;
    s.stripe.checkout.sessions.create = async (...args) => { const result = await create(...args); if (once) { once = false; throw new Error('provider_private_message'); } return result; };
    const first = await s.call(); assert.equal(first.status, 503); assert.doesNotMatch(await first.text(), /provider_private_message/);
    assert.equal((await s.call()).status, 200); assert.equal(s.calls.checkout.length, 1);
  });
  await pass('Reused sessions must match reservation, product and payment destination', async () => {
    const s = await state(); await s.call(); [...s.sessions.values()][0].metadata.destination = 'acct_other';
    assert.equal((await s.call()).status, 503); assert.equal(s.calls.checkout.length, 1);
  });
  await pass('Test-mode or unsafe returned checkout URLs are never sent to buyers', async () => {
    for (const patch of [{ livemode: false }, { url: 'https://attacker.invalid/checkout' }]) {
      const s = await state(), create = s.stripe.checkout.sessions.create;
      s.stripe.checkout.sessions.create = async (...args) => Object.assign(await create(...args), patch);
      assert.equal((await s.call()).status, 409); assert.equal(s.booking.stripe_session_id, null);
    }
  });
  await pass('Ordinary digital purchases retain verified price, destination and optional email', async () => {
    const s = await state('pdf'); const res = await s.call({ buyerEmail: undefined }); assert.equal(res.status, 200); assert.equal(s.reservations, 0);
    const p = s.calls.checkout[0]; assert.equal(p.customer_email, undefined); assert.equal(p.metadata.booking_id, undefined); assert.equal(p.payment_intent_data.transfer_data.destination, s.account.id);
    assert.equal(p.line_items[0].price_data.unit_amount, s.product.price_cents); assert.equal(p.success_url, 'https://tapaway.co/fixture-creator?purchase=success&session_id={CHECKOUT_SESSION_ID}');
  });
  await pass('Durable quota exhaustion fails closed before Stripe or reservations', async () => {
    const s = await state(), rpc = s.db.rpc.bind(s.db);
    s.db.rpc = async (name, args) => name === 'storefront_take_quota' ? { data: -1 } : rpc(name, args);
    assert.equal((await s.call()).status, 429); assert.equal(s.accountReads, 0); assert.equal(s.reservations, 0);
  });
  console.log(`${checks} creator checkout checks passed. No external requests, charges, or emails.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
