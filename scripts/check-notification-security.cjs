/* Actual notification handlers, auth guards, quota helpers and email sender.
 * Auth, database and provider boundaries are isolated; no external traffic. */
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { build } = require('esbuild');
const { environment } = require('./check-personal-commerce.cjs');
const root = path.resolve(__dirname, '..');
const payoutPath = 'supabase/functions/send-payout-notification/index.ts';
const demoPath = 'supabase/functions/send-demo-request-notification/index.ts';
const retiredPath = 'supabase/functions/send-card-approval/index.ts';
const ids = { admin: '00000000-0000-4000-8000-000000000001', rep: '00000000-0000-4000-8000-000000000002', customer: '00000000-0000-4000-8000-000000000003', payout: '00000000-0000-4000-8000-000000000004', demo: '00000000-0000-4000-8000-000000000005', other: '00000000-0000-4000-8000-000000000006' };
let checks = 0;
const pass = async (name, run) => { await run(); checks++; console.log(`PASS ${name}`); };
function state() {
  const s = environment();
  Object.assign(s.env, { SUPABASE_URL: 'https://fixture-database.invalid', SUPABASE_ANON_KEY: 'fixture-public-key', SUPABASE_SERVICE_ROLE_KEY: 'fixture-private-key', RESEND_API_KEY: 'fixture-resend-key', EMAIL_INTERNAL: 'fixture-ops@example.invalid' });
  s.requests = []; s.logs = []; s.tokens = new Map(); s.deliveries = new Map();
  s.context.console = { log: (...args) => s.logs.push(args), warn: (...args) => s.logs.push(args), error: (...args) => s.logs.push(args) };
  s.context.__createClient = (_url, key, options = {}) => {
    if (key === s.env.SUPABASE_SERVICE_ROLE_KEY) return s.db;
    assert.equal(key, s.env.SUPABASE_ANON_KEY);
    return { auth: { getUser: async () => {
      const header = options.global?.headers?.Authorization;
      const id = s.tokens.get(header?.replace(/^Bearer /, ''));
      return { data: { user: id ? { id, email: `${id}@example.invalid` } : null }, error: id ? null : new Error('Fixture auth rejected') };
    } } };
  };
  s.db.auth.admin.getUserById = async id => ({ data: { user: id === ids.rep ? { id, email: 'fixture-rep@example.invalid' } : null }, error: null });
  s.context.fetch = async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails', 'No external services permitted');
    const key = init.headers['Idempotency-Key'];
    const body = JSON.parse(init.body); s.requests.push({ body, key, headers: init.headers });
    if (s.failProvider) return new Response(JSON.stringify({ message: 'Fixture provider unavailable' }), { status: 503 });
    if (!s.deliveries.has(key)) s.deliveries.set(key, { id: 'fixture-delivery-' + s.deliveries.size, body });
    return new Response(JSON.stringify({ id: s.deliveries.get(key).id }), { status: 200 });
  };
  return s;
}
function authenticate(s, role = 'admin', id = ids[role]) {
  const token = 'fixture-' + role; s.tokens.set(token,id);
  if (role === 'admin' || role === 'rep') s.db.rows('user_roles').push({ user_id: id, role: role === 'rep' ? 'sales_rep' : role });
  if (role === 'rep') s.db.rows('sales_reps').push({ id, is_active:true });
  return token;
}
function req(body = {}, token, method = 'POST') {
  return new Request('https://fixture-functions.invalid/notification', { method,
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.1', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });
}
async function load(file,s) {
  const result = await build({ entryPoints:[path.join(root,file)], bundle:true,platform:'node',format:'cjs',write:false,plugins:[{
    name:'isolated-notifications',setup(builder) {
      builder.onResolve({filter:/^https:\/\/esm.sh\/@supabase\/supabase-js/},()=>({path:'supabase',namespace:'fixture'}));
      builder.onResolve({filter:/paymentFirst\.ts$/},()=>({path:'payment',namespace:'fixture'}));
      builder.onResolve({filter:/^https:\/\/deno\.land\/.*\/http\/server\.ts$/},()=>({path:'serve',namespace:'fixture'}));
      builder.onLoad({filter:/.*/,namespace:'fixture'},({path:p})=>({contents:p==='supabase'?'export const createClient=(...args)=>globalThis.__createClient(...args);':p==='payment'?'export const admin=()=>globalThis.__db;':'export const serve=handler=>globalThis.__handler=handler;',loader:'js'}));
    }
  }] });
  s.context.module={exports:{}};s.context.exports=s.context.module.exports;delete s.context.__handler;
  new vm.Script(result.outputFiles[0].text,{filename:file}).runInContext(s.context);
  return s.context.__handler;
}
function payout(s,extra={}) {
  s.db.rows('rep_payout_history').push({ id:ids.payout,rep_user_id:ids.rep,amount:42.50,status:'sent',paid_at:'2026-10-20T10:00:00Z',...extra });
  s.db.rows('rep_payout_accounts').push({ rep_user_id:ids.rep,payee_name:'Fixture <Rep>',account_last4:'1234',email_payout_notifications:true });
}
function demo(s,extra={}) {
  s.db.rows('rep_demo_requests').push({ id:ids.demo,rep_user_id:ids.rep,full_name:'Fixture <Rep>',address_line1:'1 Saved Fixture Street',address_line2:'Suite <2>',city:'Fixture City',state:'CA',zip:'91711',fulfilled:false,...extra });
}
(async()=>{
  await pass('Anonymous, invalid-token and customer requests cannot send payout or demo email',async()=>{
    for(const file of [payoutPath,demoPath]) {
      const s=state(), h=await load(file,s), customer=authenticate(s,'customer'); payout(s);demo(s);
      for(const token of [undefined,'fixture-invalid-token',customer]) assert.ok([401,403].includes((await h(req({payout_id:ids.payout},token))).status));
      assert.equal(s.requests.length,0);assert.equal(s.db.rows('email_sends').length,0);
      assert.equal(s.db.rows('rep_payout_history')[0].email_sent_at,undefined);
    }
  });
  await pass('POST-only gates and preflight run before any provider or database changes',async()=>{
    for(const file of [payoutPath,demoPath]) {
      const s=state(),h=await load(file,s);
      assert.equal((await h(req({},undefined,'GET'))).status,405);
      assert.equal((await h(req({},undefined,'OPTIONS'))).status,200);
      assert.equal(s.requests.length,0);assert.equal(s.db.tables.size,0);
    }
  });
  await pass('Admin payout notification uses saved payout and canonical rep email only',async()=>{
    const s=state(),token=authenticate(s),h=await load(payoutPath,s);payout(s);
    const response=await h(req({payout_id:ids.payout,email:'fixture-attacker@example.invalid',amount:999999},token));
    assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
    assert.deepEqual(s.requests[0].body.to,['fixture-rep@example.invalid']);
    assert.match(s.requests[0].body.html,/\$42\.50/);assert.ok(!s.requests[0].body.html.includes('999999'));
    assert.match(s.requests[0].body.html,/Fixture/);assert.ok(!s.requests[0].body.html.includes('<Rep>'));
    assert.equal(s.requests[0].key,'payout-notification:'+ids.payout);
    assert.ok(s.db.rows('rep_payout_history')[0].email_sent_at);
    assert.equal(s.db.rows('email_sends')[0].template_key,'rep_payout');
    assert.equal((await h(req({payout_id:ids.payout},token))).status,200);assert.equal(s.requests.length,1);
  });
  await pass('Pending payouts and disabled email preferences never produce mail',async()=>{
    for(const disabled of [false,true]) {
      const s=state(),token=authenticate(s),h=await load(payoutPath,s);payout(s,{status:disabled?'sent':'pending'});
      if(disabled)s.db.rows('rep_payout_accounts')[0].email_payout_notifications=false;
      assert.equal((await h(req({payout_id:ids.payout},token))).status,200);
      assert.equal(s.requests.length,0);
    }
  });
  await pass('Invalid IDs, malformed JSON and oversized payout bodies fail before mail',async()=>{
    const s=state(),token=authenticate(s),h=await load(payoutPath,s);payout(s);
    for(const body of [null,[],{}, {payout_id:ids.payout+'-bad'}, '{bad json', {payout_id:ids.payout,padding:'x'.repeat(5000)}]) assert.equal((await h(req(body,token))).status,400);
    assert.equal(s.requests.length,0);assert.equal(s.db.rows('rep_payout_history')[0].email_sent_at,undefined);
  });
  await pass('A failed payout delivery record can retry with the same provider idempotency key',async()=>{
    const s=state(),token=authenticate(s),h=await load(payoutPath,s);payout(s);
    s.db.failures.set('rep_payout_history:update',1);
    assert.equal((await h(req({payout_id:ids.payout},token))).status,500);
    assert.equal((await h(req({payout_id:ids.payout},token))).status,200);
    assert.equal(s.requests.length,2);assert.equal(s.deliveries.size,1);
    assert.equal(s.requests[0].key,s.requests[1].key);
  });
  await pass('Payout quota exhaustion and quota failure cannot send or expose provider details',async()=>{
    for(const error of [false,true]) {
      const s=state(),token=authenticate(s),h=await load(payoutPath,s);payout(s);
      s.db.rpc=async()=>error?{data:null,error:new Error('fixture-private-provider-detail')}:{data:-1,error:null};
      const response=await h(req({payout_id:ids.payout},token));
      assert.equal(response.status,error?500:429);assert.ok(!(await response.text()).includes('fixture-private-provider-detail'));
      assert.equal(s.requests.length,0);
    }
  });
  await pass('Rep demo email uses the authenticated rep saved address, ignores forged payload and escapes HTML',async()=>{
    const s=state(),token=authenticate(s,'rep'),h=await load(demoPath,s);demo(s);
    demo(s,{id:ids.other,rep_user_id:ids.other,address_line1:'9 Other Rep Secret Street'});
    const response=await h(req({fullName:'Forged Sender',addressLine1:'Attacker Address',rep_user_id:ids.other},token));
    assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
    assert.deepEqual(s.requests[0].body.to,['fixture-ops@example.invalid']);
    assert.match(s.requests[0].body.html,/1 Saved Fixture Street/);
    for(const unsafe of ['Attacker Address','Forged Sender','9 Other Rep Secret Street','<Rep>','<2>'])assert.ok(!s.requests[0].body.html.includes(unsafe));
    assert.match(s.requests[0].body.html,/&lt;Rep&gt;/);assert.equal(s.requests[0].key,'demo-kit:'+ids.demo);
    assert.equal(s.db.rows('email_sends')[0].template_key,'internal_demo_request');
  });
  await pass('Demo notifications require an owned saved request and skip fulfilled requests',async()=>{
    const s=state(),token=authenticate(s,'rep'),h=await load(demoPath,s);
    demo(s,{rep_user_id:ids.other});
    assert.equal((await h(req({},token))).status,409);assert.equal(s.requests.length,0);
    demo(s,{fulfilled:true});
    assert.equal((await h(req({},token))).status,200);assert.equal(s.requests.length,0);
  });
  await pass('Disabled or missing rep records cannot notify, and rep lookups fail closed',async()=>{
    for(const situation of ['disabled','missing','database-error']) {
      const s=state(),token=authenticate(s,'rep'),h=await load(demoPath,s);demo(s);
      if(situation==='disabled')s.db.rows('sales_reps')[0].is_active=false;
      if(situation==='missing')s.db.rows('sales_reps').length=0;
      if(situation==='database-error')s.db.failures.set('sales_reps:select',1);
      assert.equal((await h(req({},token))).status,situation==='database-error'?503:403);
      assert.equal(s.requests.length,0);assert.equal(s.db.quota.size,0);
    }
  });
  await pass('Verified admins may notify their own saved demo request without a rep record',async()=>{
    const s=state(),token=authenticate(s),h=await load(demoPath,s);demo(s,{rep_user_id:ids.admin});
    assert.equal((await h(req({},token))).status,200);assert.equal(s.requests.length,1);
  });
  await pass('Demo role lookup failures and body limits fail closed before provider calls',async()=>{
    const s=state(),token=authenticate(s,'rep'),h=await load(demoPath,s);demo(s);
    s.db.failures.set('user_roles:select',1);
    assert.equal((await h(req({},token))).status,503);
    assert.equal((await h(req({padding:'x'.repeat(5000)},token))).status,400);
    assert.equal(s.requests.length,0);
  });
  await pass('Demo notifications share durable per-rep quotas across requests and workers',async()=>{
    const s=state(),token=authenticate(s,'rep');demo(s);let h=await load(demoPath,s);
    for(let i=0;i<3;i++){assert.equal((await h(req({},token))).status,200);h=await load(demoPath,s);}
    assert.equal((await h(req({},token))).status,429);assert.equal(s.requests.length,3);assert.equal(s.deliveries.size,1);
    assert.ok(s.requests.every(r=>r.key==='demo-kit:'+ids.demo));
  });
  await pass('Demo quota database failures and provider errors return safe failures',async()=>{
    for(const failure of ['quota','provider']) {
      const s=state(),token=authenticate(s,'rep'),h=await load(demoPath,s);demo(s);
      if(failure==='quota')s.db.rpc=async()=>({data:null,error:new Error('fixture-private-error')});else s.failProvider=true;
      const response=await h(req({},token));assert.equal(response.status,503);
      assert.ok(!(await response.text()).includes('fixture-private-error'));
      assert.equal(s.deliveries.size,0);
    }
  });
  await pass('Retired attachment approval endpoint never reads payloads or triggers side effects',async()=>{
    const s=state(),h=await load(retiredPath,s);let read=false;
    const response=await h({method:'POST',json:()=>{read=true;throw new Error('Should not read');},body:{getReader:()=>{read=true;throw new Error('Should not read');}}});
    assert.equal(response.status,410);assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal(read,false);assert.equal(s.requests.length,0);assert.equal(s.db.tables.size,0);
    assert.equal((await h(req({},undefined,'OPTIONS'))).status,200);
  });
  console.log(`${checks} notification security checks passed. No external services contacted.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
