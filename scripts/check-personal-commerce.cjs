/* Isolated commerce checks. No Stripe, database, AI, or email traffic is permitted.
 * QA_MODULES must contain Stripe 14.21.0; app dependencies provide esbuild/pdf-lib.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto, randomUUID } = require('node:crypto');
const { build } = require('esbuild');
const { PDFDocument } = require('pdf-lib');
const root = path.resolve(__dirname, '..');
const qa = process.env.QA_MODULES;
if (!qa) throw new Error('Set QA_MODULES to the isolated QA node_modules directory.');
const Stripe = require(path.join(qa, 'stripe'));
const stripeVerifier = new Stripe('sk_test_fixture');
let checks = 0;
function plain(x) { return JSON.parse(JSON.stringify(x)); }
class Database {
  constructor() { this.tables = new Map(); this.failures = new Map(); this.files = new Map(); this.quota = new Map(); this.users = new Map();
    this.storage = { from: () => ({ upload: async (key, data) => { this.files.set(key, data); return { error: null }; }, createSignedUrl: async key => ({ data: { signedUrl: 'https://files.invalid/' + key }, error: null }) }) };
    this.auth = { admin: { generateLink: async () => ({data:{properties:{action_link:"https://tapaway.co/auth?token=fixture"}},error:null}), createUser: async input => { const user = { id: randomUUID(), email: input.email }; this.users.set(input.email, user); return { data: { user }, error: null }; } } };
  }
  rows(name) { if (!this.tables.has(name)) this.tables.set(name, []); return this.tables.get(name); }
  from(name) { return new Query(this, name); }
  async rpc(name, args) {
    if (name === 'storefront_take_quota') { const used = this.quota.get(args._key) || 0; if (used >= args._limit) return { data: -1 }; this.quota.set(args._key, used + 1); return { data: used + 1 }; }
    if (name === 'get_auth_user_by_email') return { data: this.users.has(args.lookup_email) ? [this.users.get(args.lookup_email)] : [], error: null };
    if (name === 'claim_stripe_event') { const rows = this.rows('processed_stripe_events'), row = rows.find(r => r.event_id === args.p_event_id); if (row) return { data: [{ claimed: false, existing_status: row.status, claimed_at: row.processed_at }] }; rows.push({ event_id: args.p_event_id, status: 'claimed', processed_at: new Date().toISOString() }); return { data: [{ claimed: true }] }; }
    if (name === 'is_username_available') return { data: true };
    throw new Error('Unexpected RPC ' + name);
  }
}
class Query {
  constructor(db, table) { this.db = db; this.table = table; this.filters = []; this.action = 'select'; this.object = false; }
  select() { return this; } order() { return this; } limit() { return this; }
  eq(k,v) { this.filters.push(r => r[k] === v); return this; } neq(k,v) { this.filters.push(r => r[k] !== v); return this; }
  is(k,v) { this.filters.push(r => v === null ? r[k] == null : r[k] === v); return this; }
  in(k,v) { this.filters.push(r => v.includes(r[k])); return this; }
  not(k,op,v) { this.filters.push(r => op === 'is' && v === null ? r[k] != null : r[k] !== v); return this; }
  lt(k,v) { this.filters.push(r => r[k] < v); return this; }
  or(expression) { const terms = expression.split(',').map(term => { const [k,op,...rest] = term.split('.'); const v = rest.join('.'); return r => op === 'is' ? r[k] == null : op === 'lt' ? r[k] < v : r[k] === v; }); this.filters.push(r => terms.some(f => f(r))); return this; }
  insert(value) { this.action = 'insert'; this.value = value; return this; }
  upsert(value, options={}) { this.action = 'upsert'; this.value = value; this.options = options; return this; }
  update(value) { this.action = 'update'; this.value = value; return this; }
  delete() { this.action = 'delete'; return this; }
  single() { this.object = true; return this; } maybeSingle() { this.object = true; return this; }
  then(resolve,reject) { try {
    const failureKey=this.table+':'+this.action;
    if(this.db.failures.get(failureKey)>0){this.db.failures.set(failureKey,this.db.failures.get(failureKey)-1);return Promise.resolve({data:null,error:{message:'Injected transient '+failureKey}}).then(resolve,reject);}
    const rows = this.db.rows(this.table); let found = rows.filter(r => this.filters.every(f => f(r)));
    if (this.action === 'insert' || this.action === 'upsert') {
      found = []; for (const input of Array.isArray(this.value) ? this.value : [this.value]) {
        if (this.table === 'review_request_sends' && rows.some(r => r.phone_hash === input.phone_hash && r.profile_id === input.profile_id && r.restaurant_id === input.restaurant_id)) return Promise.resolve({data:null,error:{code:'23505',message:'Duplicate review request'}}).then(resolve,reject);
        const key = this.options?.onConflict || 'id', existing = rows.find(r => input[key] != null && r[key] === input[key]);
        if (existing && this.action === 'insert') return Promise.resolve({ data: null, error: { message: 'Duplicate' } }).then(resolve,reject);
        if (existing) { if (!this.options.ignoreDuplicates) Object.assign(existing, plain(input)); found.push(existing); }
        else { const row = { id: randomUUID(), personal_profile_id: this.table === 'personal_card_orders' ? randomUUID() : null, created_at: new Date().toISOString(), production_status: 'awaiting_payment', ...plain(input) }; rows.push(row); found.push(row); }
      }
    } else if (this.action === 'update') found.forEach(r => Object.assign(r, plain(this.value)));
    else if (this.action === 'delete') this.db.tables.set(this.table, rows.filter(r => !found.includes(r)));
    return Promise.resolve({ data: this.object ? found[0] || null : found, error: null }).then(resolve,reject);
  } catch(e) { return Promise.reject(e).then(resolve,reject); } }
}
function environment() {
  const db = new Database(); const calls = { checkout: [], separate: [], canceled: [], ai: [], emails: [] }; const sessions = new Map(); const subscriptions = new Map();
  const env = { PERSONAL_CARDS_ENABLED: 'true', PERSONAL_CARDS_PRICE_ID_TEST: 'price_cards', PERSONAL_HUB_PRICE_ID_TEST: 'price_hub', LOVABLE_API_KEY: 'qa_only', SUPABASE_SERVICE_ROLE_KEY: 'qa_hash_only' };
  const stripe = {
    webhooks: stripeVerifier.webhooks,
    prices: { retrieve: async price => ({ id: price, active: true, livemode: false, currency: 'usd', unit_amount: price === 'price_cards' ? 3900 : 500, recurring: price === 'price_cards' ? null : { interval: 'month', interval_count: 1 }, product: { id: 'product_' + price, active: true } }) },
    checkout: { sessions: {
      create: async (params, options) => { const old = [...sessions.values()].find(s => s.key === options?.idempotencyKey); if(old)return old; calls.checkout.push(plain(params)); const s = { id: 'cs_test_' + randomUUID().replaceAll('-',''), status: 'open', url: 'https://checkout.stripe.invalid/session', metadata: params.metadata, key: options?.idempotencyKey, livemode: false, mode: params.mode }; sessions.set(s.id,s); return s; },
      retrieve: async id => { if(!sessions.has(id))throw new Error('Missing session');return sessions.get(id); },
      expire: async id => { const s=sessions.get(id);if(s.status==='complete')throw new Error('Already complete');s.status='expired';return s; },
    } },
    subscriptions: { retrieve: async id => { if (!subscriptions.has(id)) throw new Error('Missing subscription '+id); return subscriptions.get(id); }, create: async params => { calls.separate.push(params); return {id:'sub_legacyclub',items:{data:[{id:'si_legacyclub'}]}}; }, cancel: async id => { calls.canceled.push(id); return {}; } },
  };
  const context = vm.createContext({ console, Error, TypeError, Date, Request, Response, Headers, TextEncoder, TextDecoder, URL, URLSearchParams, AbortSignal, Uint8Array, ArrayBuffer, crypto: webcrypto, atob, btoa, setTimeout, clearTimeout, Buffer, require, __db: db, __stripe: stripe, __mode: 'test', __allowed: true, __admin: false, __user: null, __send: async (...args) => { calls.emails.push(args); return true; }, Deno: { env: { get: name => env[name] } }, fetch: async (url, init) => { assert.equal(url,'https://ai.gateway.lovable.dev/v1/chat/completions','No real network calls permitted'); calls.ai.push(JSON.parse(init.body)); return new Response(JSON.stringify({choices:[{message:{content:'Two cards cost $39 once.'}}]}),{headers:{'Content-Type':'application/json'}}); } });
  return { db, calls, sessions, subscriptions, env, stripe, context };
}
const paymentStub = `export const admin=()=>globalThis.__db;export const getStripe=()=>globalThis.__stripe;export const stripeMode=()=>globalThis.__mode;export const paymentFirstAllowed=async()=>globalThis.__allowed;export const userFromRequest=async()=>globalThis.__user;export const frontendUrl=()=>"https://tapaway.co";export const sendEmail=(...args)=>globalThis.__send(...args);export const sendWelcomeLink=(...args)=>globalThis.__send(...args);export const webhookSecret=()=>"whsec_fixture";export const ONBOARDING_VERSION="payment_first_v1";export const CARD_QUANTITY={solo:4,venue:15};export const TRIAL_DAYS=14;export const cardClubPriceId=()=>"price_club";export const cors={"Access-Control-Allow-Origin":"*"};export const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});export const verifiedPrice=async(_,key)=>globalThis.__verifiedPrice?globalThis.__verifiedPrice(key):({id:"price_"+key,amount:key==="card_club"?500:key==="solo_month"?2000:key==="solo_year"?19900:key==="venue_month"?3900:39000,interval:key.endsWith("year")?"year":"month",product:key==="card_club"?"prod_club":"prod_main"});`;
async function load(file, state) {
  const result = await build({ entryPoints:[path.join(root,file)], bundle:true, platform:'node', format:'cjs', write:false, plugins:[{ name:'isolated-edge', setup(build) {
    build.onResolve({filter:/^https:\/\/esm.sh\/@supabase\/supabase-js/},()=>({path:'supabase',namespace:'mock'}));
    build.onResolve({filter:/paymentFirst\.ts$/},args=>args.kind==='entry-point'?null:({path:'payment',namespace:'mock'}));
    build.onResolve({filter:/^https:\/\/deno\.land\/x\/xhr/},()=>({path:'xhr',namespace:'mock'}));
    build.onResolve({filter:/security\.ts$/},()=>({path:'security',namespace:'mock'}));
    build.onResolve({filter:/^https:\/\/deno\.land\/.*\/http\/server\.ts$/},()=>({path:'serve',namespace:'mock'}));
    build.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path==='supabase'?'export const createClient=()=>globalThis.__db;':path==='payment'?paymentStub:path==='security'?'export const isAdmin=async()=>globalThis.__admin;export const requireUser=async()=>globalThis.__auth || null;export const hasServiceRoleBearer=()=>!!globalThis.__serviceRole;export const isSafeExternalUrl=()=>false;':path==='xhr'?'':'export const serve=handler=>globalThis.__handler=handler;',loader:'js'}));
    build.onResolve({filter:/^https:\/\/esm.sh\/pdf-lib@/},()=>({path:require.resolve('pdf-lib')}));
    build.onResolve({filter:/^https:\/\/esm.sh\/svix@/},()=>({path:require.resolve(path.join(qa,'svix')),external:true}));
    build.onResolve({filter:/^https:\/\/esm.sh\/stripe@/},()=>({path:require.resolve(path.join(qa,'stripe')),external:true}));
  }}] });
  state.context.module={exports:{}};state.context.exports=state.context.module.exports;new vm.Script(result.outputFiles[0].text,{filename:file}).runInContext(state.context);
  return state.context.__handler || state.context.module.exports;
}
function request(body, ip='192.0.2.1') { return new Request('https://functions.invalid/test',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':ip},body:JSON.stringify(body)}); }
async function pass(name, fn) { await fn(); checks++; console.log('PASS '+name); }
async function pdfBase64(w=85.6,h=53.98) { const pdf=await PDFDocument.create(); for(let i=0;i<4;i++)pdf.addPage([w*72/25.4,h*72/25.4]);return Buffer.from(await pdf.save()).toString('base64'); }
function draft(hosted=false,id=randomUUID()) { return {version:1,id,checkoutToken:randomUUID()+randomUUID(),hosted,hubName:'QA Hub',hubLinks:'https://example.com',cards:[0,1].map(i=>({destination:'https://example.com/'+i,front:{background:'#ffffff',layers:[]},back:{background:'#ffffff',layers:[]},qr:{x:56,y:15,size:24}}))}; }
async function main(){
  for(const plan of ['solo','venue'])for(const interval of ['month','year'])await pass(`business ${plan}/${interval}: one subscription with matching Card Club interval`,async()=>{
    const s=environment(), handler=await load('supabase/functions/payment-first-checkout/index.ts',s);
    const res=await handler(request({checkoutVersion:2,plan,interval,cardClub:true,trybeVisitorId:'retired-tracking',attribution:{fbclid:'retired-click',utm_source:'qa'},business:{name:'QA Pizza',city:'Claremont, CA',link:'example.com',goal:'Orders'}})); assert.equal(res.status,200);
    const p=s.calls.checkout[0];assert.equal(p.metadata.trybe_visitor_id,undefined);assert.equal(p.metadata.fbclid,undefined);assert.equal(p.subscription_data.metadata.trybe_visitor_id,undefined);assert.equal(p.mode,'subscription');assert.equal(p.line_items.length,2);assert.equal(p.subscription_data.trial_period_days,14);assert.equal(p.metadata.card_club_billing,'included');
    if(interval==='year'){assert.equal(p.line_items[1].price_data.unit_amount,6000);assert.equal(p.line_items[1].price_data.recurring.interval,'year');}else assert.equal(p.line_items[1].price,'price_card_club');
    assert.equal(s.db.rows('checkout_intents')[0].business_details.name,'QA Pizza'); assert.equal(s.calls.separate.length,0);
  });
  await pass('business rejects unknown client versions, missing brief fields, and invalid links before Stripe',async()=>{
    const s=environment(), h=await load('supabase/functions/payment-first-checkout/index.ts',s);
    assert.equal((await h(request({checkoutVersion:3,plan:'solo',interval:'month',cardClub:false}))).status,409);
    assert.equal((await h(request({checkoutVersion:2,plan:'solo',interval:'month',cardClub:false,business:{name:'',city:'CA'}}))).status,400);
    assert.equal((await h(request({checkoutVersion:2,plan:'solo',interval:'month',cardClub:false,business:{name:'QA',city:'CA',link:'javascript:alert(1)'}}))).status,400);
    assert.equal(s.calls.checkout.length,0);
  });
  await pass('published unversioned business checkout preserves its legacy Club contract',async()=>{
    const s=environment(),h=await load('supabase/functions/payment-first-checkout/index.ts',s);assert.equal((await h(request({plan:'solo',interval:'year',cardClub:true}))).status,200);const p=s.calls.checkout[0];assert.equal(p.line_items.length,1);assert.equal(p.metadata.card_club_billing,undefined);assert.equal(p.metadata.card_club_selected,'true');assert.match(p.custom_text.submit.message,/separate recurring charge of \$5\/month/);assert.equal(p.subscription_data.trial_period_days,14);
  });
  await pass('included Card Club activation never creates or cancels a second subscription',async()=>{
    const s=environment();s.db.rows('card_club_memberships').push({id:'m',status:'pending_activation',main_stripe_subscription_id:'sub_main',stripe_customer_id:'cus_fixture'});
    s.subscriptions.set('sub_main',{id:'sub_main',status:'active',metadata:{card_club_billing:'included',card_club_product_id:'prod_club',main_price_id:'price_base'},items:{data:[{id:'si_base',price:{id:'price_base',product:'prod_main',unit_amount:19900}},{id:'si_club',price:{id:'price_annualclub',product:'prod_club',unit_amount:6000}}]}});
    const api=await load('supabase/functions/_shared/paymentFirstActivation.ts',s);await api.ensureCardClubSubscription(s.stripe,s.db,'m');
    const m=s.db.rows('card_club_memberships')[0];assert.equal(m.card_club_stripe_subscription_id,'sub_main');assert.equal(m.card_club_stripe_subscription_item_id,'si_club');assert.equal(s.calls.separate.length,0);
    s.subscriptions.get('sub_main').items.data.pop();await api.syncMembership(s.stripe,s.db,m);assert.equal(m.status,'cancelled');assert.equal(s.calls.canceled.length,0);
  });
  await pass('legacy Card Club billing is preserved for existing orders',async()=>{
    const s=environment();s.db.rows('card_club_memberships').push({id:'old',status:'pending_activation',main_stripe_subscription_id:'sub_old',stripe_customer_id:'cus_fixture',stripe_price_id:'price_club'});s.subscriptions.set('sub_old',{metadata:{},default_payment_method:'pm_fixture',trial_end:Math.floor(Date.now()/1000)+86400});
    const api=await load('supabase/functions/_shared/paymentFirstActivation.ts',s);await api.ensureCardClubSubscription(s.stripe,s.db,'old');assert.equal(s.calls.separate.length,1);
  });
  const pdf=await pdfBase64();
  await pass('personal $39 checkout: one payment, immutable revisions, retry reuse, and no Card Club',async()=>{
    const s=environment(),h=await load('supabase/functions/personal-card-order/index.ts',s),d=draft();
    assert.equal((await h(request({action:'create',draft:d,pdf}))).status,200);const first=s.calls.checkout[0];assert.equal(first.mode,'payment');assert.equal(first.line_items.length,1);assert.equal(first.line_items[0].price,'price_cards');assert.equal(first.subscription_data,undefined);assert.equal(s.db.rows('personal_card_orders')[0].production_status,'awaiting_payment');assert.equal(s.db.files.size,2);
    assert.equal((await h(request({action:'create',draft:d,pdf}))).status,200);assert.equal(s.calls.checkout.length,1);
    assert.equal((await h(request({action:'create',draft:{...d,checkoutToken:randomUUID()+randomUUID()},pdf}))).status,409);assert.equal(s.calls.checkout.length,1);
    const oldSession=[...s.sessions.values()][0];d.cards[0].destination='https://example.com/changed';assert.equal((await h(request({action:'create',draft:d,pdf}))).status,200);assert.equal(oldSession.status,'expired');assert.equal(s.calls.checkout.length,2);
  });
  await pass('optional personal hub: single $44 checkout, paid activation, isolated profile identity',async()=>{
    const s=environment(),h=await load('supabase/functions/personal-card-order/index.ts',s),victimId=randomUUID(),d=draft(true,victimId);
    s.db.rows('personal_profiles').push({id:victimId,user_id:'other_user',full_name:'Existing profile'});
    assert.equal((await h(request({action:'create',draft:d,pdf}))).status,200);const p=s.calls.checkout[0];assert.equal(p.mode,'subscription');assert.equal(p.line_items.length,2);assert.equal(p.subscription_data.trial_period_days,undefined);assert.deepEqual(p.line_items.map(x=>x.price),['price_cards','price_hub']);
    const order=s.db.rows('personal_card_orders')[0];assert.notEqual(order.personal_profile_id,victimId);const session=[...s.sessions.values()][0];Object.assign(session,{status:'complete',payment_status:'paid',amount_total:4400,currency:'usd',subscription:'sub_personal',customer:'cus_personal',customer_details:{email:'buyer@example.invalid',name:'QA Buyer'},shipping_details:{name:'QA Buyer',address:{line1:'1 QA St',city:'QA',state:'CA',postal_code:'90000',country:'US'}}});s.subscriptions.set('sub_personal',{status:'active',metadata:{commerce_version:'personal_cards_v1'}});
    delete s.context.__handler;const api=await load('supabase/functions/_shared/personalCards.ts',s);await api.activatePersonalOrder(s.stripe,session);await api.activatePersonalOrder(s.stripe,session);
    assert.equal(order.production_status,'needs_review');assert.equal(s.db.rows('personal_profiles').length,2);assert.equal(s.db.rows('personal_profiles')[0].full_name,'Existing profile');assert.equal(s.db.rows('personal_links')[0].profile_id,order.personal_profile_id);assert.equal(s.db.rows('personal_profiles')[1].plan_type,'personal_hosted');assert.equal(s.db.rows('card_club_memberships').length,0);assert.equal(s.calls.emails.length,1);
    s.subscriptions.get('sub_personal').status='canceled';await api.syncPersonalSubscription(s.stripe,'sub_personal');assert.equal(s.db.rows('personal_profiles')[1].subscription_status,'pending');assert.equal(s.db.rows('personal_profiles')[1].is_approved,false);assert.equal(s.db.rows('personal_profiles')[0].subscription_status,undefined);
  });
  await pass('unavailable or incorrect prices and wrong-size PDFs cannot start personal checkout',async()=>{
    const s=environment(),h=await load('supabase/functions/personal-card-order/index.ts',s);s.stripe.prices.retrieve=async()=>({active:true,currency:'usd',unit_amount:1,livemode:false,product:{active:true}});assert.equal((await h(request({action:'create',draft:draft(),pdf}))).status,503);assert.equal(s.calls.checkout.length,0);
    const t=environment(),g=await load('supabase/functions/personal-card-order/index.ts',t);assert.equal((await g(request({action:'create',draft:draft(),pdf:await pdfBase64(86,54)}))).status,400);assert.equal(t.calls.checkout.length,0);assert.equal(t.db.files.size,0);
  });
  await pass('mixed portrait/landscape PDFs match their card faces; mismatched pages and unsafe QR reject before Stripe',async()=>{
    const s=environment(),h=await load('supabase/functions/personal-card-order/index.ts',s),d=draft();d.cards[0].orientation='portrait';d.cards[0].qr={x:14,y:52,size:26};
    assert.equal((await h(request({action:'create',draft:d,pdf}))).status,400);assert.equal(s.calls.checkout.length,0);
    const mixed=await PDFDocument.create();for(const [w,ht] of [[53.98,85.6],[53.98,85.6],[85.6,53.98],[85.6,53.98]])mixed.addPage([w*72/25.4,ht*72/25.4]);const printed=Buffer.from(await mixed.save()).toString('base64');
    d.cards[0].qr.x=40;assert.equal((await h(request({action:'create',draft:d,pdf:printed}))).status,400);assert.equal(s.calls.checkout.length,0);
    d.cards[0].qr.x=14;assert.equal((await h(request({action:'create',draft:d,pdf:printed}))).status,200);assert.equal(s.calls.checkout.length,1);
  });
  await pass('hosted checkout needs no prefilled name or links; paid activation starts a blank editable hub',async()=>{
    const s=environment(),h=await load('supabase/functions/personal-card-order/index.ts',s),d=draft(true);d.hubName='';d.hubLinks='';assert.equal((await h(request({action:'create',draft:d,pdf}))).status,200);
    const session=[...s.sessions.values()][0];Object.assign(session,{status:'complete',payment_status:'paid',amount_total:4400,currency:'usd',subscription:'sub_personal',customer:'cus_personal',customer_details:{email:'buyer@example.invalid',name:'QA Buyer'},shipping_details:{name:'QA Buyer',address:{line1:'1 QA St',city:'QA',state:'CA',postal_code:'90000',country:'US'}}});s.subscriptions.set('sub_personal',{status:'active',metadata:{commerce_version:'personal_cards_v1'}});
    delete s.context.__handler;const api=await load('supabase/functions/_shared/personalCards.ts',s);await api.activatePersonalOrder(s.stripe,session);assert.equal(s.db.rows('personal_profiles')[0].full_name,'QA Buyer');assert.equal(s.db.rows('personal_links').length,0);assert.equal(s.db.rows('personal_profiles')[0].plan_type,'personal_hosted');
  });
  await pass('Google business listing details persist without asking for the address twice',async()=>{
    const s=environment(),h=await load('supabase/functions/payment-first-checkout/index.ts',s);assert.equal((await h(request({checkoutVersion:2,plan:'solo',interval:'month',cardClub:false,business:{name:'QA Place',city:'',googlePlaceId:'ChIJ_fixture',address:'123 Main St, CA 91711',state:'CA',postalCode:'91711',phone:'555-0100',lat:34,lng:-117}}))).status,200);const b=s.db.rows('checkout_intents')[0].business_details;assert.equal(b.googlePlaceId,'ChIJ_fixture');assert.equal(b.address,'123 Main St, CA 91711');assert.equal(b.postalCode,'91711');assert.equal(b.lat,34);
  });
  await pass('existing Google finder returns structured address details and preserves the public search throttle',async()=>{
    const s=environment();s.env.GOOGLE_PLACES_API_KEY_SERVER='qa_only';let calls=0;s.context.fetch=async(url,init)=>{assert.equal(url,'https://places.googleapis.com/v1/places:searchText');assert.match(init.headers['X-Goog-FieldMask'],/places.addressComponents/);calls++;return new Response(JSON.stringify({places:[{id:'ChIJ_fixture',displayName:{text:'QA Pizza'},formattedAddress:'123 Main St, Claremont, CA 91711',addressComponents:[{types:['locality'],longText:'Claremont'},{types:['administrative_area_level_1'],shortText:'CA'},{types:['postal_code'],longText:'91711'}]}]}));};
    const h=await load('supabase/functions/lookup-place-id/index.ts',s);const res=await h(request({address:'QA Pizza'}));assert.equal(res.status,200);const item=(await res.json()).results[0];assert.equal(item.city,'Claremont');assert.equal(item.state,'CA');assert.equal(item.postalCode,'91711');for(let i=1;i<8;i++)assert.equal((await h(request({address:'QA Pizza'}))).status,200);assert.equal((await h(request({address:'QA Pizza'}))).status,429);assert.equal(calls,8);
  });
  await pass('AI fifth question succeeds, sixth is server-blocked; human handoff is still available',async()=>{
    const s=environment(),h=await load('supabase/functions/storefront-support/index.ts',s),visitor=randomUUID();
    for(let i=0;i<5;i++)assert.equal((await h(request({mode:'ai',visitor,message:'Tell me about a way to connect after a conference.'}))).status,200);
    const sixth=await h(request({mode:'ai',visitor,message:'Another question'}));assert.equal(sixth.status,429);assert.equal((await sixth.json()).remaining,0);assert.equal(s.calls.ai.length,5);
    assert.match(s.calls.ai[0].messages[0].content,/4 business cards: \$20\/month/);
    assert.equal((await h(request({mode:'team',visitor,name:'QA',email:'qa@example.invalid',message:'Please help',history:[]}))).status,200);assert.equal(s.db.rows('support_requests').length,1);assert.equal(s.calls.emails.length,1);
  });
  await pass('clearing visitor IDs cannot bypass the network-level AI cap',async()=>{
    const s=environment(),h=await load('supabase/functions/storefront-support/index.ts',s);for(let i=0;i<20;i++)assert.equal((await h(request({mode:'ai',visitor:randomUUID(),message:'Cards?'}))).status,200);assert.equal((await h(request({mode:'ai',visitor:randomUUID(),message:'Cards?'}))).status,429);assert.equal(s.calls.ai.length,20);
  });
  await pass('AI timeouts and truncated replies use reviewed facts without guessing or resetting the quota',async()=>{
    const s=environment(),h=await load('supabase/functions/storefront-support/index.ts',s),visitor=randomUUID();
    s.context.fetch=async()=>{throw new Error('Fixture timeout');};
    const a=await h(request({mode:'ai',visitor,message:'How much is the 4-card business plan?'}));assert.equal(a.status,200);const b=await a.json();assert.match(b.answer,/\$20\/month/);assert.match(b.answer,/\$199\/year/);assert.equal(b.source,'reviewed_faq');assert.equal(b.remaining,4);
    s.context.fetch=async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'Your hub includes:'}}]}));
    const c=await h(request({mode:'ai',visitor,message:'What does the $5 personal hub include?'}));assert.equal(c.status,200);const d=await c.json();assert.match(d.answer,/dashboard, analytics/);assert.equal(d.source,'reviewed_faq');assert.equal(d.remaining,3);
    const e=await h(request({mode:'ai',visitor,message:'Could you explain something outside your product information?'}));assert.equal(e.status,503);assert.equal((await e.json()).remaining,2);
    const f=await h(request({mode:'ai',visitor,message:'How do I design both sides of my cards?'}));assert.equal(f.status,200);const g=await f.json();assert.match(g.answer,/BEFORE you pay/);assert.match(g.answer,/online hub.*after payment/);assert.equal(g.remaining,1);
  });
  await pass('private artwork/admin mutations require a verified admin role',async()=>{
    const s=environment(),h=await load('supabase/functions/personal-card-admin/index.ts',s);assert.equal((await h(request({action:'list'}))).status,403);s.context.__user={id:'regular_user'};assert.equal((await h(request({action:'download',orderId:randomUUID(),file:'pdf'}))).status,403);assert.equal(s.db.tables.size,0);
  });
  await pass('webhook signature and mode checked before writes; only paid Club invoice lines start eligibility',async()=>{
    const s=environment(),h=await load('supabase/functions/payment-first-webhook/index.ts',s);
    assert.equal((await h(new Request('https://functions.invalid/webhook',{method:'POST',body:'{}'}))).status,400);assert.equal(s.db.tables.size,0);
    const deliver=event=>{const payload=JSON.stringify(event);return h(new Request('https://functions.invalid/webhook',{method:'POST',headers:{'stripe-signature':stripeVerifier.webhooks.generateTestHeaderString({payload,secret:'whsec_fixture'})},body:payload}));};
    const event=(id,paid,lines,livemode=false)=>({id,type:'invoice.paid',created:Math.floor(Date.now()/1000),livemode,data:{object:{object:'invoice',subscription:'sub_main',amount_paid:paid,lines:{data:lines},status_transitions:{paid_at:Math.floor(Date.now()/1000)}}}});
    assert.equal((await deliver(event('evt_wrongmode',500,[],true))).status,400);assert.equal(s.db.tables.size,0);
    const m={id:'m',status:'pending_activation',plan:'solo',card_club_stripe_subscription_id:'sub_main',main_stripe_subscription_id:'sub_main',card_club_stripe_subscription_item_id:'si_club',stripe_price_id:'price_club',card_club_paid_at:null};s.db.rows('card_club_memberships').push(m);s.subscriptions.set('sub_main',{id:'sub_main',status:'active',items:{data:[{id:'si_base',price:{unit_amount:2000}},{id:'si_club',price:{unit_amount:500}}]}});
    assert.equal((await deliver(event('evt_free',0,[]))).status,200);assert.equal(m.card_club_paid_at,null);
    assert.equal((await deliver(event('evt_base',2000,[{amount:2000,subscription_item:'si_base',price:{id:'price_base'}}]))).status,200);assert.equal(m.card_club_paid_at,null);
    const paid=event('evt_paid',2500,[{amount:500,subscription_item:'si_club',price:{id:'price_club'}}]);assert.equal((await deliver(paid)).status,200);assert.ok(m.card_club_paid_at);assert.equal(m.status,'active');const date=m.card_club_paid_at;assert.equal((await deliver(paid)).status,200);assert.equal(m.card_club_paid_at,date);
  });
  await pass('delayed personal payment waits for success; repeated webhook does not repeat fulfillment',async()=>{
    const s=environment(),create=await load('supabase/functions/personal-card-order/index.ts',s);
    assert.equal((await create(request({action:'create',draft:draft(),pdf}))).status,200);
    const order=s.db.rows('personal_card_orders')[0], session=[...s.sessions.values()][0];
    Object.assign(session,{status:'complete',payment_status:'unpaid',amount_total:3900,currency:'usd',payment_intent:'pi_delayed',customer:'cus_delayed',customer_details:{email:'buyer@example.invalid',name:'QA Buyer'},shipping_details:{name:'QA Buyer',address:{line1:'1 QA St',city:'QA',state:'CA',postal_code:'90000',country:'US'}}});
    const h=await load('supabase/functions/payment-first-webhook/index.ts',s);
    const deliver=(id,type)=>{const modern={...session,collected_information:{shipping_details:session.shipping_details}};delete modern.shipping_details;const payload=JSON.stringify({id,type,created:Math.floor(Date.now()/1000),livemode:false,data:{object:modern}});return h(new Request('https://functions.invalid/webhook',{method:'POST',headers:{'stripe-signature':stripeVerifier.webhooks.generateTestHeaderString({payload,secret:'whsec_fixture'})},body:payload}));};
    assert.equal((await deliver('evt_delayed_open','checkout.session.completed')).status,200);assert.equal(order.production_status,'awaiting_payment');assert.equal(s.calls.emails.length,0);
    session.payment_status='paid';assert.equal((await deliver('evt_delayed_paid','checkout.session.async_payment_succeeded')).status,200);assert.equal(order.production_status,'needs_review');assert.ok(order.activated_at);assert.equal(s.calls.emails.length,1);
    assert.equal((await deliver('evt_delayed_paid','checkout.session.async_payment_succeeded')).status,200);assert.equal(s.calls.emails.length,1);
  });
  await pass('Clover invoice fields identify a paid Club line without treating the base line as Club',async()=>{
    const s=environment(),h=await load('supabase/functions/payment-first-webhook/index.ts',s);
    const m={id:'m',status:'pending_activation',plan:'solo',card_club_stripe_subscription_id:'sub_main',main_stripe_subscription_id:'sub_main',card_club_stripe_subscription_item_id:'si_club',stripe_price_id:'price_club',card_club_paid_at:null};s.db.rows('card_club_memberships').push(m);s.subscriptions.set('sub_main',{id:'sub_main',status:'active',items:{data:[{id:'si_base',price:{unit_amount:2000}},{id:'si_club',price:{unit_amount:500}}]}});
    const deliver=async(id,item,price)=>{const payload=JSON.stringify({id,type:'invoice.paid',created:Math.floor(Date.now()/1000),livemode:false,data:{object:{object:'invoice',parent:{subscription_details:{subscription:'sub_main'}},amount_paid:2500,lines:{data:[{amount:500,parent:{subscription_item_details:{subscription_item:item}},pricing:{price_details:{price}}}]}}}});return h(new Request('https://functions.invalid/webhook',{method:'POST',headers:{'stripe-signature':stripeVerifier.webhooks.generateTestHeaderString({payload,secret:'whsec_fixture'})},body:payload}));};
    assert.equal((await deliver('evt_clover_base','si_base','price_base')).status,200);assert.equal(m.card_club_paid_at,null);
    assert.equal((await deliver('evt_clover_club','si_club','price_club')).status,200);assert.ok(m.card_club_paid_at);assert.equal(m.status,'active');
  });
  await pass('live personal catalog uses verified prices while test mode requires its own configuration',async()=>{
    const s=environment();const api=await load('supabase/functions/_shared/personalCards.ts',s);s.context.__mode='live';
    const ids=[];s.stripe.prices.retrieve=async id=>{ids.push(id);return {id,active:true,livemode:true,currency:'usd',unit_amount:id==='price_1USlnhDg8DaTuVNZvpuFiScC'?3900:500,recurring:id==='price_1USlnhDg8DaTuVNZvpuFiScC'?null:{interval:'month',interval_count:1},product:{active:true}};};
    await api.personalPrice('cards');await api.personalPrice('hub');assert.deepEqual(ids,['price_1USlnhDg8DaTuVNZvpuFiScC','price_1USlnpDg8DaTuVNZebiRWrPS']);assert.equal(api.personalPortalConfiguration(),'bpc_1USlo1Dg8DaTuVNZovODPDXA');
    s.context.__mode='test';delete s.env.PERSONAL_CARDS_PRICE_ID_TEST;await assert.rejects(()=>api.personalPrice('cards'),/not configured/);assert.throws(()=>api.personalPortalConfiguration(),/not configured/);
  });
  await pass('initial purchase refunds hold fulfillment; hosting renewal refunds leave the card order intact',async()=>{
    const s=environment(),h=await load('supabase/functions/payment-first-webhook/index.ts',s);
    const order={id:randomUUID(),stripe_livemode:false,stripe_subscription_id:'sub_personal',status:'paid',production_status:'needs_review'};s.db.rows('personal_card_orders').push(order);
    s.stripe.invoices={retrieve:async id=>({id,subscription:'sub_personal',billing_reason:id==='in_initial'?'subscription_create':'subscription_cycle'})};
    const deliver=async(id,invoice,refunded)=>{const payload=JSON.stringify({id,type:'charge.refunded',created:Math.floor(Date.now()/1000),livemode:false,data:{object:{id:'ch_fixture',payment_intent:'pi_fixture',invoice,refunded}}});return h(new Request('https://functions.invalid/webhook',{method:'POST',headers:{'stripe-signature':stripeVerifier.webhooks.generateTestHeaderString({payload,secret:'whsec_fixture'})},body:payload}));};
    assert.equal((await deliver('evt_renewal_refund','in_renewal',true)).status,200);assert.equal(order.status,'paid');assert.equal(order.production_status,'needs_review');
    assert.equal((await deliver('evt_partial_refund','in_initial',false)).status,200);assert.equal(order.status,'paid');assert.equal(order.production_status,'on_hold');
    assert.equal((await deliver('evt_initial_refund','in_initial',true)).status,200);assert.equal(order.status,'refunded');
  });
  console.log(`${checks} isolated commerce checks passed. No external services were contacted.`);
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
else module.exports={environment,load,request,pdfBase64,draft};
