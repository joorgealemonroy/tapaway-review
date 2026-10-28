/* Real legacy handlers with isolated auth, database, Stripe and email fixtures.
 * No provider traffic, email sends or account changes can leave this process. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
let checks = 0;
const pass = async (name, run) => { await run(); checks++; console.log('PASS ' + name); };
function fixture() {
  const s = { tables: new Map(), writes: [], emails: [], sessions: [], invited: [], isAdmin: false, quota: 1, catalog: true, user: { id: randomUUID(), email: 'owner@example.invalid', email_confirmed_at: new Date().toISOString() }, client: { id: randomUUID() }, subscription: null };
  s.rows = name => { if (!s.tables.has(name)) s.tables.set(name, []); return s.tables.get(name); };
  s.db = { auth: { getUser: async () => ({ data: { user: s.user }, error: null }), admin: { inviteUserByEmail: async email => { s.invited.push(email); return { data: { user: s.client }, error: null }; } } },
    rpc: async name => ({ data: name === 'is_admin' ? s.isAdmin : name === 'get_auth_user_by_email' ? [s.client] : null, error: null }),
    from(table) { const filters = []; let action = 'select', value, single = false; const q = {
      select() { return q; }, eq(k,v) { filters.push(row => row[k] === v); return q; }, in(k,v) { filters.push(row => v.includes(row[k])); return q; }, order() { return q; }, limit() { return q; },
      insert(v) { action = 'insert'; value = v; return q; }, update(v) { action = 'update'; value = v; return q; }, maybeSingle() { single = true; return q; }, single() { single = true; return q; },
      then(resolve,reject) { try { let rows = s.rows(table).filter(row => filters.every(f => f(row)));
        if (action === 'insert') { const row = { id: randomUUID(), ...value }; s.rows(table).push(row); rows = [row]; s.writes.push({ table, action, value }); }
        if (action === 'update') { for (const row of rows) Object.assign(row, value); if (rows.length) s.writes.push({ table, action, value }); }
        return Promise.resolve({ data: single ? rows[0] || null : rows, error: null }).then(resolve,reject);
      } catch(e) { return Promise.reject(e).then(resolve,reject); } },
    }; return q; },
  };
  s.stripe = { subscriptions: { retrieve: async () => { if (!s.subscription) throw new Error('Fixture unavailable'); return s.subscription; } }, checkout: { sessions: { create: async body => { s.sessions.push(body); return { id: 'cs_fixture', url: 'https://checkout.stripe.invalid/fixture' }; } } } };
  return s;
}
function load(file,s) {
  let handler; const exports = {};
  const requireFixture = name => {
    if (name.includes('/http/server.ts')) return { serve: fn => { handler = fn; } };
    if (name.includes('@supabase/supabase-js')) return { createClient: () => s.db };
    if (name.includes('/stripe@')) return { __esModule: true, default: function Stripe() { return s.stripe; } };
    if (name.endsWith('/storefrontRateLimit.ts')) return { takeQuota: async () => s.quota };
    if (name.endsWith('/requestBody.ts')) return { readLimitedText: async (req, max) => { const text = await req.text(); if (text.length > max) throw new Error('Fixture body too large'); return text; } };
    if (name.endsWith('/onboardingCatalog.ts')) return { resolveOnboardingPrice: async (_,plan,interval) => { if (!s.catalog) throw new Error('Fixture catalog unavailable'); return { priceId: `price_fixture_${plan}_${interval}`, trialDays: 14 }; } };
    if (name.endsWith('/sanitize.ts')) return load('supabase/functions/_shared/sanitize.ts',s);
    if (name.endsWith('/email.ts')) return { renderTemplate: key => ({ subject: 'Fixture '+key, html: '<p>Fixture welcome</p>', text: 'Fixture welcome' }), sendEmailAndLog: async opts => { s.emails.push(opts); s.rows('email_sends').push({ id: randomUUID(), profile_id: opts.profileId, template_key: opts.templateKey, status: 'sent' }); return { ok: true }; } };
    throw new Error('Unexpected fixture dependency: ' + name);
  };
  const source = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: requireFixture, Request, Response, URL, Date, console: { log() {}, warn() {}, error() {} }, Deno: { env: { get: name => ({ SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service', SUPABASE_ANON_KEY: 'fixture-anon', STRIPE_SECRET_KEY: 'fixture-stripe' })[name] } }, fetch: () => { throw new Error('Network forbidden'); } }, { filename: file });
  return handler || exports;
}
const request = (body={},auth=true) => new Request('https://fixture.invalid', { method: 'POST', headers: { 'Content-Type':'application/json', ...(auth ? { Authorization:'Bearer fixture-user' } : {}) }, body:JSON.stringify(body) });
const repBody = { clientEmail:'owner@example.invalid', businessName:'Fixture Cafe', planType:'solo', billingInterval:'month' };
function orderFixture() {
  const s = fixture(), restaurant = { id: randomUUID(), owner_id:s.user.id, restaurant_name:'<img src=x onerror=fixture>', owner_name:'Fixture Owner', custom_slug:'fixture-cafe', stripe_customer_id:'cus_fixture', stripe_subscription_id:'sub_fixture', subscription_status:'active' };
  s.rows('restaurants').push(restaurant);
  const order = { id:randomUUID(), restaurant_id:restaurant.id, user_id:s.user.id, stripe_subscription_id:'sub_fixture', stripe_customer_id:'cus_fixture', status:'awaiting_onboarding', quantity:15, plan:'venue', shipping_name:'<script>fixture</script>', shipping_address_line1:'1 Fixture Way', shipping_city:'Fixture', shipping_postal_code:'12345' };
  s.rows('fulfillment_orders').push(order);
  s.subscription = { id:'sub_fixture', customer:'cus_fixture', livemode:true, status:'active', latest_invoice:{ paid:true, status:'paid' } };
  return { s,restaurant,order,h:load('supabase/functions/finalize-onboarding/index.ts',s) };
}
(async () => {
  await pass('Promotions cannot bypass staff authentication or mutate accounts', async () => {
    for (const mode of ['anonymous','ordinary','unverified','staff-promo']) { const s=fixture(); if(mode==='staff-promo')s.isAdmin=true;if(mode==='unverified')delete s.user.email_confirmed_at;const h=load('supabase/functions/create-rep-onboarding/index.ts',s);const r=await h(request({...repBody,promoToken:randomUUID()},mode!=='anonymous'));assert.ok([400,401,403].includes(r.status));assert.equal(s.writes.length,0);assert.equal(s.sessions.length,0);assert.equal(s.invited.length,0); }
  });
  await pass('Unavailable catalog blocks account provisioning and checkout', async () => { const s=fixture();s.isAdmin=true;s.catalog=false;const h=load('supabase/functions/create-rep-onboarding/index.ts',s);assert.equal((await h(request(repBody))).status,503);assert.equal(s.writes.length,0);assert.equal(s.sessions.length,0); });
  await pass('Staff checkout never overwrites an existing owner profile or subscription', async () => { for(const plan of ['solo','venue']) {const s=fixture();s.isAdmin=true;s.rows(plan==='solo'?'personal_profiles':'restaurants').push({ id:randomUUID(), [plan==='solo'?'user_id':'owner_id']:s.client.id, subscription_status:'active', full_name:'Original' });const h=load('supabase/functions/create-rep-onboarding/index.ts',s);assert.equal((await h(request({...repBody,planType:plan}))).status,409);assert.equal(s.writes.length,0);assert.equal(s.sessions.length,0);} });
  await pass('New staff checkout remains pending and uses authoritative catalog and fixed return origin', async () => { for(const plan of ['solo','venue']) {const s=fixture();s.isAdmin=true;const h=load('supabase/functions/create-rep-onboarding/index.ts',s);assert.equal((await h(request({...repBody,planType:plan,billingInterval:'year'}))).status,200);const row=s.rows(plan==='solo'?'personal_profiles':'restaurants')[0];assert.equal(row.subscription_status,'pending_payment');assert.equal(row.trial_ends_at,undefined);assert.equal(s.sessions[0].line_items[0].price,`price_fixture_${plan}_year`);assert.equal(s.sessions[0].subscription_data.trial_period_days,14);assert.match(s.sessions[0].success_url,/^https:\/\/tapaway\.co\//);} });
  await pass('Finalization rejects missing owner proof and cross-account requests', async () => { for(const kind of ['no-auth','unverified','other-owner']) {const {s,restaurant,h}=orderFixture();if(kind==='unverified')delete s.user.email_confirmed_at;if(kind==='other-owner')restaurant.owner_id=randomUUID();assert.ok([401,404].includes((await h(request({restaurantId:restaurant.id},kind!=='no-auth'))).status));assert.equal(s.writes.length,0);assert.equal(s.emails.length,0);} });
  await pass('A customer ID alone cannot manufacture a fulfillment order', async () => { const {s,restaurant,h}=orderFixture();delete restaurant.stripe_subscription_id;s.rows('fulfillment_orders').length=0;assert.equal((await h(request({restaurantId:restaurant.id}))).status,409);assert.equal(s.rows('fulfillment_orders').length,0);assert.equal(s.writes.length,0);assert.equal(s.emails.length,0); });
  await pass('Unpaid, canceled, wrong-customer, test-mode and unverified trials cannot enter printing', async () => {for(const patch of [{status:'incomplete'},{status:'canceled'},{customer:'cus_other_fixture'},{livemode:false},{latest_invoice:{paid:false,status:'open'}},{status:'trialing',trial_end:Math.floor(Date.now()/1000)+600}]){const {s,restaurant,h}=orderFixture();Object.assign(s.subscription,patch);assert.equal((await h(request({restaurantId:restaurant.id}))).status,409);assert.equal(s.writes.length,0);assert.equal(s.emails.length,0);} });
  await pass('Paid proof without a matching webhook order waits instead of inventing free cards', async () => {const {s,restaurant,h}=orderFixture();s.rows('fulfillment_orders').length=0;assert.equal((await h(request({restaurantId:restaurant.id}))).status,409);assert.equal(s.writes.length,0);assert.equal(s.emails.length,0);});
  await pass('Paid order finalization is repeat-safe, escapes email content, and uses verified recipient', async () => {const {s,restaurant,order,h}=orderFixture();restaurant.email='injected@example.invalid';assert.equal((await h(request({restaurantId:restaurant.id}))).status,200);assert.equal(order.status,'pending');assert.equal(s.emails.length,2);assert.equal(s.emails[0].to,s.user.email);assert.match(s.emails[1].html,/&lt;img/);assert.doesNotMatch(s.emails[1].html,/<script>|<img/);assert.ok(s.emails.every(email=>email.idempotencyKey.includes(order.id)));assert.equal((await h(request({restaurantId:restaurant.id}))).status,200);assert.equal(s.emails.length,2);});
  await pass('Verified trial can finalize; shipped orders never move back into printing', async () => {const {s,restaurant,order,h}=orderFixture();s.subscription.status='trialing';s.subscription.trial_end=Math.floor(Date.now()/1000)+600;restaurant.card_check_status='passed';assert.equal((await h(request({restaurantId:restaurant.id}))).status,200);assert.equal(s.emails[0].templateKey,'welcome');order.status='shipped';assert.equal((await h(request({restaurantId:restaurant.id}))).status,200);assert.equal(order.status,'shipped');assert.equal(s.emails.length,2);});
  console.log(`${checks} legacy onboarding security checks passed with isolated providers.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
