/* Actual account-access handlers + actual PostgreSQL code claims. Auth/email
 * are isolated fixtures; every unexpected network request fails the check. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { PGlite } = require(path.join(process.env.QA_MODULES, '@electric-sql/pglite'));
const { Webhook } = require(path.join(process.env.QA_MODULES, 'svix'));
const { environment, load, request } = require('./check-personal-commerce.cjs');
const hash = value => createHash('sha256').update(value).digest('hex');
let checks = 0;
const pass = async (name, fn) => { await fn(); checks++; console.log('PASS ' + name); };
const account = 'qa@example.invalid';
const code = '352614';
(async () => {
  const pg = new PGlite();
  await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  await pg.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260102111451_58fe24a4-fdf1-439c-9557-35fc1042034a.sql'), 'utf8'));
  await pg.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261021160000_account_verification_guard.sql'), 'utf8'));
  const issue = async (email = account, value = code) => pg.query('SELECT issue_account_otp($1,$2)', [email, hash(value)]);
  const claim = async (email = account, value = code, consume = true) => (await pg.query('SELECT verify_account_otp($1,$2,$3) ok', [email, hash(value), consume])).rows[0].ok;
  await pass('Only the server can issue or verify codes or read their hashes', async () => {
    for (const role of ['anon', 'authenticated']) {
      await pg.exec('SET ROLE ' + role);
      await assert.rejects(() => issue(), /permission denied/);
      await assert.rejects(() => claim(), /permission denied/);
      await assert.rejects(() => pg.query('SELECT * FROM pending_otps'), /permission denied/);
      await pg.exec('RESET ROLE');
    }
  });
  await pass('Five wrong guesses lock the code across workers; a new code replaces the old one', async () => {
    await issue(); for (let i = 0; i < 5; i++) assert.equal(await claim(account, '999999'), false);
    assert.equal(await claim(), false); await issue(account, '123456');
    assert.equal(await claim(), false); assert.equal(await claim(account, '123456'), true);
  });
  await pass('Concurrent valid claims succeed once; preview step does not consume a new signup code', async () => {
    await issue(); assert.equal(await claim(account, code, false), true);
    const result = await Promise.all([claim(), claim(), claim()]); assert.equal(result.filter(Boolean).length, 1);
  });
  await pass('Expired and already-used codes cannot be replayed', async () => {
    assert.equal(await claim(), false); await issue();
    await pg.query("UPDATE pending_otps SET expires_at=now()-interval '1 second'"); assert.equal(await claim(), false);
  });
  async function state() {
    const s = environment(); s.env.SUPABASE_URL = 'https://database.invalid'; s.env.RESEND_API_KEY = 'fixture';
    const originalRpc = s.db.rpc.bind(s.db);
    s.db.rpc = async (name, args) => {
      if (name === 'issue_account_otp') return { data: (await pg.query('SELECT issue_account_otp($1,$2) id', [args._email, args._code_hash])).rows[0].id, error: null };
      if (name === 'verify_account_otp') return { data: (await pg.query('SELECT verify_account_otp($1,$2,$3) ok', [args._email, args._code_hash, args._consume])).rows[0].ok, error: null };
      return originalRpc(name, args);
    };
    s.context.fetch = async (url, init) => {
      assert.equal(url, 'https://api.resend.com/emails'); s.calls.emails.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ id: 'mail_fixture' }));
    };
    s.db.auth.admin.updateUserById = async (...args) => { s.calls.updates ||= []; s.calls.updates.push(args); return { error: null }; };
    return s;
  }
  await pass('OTP sender uses branded logged email, secure code, and durable shared quotas', async () => {
    const s = await state(); let h = await load('supabase/functions/send-custom-otp/index.ts', s);
    assert.equal((await h(request({ email: account }))).status, 200);
    const sent = s.calls.emails[0]; const match = sent.text.match(/\b\d{6}\b/); assert.ok(match); assert.match(sent.html, /#245b43/);
    assert.equal(s.db.rows('email_sends')[0].template_key, 'account_verification');
    assert.equal((await pg.query('SELECT code FROM pending_otps WHERE email=$1', [account])).rows[0].code, hash(match[0]));
    h = await load('supabase/functions/send-custom-otp/index.ts', s); // fresh worker/module
    assert.equal((await h(request({ email: account }, '192.0.2.9'))).status, 429); assert.equal(s.calls.emails.length, 1);
    const recovery = await load('supabase/functions/request-dashboard-access/index.ts', s);
    assert.equal((await recovery(request({ email: account }, '192.0.2.10'))).status, 200); assert.equal(s.calls.emails.length, 1);
  });
  await pass('Malformed and oversized requests never send; unavailable limiter fails closed', async () => {
    const s = await state(), h = await load('supabase/functions/send-custom-otp/index.ts', s);
    for (const body of [{ email: [] }, { email: 'not-an-email' }, { email: 'x'.repeat(5000) }]) assert.equal((await h(request(body))).status, 400);
    s.db.rpc = async () => ({ data: null, error: new Error('DB unavailable') });
    assert.equal((await h(request({ email: account }))).status, 503); assert.equal(s.calls.emails.length, 0);
  });
  await pass('A provider rejection is recorded as failure, never reported as sent', async () => {
    const s = await state(); s.context.fetch = async () => new Response('{}', { status: 422 });
    const h = await load('supabase/functions/send-custom-otp/index.ts', s);
    assert.equal((await h(request({ email: account }))).status, 503); assert.equal(s.db.rows('email_sends')[0].status, 'failed');
  });
  await pass('Two-step signup stays usable and creates an Auth account only once', async () => {
    await issue(); const s = await state(), h = await load('supabase/functions/verify-custom-otp/index.ts', s);
    const first = await h(request({ email: account, code })); assert.equal((await first.json()).needsPassword, true); assert.equal(s.db.users.size, 0);
    const responses = await Promise.all([h(request({ email: account, code, password: 'fixture-password-123' })), h(request({ email: account, code, password: 'fixture-password-123' }))]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]); assert.equal(s.db.users.size, 1); assert.equal(s.db.rows('personal_profiles').length, 0);
  });
  await pass('Concurrent password resets cannot reuse a code; invalid passwords do not consume it', async () => {
    await issue(); const s = await state(); s.db.users.set(account, { id: 'qa-user', email: account });
    const h = await load('supabase/functions/verify-custom-otp/index.ts', s);
    assert.equal((await h(request({ email: account, code, password: 'short' }))).status, 400);
    const responses = await Promise.all([h(request({ email: account, code, password: 'fixture-password-123' })), h(request({ email: account, code, password: 'fixture-different-password-123' }))]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]); assert.equal(s.calls.updates.length, 1);
  });
  await pass('Ambiguous Auth failure consumes the code and tells the customer to request another', async () => {
    await issue(); const s = await state(); s.db.users.set(account, { id: 'qa-user', email: account });
    s.db.auth.admin.updateUserById = async () => ({ error: new Error('timeout') });
    const h = await load('supabase/functions/verify-custom-otp/index.ts', s);
    assert.equal((await h(request({ email: account, code, password: 'fixture-password-123' }))).status, 503);
    assert.equal(await claim(), false);
  });
  const secret = 'whsec_' + Buffer.alloc(32, 29).toString('base64');
  const webhookReq = (payload, signed = true) => { const raw = JSON.stringify(payload), now = new Date(); return new Request('https://fixture.invalid', { method: 'POST', headers: { 'svix-id': 'msg_qa', 'svix-timestamp': String(Math.floor(now.getTime()/1000)), 'svix-signature': signed ? new Webhook(secret).sign('msg_qa', now, raw) : 'v1,invalid' }, body: raw }); };
  const payload = { type: 'email.delivered', created_at: new Date().toISOString(), data: { email_id: 'mail_fixture' } };
  await pass('Webhook retrieves only its own enabled key, caches it, and verifies real Svix signatures', async () => {
    const s = await state(); let fetches = 0, events = 0; const rpc = s.db.rpc.bind(s.db);
    s.db.rpc = async (name, args) => name === 'record_email_delivery' ? (events++, { error: null }) : rpc(name, args);
    s.context.fetch = async url => { assert.equal(url, 'https://api.resend.com/webhooks?limit=100'); fetches++; return new Response(JSON.stringify({ data: [{ endpoint: s.env.SUPABASE_URL + '/functions/v1/email-delivery-webhook', status: 'enabled', signing_secret: secret }] })); };
    const h = await load('supabase/functions/email-delivery-webhook/index.ts', s);
    assert.equal((await h(request({}))).status, 400); assert.equal(fetches, 0);
    assert.equal((await h(webhookReq(payload))).status, 200); assert.equal((await h(webhookReq(payload, false))).status, 400);
    assert.equal(fetches, 1); assert.equal(events, 1);
  });
  await pass('Secret-free list responses use authenticated retrieval of the exact webhook', async () => {
    for (const wrongEndpoint of [false, true]) {
      const s = await state(); const id = '11111111-1111-4111-8111-111111111111'; const calls = [];
      const entry = { id, endpoint: s.env.SUPABASE_URL + '/functions/v1/email-delivery-webhook', status:'enabled' };
      const rpc = s.db.rpc.bind(s.db); s.db.rpc = async (name,args) => name === 'record_email_delivery' ? {error:null} : rpc(name,args);
      s.context.fetch = async (url, init) => {
        calls.push(url); assert.equal(init.headers.Authorization, 'Bearer fixture');
        if (url === 'https://api.resend.com/webhooks?limit=100') return new Response(JSON.stringify({data:[entry]}));
        assert.equal(url, 'https://api.resend.com/webhooks/' + id);
        return new Response(JSON.stringify({...entry,endpoint:wrongEndpoint?'https://wrong.invalid':entry.endpoint,signing_secret:secret}));
      };
      const h = await load('supabase/functions/email-delivery-webhook/index.ts', s);
      assert.equal((await h(webhookReq(payload))).status, wrongEndpoint?503:200); assert.equal(calls.length, 2);
    }
  });
  await pass('Missing, foreign, duplicate or disabled webhook configuration fails closed', async () => {
    for (const kind of ['missing', 'foreign', 'duplicate', 'disabled', 'provider-error']) {
      const s = await state(), entry = { endpoint: s.env.SUPABASE_URL + '/functions/v1/email-delivery-webhook', status: 'enabled', signing_secret: secret };
      const data = kind === 'missing' ? [] : kind === 'foreign' ? [{...entry, endpoint:'https://someone.invalid/webhook'}] : kind === 'duplicate' ? [entry, entry] : [{...entry,status:'disabled'}];
      s.context.fetch = async () => new Response(JSON.stringify({data}), {status:kind === 'provider-error'?403:200});
      const h = await load('supabase/functions/email-delivery-webhook/index.ts', s); assert.equal((await h(webhookReq(payload))).status, 503);
    }
  });
  await pass('Delivery check requires an admin and ignores arbitrary-recipient input', async () => {
    const s = await state(), h = await load('supabase/functions/email-delivery-check/index.ts', s);
    assert.equal((await h(request({}))).status, 403); s.context.__auth = { user: { id: 'qa-admin' } };
    assert.equal((await h(request({}))).status, 403); s.context.__admin = true;
    for (let i = 0; i < 3; i++) assert.equal((await h(request({ to: 'customer@example.invalid' }))).status, 200);
    assert.equal((await h(request({}))).status, 429); assert.equal(s.calls.emails.length, 3);
    assert.ok(s.calls.emails.every(e => e.to[0] === 'delivered@resend.dev')); assert.equal(s.db.rows('email_sends')[0].template_key, 'delivery_test');
  });
  await pass('Admin access links reject mismatched recipients and ignore caller-controlled origins', async () => {
    const s = await state(); s.db.auth.getUser = async () => ({ data: { user: { id: 'qa-admin' } }, error: null });
    s.db.auth.admin.getUserById = async () => ({ data: { user: { id: 'qa-user', email: account } }, error: null });
    const rpc = s.db.rpc.bind(s.db); s.db.rpc = async (name, args) => name === 'is_admin' ? {data:true,error:null} : rpc(name,args);
    const h = await load('supabase/functions/send-magic-link-email/index.ts', s);
    const req = email => { const r = request({ userId:'qa-user',email,fullName:'<img src=x>',baseUrl:'https://attacker.invalid' }); r.headers.set('Authorization','Bearer fixture'); return r; };
    assert.equal((await h(req('wrong@example.invalid'))).status, 409); assert.equal(s.calls.emails.length, 0);
    assert.equal((await h(req(account))).status, 200);
    assert.doesNotMatch(s.calls.emails[0].html, /attacker.invalid|<img src=x>/); assert.match(s.calls.emails[0].html, /https:\/\/tapaway.co\/auth\/magic/);
    assert.equal(s.db.rows('email_sends')[0].template_key, 'admin_dashboard_access');
  });
  await pass('Legacy welcome is service-only and provider errors are logged without false success', async () => {
    const s = await state(), h = await load('supabase/functions/send-personal-welcome-emails/index.ts', s);
    const data = { fullName:'QA', username:'qa', email:account, profileId:'22222222-2222-4222-8222-222222222222' };
    assert.equal((await h(request(data))).status, 403); assert.equal(s.calls.emails.length, 0);
    s.context.__serviceRole = true; s.context.fetch = async () => new Response('{}', {status:422});
    const response = await h(request(data)); assert.equal(response.status, 503); assert.equal((await response.json()).success, false);
    assert.equal(s.db.rows('email_sends').length, 2); assert.ok(s.db.rows('email_sends').every(e => e.status === 'failed'));
  });
  await pg.close(); console.log(checks + ' account access and delivery checks passed. No external traffic.');
})().catch(error => { console.error(error); process.exitCode = 1; });
