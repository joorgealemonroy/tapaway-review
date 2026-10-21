/* Actual handlers with isolated DB/Auth/Stripe/email fixtures. No external traffic. */
const assert = require('node:assert/strict');
const { environment, load, request, draft, pdfBase64 } = require('./check-personal-commerce.cjs');
let checks = 0;
const pass = async (name, fn) => { await fn(); checks++; console.log('PASS ' + name); };
const email = 'followup@example.invalid';
const welcomePath = 'supabase/functions/payment-first-welcome/index.ts';
const personalPath = 'supabase/functions/personal-card-order/index.ts';
function recoverable(s) {
  s.db.rows('checkout_intents').push({ id: 'existing-order', email, status: 'associated' });
  s.db.users.set(email, { id: 'existing-user', email });
}
function streamingRequest(chunkBytes, totalChunks = 100, contentLength) {
  let reads = 0, canceled = false;
  const stream = new ReadableStream({
    pull(controller) {
      reads++;
      controller.enqueue(new Uint8Array(chunkBytes).fill(32));
      if (reads === totalChunks) controller.close();
    },
    cancel() { canceled = true; },
  }, { highWaterMark: 0 });
  return {
    req: new Request('https://functions.invalid/test', {
      method: 'POST', duplex: 'half', body: stream,
      headers: { 'x-forwarded-for': '192.0.2.1', ...(contentLength ? { 'content-length': String(contentLength) } : {}) },
    }),
    reads: () => reads, canceled: () => canceled,
  };
}
async function business() {
  const s = environment();
  const checkout = await load('supabase/functions/payment-first-checkout/index.ts', s);
  assert.equal((await checkout(request({ checkoutVersion: 2, plan: 'solo', interval: 'month', cardClub: false, business: { name: 'QA Cafe', city: 'QA, CA' } }))).status, 200);
  const intent = s.db.rows('checkout_intents')[0], session = [...s.sessions.values()][0];
  Object.assign(session, { status: 'complete', payment_status: 'paid', customer: 'cus_qa', subscription: 'sub_qa', customer_details: { email } });
  s.subscriptions.set('sub_qa', { id: 'sub_qa', customer: 'cus_qa', status: 'active', items: { data: [{ price: { id: intent.main_price_id } }] } });
  return { s, intent, session };
}
(async () => {
  await pass('Welcome accepts POST only and rejects malformed or oversized bodies without side effects', async () => {
    const s = environment(), h = await load(welcomePath, s);
    assert.equal((await h(new Request('https://functions.invalid/test'))).status, 405);
    assert.equal((await h(new Request('https://functions.invalid/test', { method: 'OPTIONS' }))).status, 200);
    for (const value of [null, [], { email: 'x'.repeat(5000) }]) assert.equal((await h(request(value))).status, 400);
    const stream = streamingRequest(2048);
    assert.equal((await h(stream.req)).status, 400);
    assert.equal(stream.canceled(), true); assert.ok(stream.reads() <= 4);
    assert.equal(s.calls.emails.length, 0); assert.equal(s.calls.checkout.length, 0); assert.equal(s.db.users.size, 0);
  });
  await pass('Personal upload rejects an oversized declared length without reading artwork', async () => {
    const s = environment(), h = await load(personalPath, s), stream = streamingRequest(1024, 100, 19000001);
    assert.equal((await h(stream.req)).status, 413); assert.equal(stream.reads(), 0);
    assert.equal(s.db.files.size, 0); assert.equal(s.calls.checkout.length, 0);
  });
  await pass('Chunked personal artwork is canceled at the byte limit before storage or Stripe', async () => {
    const s = environment(), h = await load(personalPath, s), stream = streamingRequest(1000000);
    assert.equal((await h(stream.req)).status, 413); assert.equal(stream.canceled(), true); assert.ok(stream.reads() <= 20);
    assert.equal(s.db.files.size, 0); assert.equal(s.calls.checkout.length, 0);
  });
  await pass('Personal request quota rejects abuse before reading a large body and fails closed', async () => {
    for (const unavailable of [false, true]) {
      const s = environment(), h = await load(personalPath, s), stream = streamingRequest(1000000);
      s.db.rpc = async () => unavailable ? { error: new Error('Quota unavailable') } : { data: -1 };
      assert.equal((await h(stream.req)).status, unavailable ? 503 : 429); assert.equal(stream.reads(), 0);
      assert.equal(s.db.files.size, 0); assert.equal(s.calls.checkout.length, 0);
    }
  });
  await pass('Personal checkout keeps one-time and optional-hosting prices while allowing dynamic payment methods', async () => {
    const pdf = await pdfBase64();
    for (const hosted of [false, true]) {
      const s = environment(), h = await load(personalPath, s);
      assert.equal((await h(request({ action: 'create', draft: draft(hosted), pdf }))).status, 200);
      const p = s.calls.checkout[0];
      assert.equal(p.payment_method_types, undefined);
      assert.equal(p.mode, hosted ? 'subscription' : 'payment');
      assert.deepEqual(p.line_items.map(x => x.price), hosted ? ['price_cards', 'price_hub'] : ['price_cards']);
      assert.equal(p.subscription_data?.trial_period_days, undefined);
    }
  });
  await pass('Welcome resends share recipient limits with verification and dashboard recovery across workers', async () => {
    const s = environment(); recoverable(s);
    let h = await load(welcomePath, s);
    assert.equal((await h(request({ action: 'send_link', email }))).status, 200);
    assert.equal(s.calls.emails.length, 1);
    h = await load(welcomePath, s);
    assert.equal((await h(request({ action: 'send_link', email }, '192.0.2.2'))).status, 200);
    const otp = await load('supabase/functions/send-custom-otp/index.ts', s);
    assert.equal((await otp(request({ email }, '192.0.2.3'))).status, 429);
    const recovery = await load('supabase/functions/request-dashboard-access/index.ts', s);
    assert.equal((await recovery(request({ email }, '192.0.2.4'))).status, 200);
    assert.equal(s.calls.emails.length, 1);
  });
  await pass('A recovery email also blocks immediate resends through the welcome endpoint', async () => {
    const s = environment(); recoverable(s); s.env.RESEND_API_KEY = 'fixture'; s.env.SUPABASE_URL = 'https://database.invalid';
    s.context.fetch = async (url, init) => {
      assert.equal(url, 'https://api.resend.com/emails'); s.calls.emails.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ id: 'mail_fixture' }));
    };
    const recovery = await load('supabase/functions/request-dashboard-access/index.ts', s);
    assert.equal((await recovery(request({ email }))).status, 200); assert.equal(s.calls.emails.length, 1);
    assert.equal(s.db.rows('email_sends')[0].template_key, 'dashboard_access');
    const h = await load(welcomePath, s);
    assert.equal((await h(request({ action: 'send_link', email }, '192.0.2.2'))).status, 200);
    assert.equal(s.calls.emails.length, 1);
  });
  await pass('Welcome resend respects the global email ceiling and remains neutral for unknown accounts', async () => {
    const s = environment(); recoverable(s);
    const rpc = s.db.rpc.bind(s.db);
    s.db.rpc = async (name, args) => name === 'storefront_take_quota' && args._limit === 1000 ? { data: -1 } : rpc(name, args);
    const h = await load(welcomePath, s);
    const known = await h(request({ action: 'send_link', email }));
    const unknown = await h(request({ action: 'send_link', email: 'unknown@example.invalid' }, '192.0.2.2'));
    assert.equal(known.status, 200); assert.equal(unknown.status, 200);
    assert.deepEqual(await known.json(), await unknown.json()); assert.equal(s.calls.emails.length, 0);
  });
  await pass('Concurrent welcome resends permit only one email for the same recipient', async () => {
    const s = environment(); recoverable(s); const h = await load(welcomePath, s);
    const results = await Promise.all([h(request({ action: 'send_link', email }, '192.0.2.1')), h(request({ action: 'send_link', email }, '192.0.2.2'))]);
    assert.ok(results.every(r => r.status === 200)); assert.equal(s.calls.emails.length, 1);
  });
  await pass('Paid-order initial email and failed-delivery retry remain independent of resend quotas', async () => {
    const { s, intent, session } = await business();
    const rpc = s.db.rpc.bind(s.db);
    s.db.rpc = async (name, args) => name === 'storefront_take_quota' && args._limit === 1000 ? { data: -1 } : rpc(name, args);
    let sends = 0; s.context.__send = async () => ++sends > 1;
    const h = await load(welcomePath, s);
    assert.equal((await h(request({ session_id: session.id }))).status, 500);
    assert.ok(intent.activated_at); assert.equal(intent.welcome_email_sent_at, undefined);
    assert.equal((await h(request({ session_id: session.id }))).status, 200);
    assert.ok(intent.welcome_email_sent_at); assert.equal(sends, 2);
    assert.equal((await h(request({ session_id: session.id }))).status, 200); assert.equal(sends, 2);
    assert.equal(s.db.rows('personal_profiles').length, 1);
  });
  console.log(checks + ' launch follow-up checks passed. No external traffic.');
})().catch(error => { console.error(error); process.exitCode = 1; });
