/* Signed synthetic webhook deliveries. No real Stripe/database/email requests. */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const { build } = require('esbuild');
const { environment } = require('./check-personal-commerce.cjs');
(async()=>{
  const s=environment();s.env.STRIPE_SECRET_KEY='sk_test_fixture';s.env.STRIPE_WEBHOOK_SECRET='whsec_fixture';
  const result=await build({entryPoints:[path.join(__dirname,'../supabase/functions/stripe-webhook/index.ts')],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'isolated-legacy',setup(b){
    b.onResolve({filter:/^https:\/\/esm.sh\/stripe@/},()=>({path:'stripe',namespace:'fixture'}));
    b.onResolve({filter:/^https:\/\/esm.sh\/@supabase\/supabase-js@/},()=>({path:'database',namespace:'fixture'}));
    b.onResolve({filter:/^https:\/\/deno.land\/.*\/http\/server.ts$/},()=>({path:'serve',namespace:'fixture'}));
    b.onResolve({filter:/_shared\/email\.ts$/},()=>({path:'email',namespace:'fixture'}));
    b.onLoad({filter:/.*/,namespace:'fixture'},({path:p})=>({contents:p==='stripe'?'export default class Stripe {constructor(){return globalThis.__stripe;}}':p==='database'?'export const createClient=()=>globalThis.__db;':p==='email'?'export const sendTemplatedEmail=(...args)=>globalThis.__send(...args);':'export const serve=h=>globalThis.__handler=h;',loader:'js'}));
  }}]});
  s.context.module={exports:{}};new vm.Script(result.outputFiles[0].text).runInContext(s.context);const h=s.context.__handler;
  const payload=JSON.stringify({id:'evt_qa_recovery',type:'qa.noop',data:{object:{}},livemode:false});
  const deliver=()=>h(new Request('https://functions.invalid/webhook',{method:'POST',headers:{'stripe-signature':s.stripe.webhooks.generateTestHeaderString({payload,secret:'whsec_fixture'})},body:payload}));
  const from=s.db.from.bind(s.db);let fail=true;
  s.db.from=name=>{const query=from(name);if(name==='processed_stripe_events'){const update=query.update.bind(query);query.update=data=>{if(fail){fail=false;throw new Error('Synthetic DB failure after claiming event');}return update(data);};}return query;};
  assert.equal((await deliver()).status,500);assert.equal(s.db.rows('processed_stripe_events').length,0,'Failed event releases its claim');
  assert.equal((await deliver()).status,200);assert.equal(s.db.rows('processed_stripe_events')[0].status,'processed');
  assert.equal((await deliver()).status,200);assert.equal(s.db.rows('processed_stripe_events').length,1);assert.equal(s.calls.emails.length,0);
  console.log('PASS legacy webhook returns 500 and releases failed claims, retries once, and deduplicates success. No external services contacted.');
})().catch(e=>{console.error(e);process.exitCode=1;});
