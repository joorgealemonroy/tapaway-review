/* Two-phase hosted TEST checkout verification. Never writes production auth/DB,
 * never emails customers; activation writes stay in fixtures. Run create, use the
 * returned TEST URL in a browser, then verify. Always run cleanup when blocked. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {environment,load,request,pdfBase64,draft}=require('./check-personal-commerce.cjs');
const key=process.env.STRIPE_TEST_SECRET_KEY;
if(!/^(sk|rk)_test_/.test(key||''))throw new Error('Stripe TEST key required; live keys refused.');
const Stripe=require(path.join(process.env.QA_MODULES,'stripe'));
const stripe=new Stripe(key,{apiVersion:'2023-10-16'}),file=process.env.QA_HOSTED_STATE||'/tmp/tapaway-hosted-test.json',action=process.argv[2];
const sid=value=>typeof value==='string'?value:value?.id;
async function cleanup(state){
 const session=await stripe.checkout.sessions.retrieve(state.sessionId);assert.equal(session.livemode,false);
 if(session.status==='open')await stripe.checkout.sessions.expire(session.id);
 if(session.subscription){const sub=await stripe.subscriptions.retrieve(sid(session.subscription));assert.equal(sub.livemode,false);if(sub.status!=='canceled')await stripe.subscriptions.cancel(sub.id);}
 const customer=sid(session.customer);
 if(customer){const charges=await stripe.charges.list({customer,limit:100});for(const c of charges.data){assert.equal(c.livemode,false);if(c.paid&&!c.refunded)await stripe.refunds.create({charge:c.id});}await stripe.customers.del(customer);}
 fs.unlinkSync(file);console.log('TEST session/customer cleanup completed. No production writes.');
}
(async()=>{
 if(action==='create'){
  if(fs.existsSync(file))throw new Error('Clean up the previous TEST session before creating another.');
  const s=environment();s.context.__stripe=stripe;
  for(const kind of ['cards','hub']){const p=await stripe.products.retrieve('tapaway_personal_'+kind+'_v1',{expand:['default_price']});assert.equal(p.livemode,false);s.env[kind==='cards'?'PERSONAL_CARDS_PRICE_ID_TEST':'PERSONAL_HUB_PRICE_ID_TEST']=p.default_price.id;}
  const handler=await load('supabase/functions/personal-card-order/index.ts',s),response=await handler(request({action:'create',draft:draft(true),pdf:await pdfBase64()}));assert.equal(response.status,200);
  const sessionId=s.db.rows('personal_card_orders')[0].stripe_checkout_session_id,session=await stripe.checkout.sessions.retrieve(sessionId);assert.equal(session.livemode,false);assert.equal(session.amount_total,4400);
  fs.writeFileSync(file,JSON.stringify({sessionId,tables:[...s.db.tables],env:s.env}),{mode:0o600});
  console.log(JSON.stringify({sessionId,url:session.url,scope:'Stripe TEST only: $39 cards + $5 optional hub. Fixture database/auth/email.'}));return;
 }
 const state=JSON.parse(fs.readFileSync(file,'utf8'));
 if(action==='cleanup'){await cleanup(state);return;}
 if(action!=='verify')throw new Error('Use create, verify, or cleanup');
 const session=await stripe.checkout.sessions.retrieve(state.sessionId);assert.equal(session.livemode,false);
 if(session.status!=='complete'||session.payment_status!=='paid')throw new Error('Hosted TEST checkout is not complete and paid. Run cleanup if browser completion is blocked.');
 try{
  const s=environment();s.db.tables=new Map(state.tables);Object.assign(s.env,state.env);s.context.__stripe=stripe;
  const api=await load('supabase/functions/_shared/personalCards.ts',s);await api.activatePersonalOrder(stripe,session);await api.activatePersonalOrder(stripe,session);
  const order=s.db.rows('personal_card_orders')[0];assert.ok(order.activated_at);assert.equal(order.production_status,'needs_review');assert.equal(s.db.rows('personal_profiles').length,1);assert.equal(s.db.rows('personal_profiles')[0].subscription_status,'pending');assert.equal(s.calls.emails.length,1);
  console.log(JSON.stringify({passed:true,checkout:session.id,paid:session.payment_status,amount:session.amount_total,profiles:1,thankYouCalls:1,scope:'Real hosted TEST payment -> actual activation helper with isolated DB/auth/email; no real email or login verification.'}));
 }finally{await cleanup(state);}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
