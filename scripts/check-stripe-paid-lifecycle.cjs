/* Real Stripe TEST settlement + actual activation/lifecycle helpers in isolated
 * DB/auth/storage/email fixtures. This does NOT complete Stripe's hosted Checkout
 * page, nor create a production user. Live keys are refused. */
const assert=require('node:assert/strict'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const {environment,load,request,pdfBase64,draft}=require('./check-personal-commerce.cjs');
const key=process.env.STRIPE_TEST_SECRET_KEY;
if(!/^(sk|rk)_test_/.test(key||''))throw new Error('Stripe TEST key required; live keys refused.');
const Stripe=require(path.join(process.env.QA_MODULES,'stripe'));
const stripe=new Stripe(key,{apiVersion:'2023-10-16'}),subs=[],payments=[];
let customer,checks=0;
const pass=name=>{checks++;console.log('PASS '+name);};
(async()=>{
customer=await stripe.customers.create({name:'TapAway isolated launch QA',metadata:{qa:'launch-lifecycle',run:randomUUID()}});assert.equal(customer.livemode,false);
const pm=await stripe.paymentMethods.attach('pm_card_visa',{customer:customer.id});
const sub=await stripe.subscriptions.create({customer:customer.id,items:[{price:'price_1UQOCBDg8DaTuVNZQbcVxN2M'}],default_payment_method:pm.id,payment_behavior:'error_if_incomplete',expand:['latest_invoice.payment_intent'],metadata:{qa:'launch-lifecycle'}});subs.push(sub.id);assert.equal(sub.livemode,false);assert.equal(sub.status,'active');assert.equal(sub.latest_invoice.status,'paid');assert.equal(sub.latest_invoice.payment_intent.status,'succeeded');payments.push(sub.latest_invoice.payment_intent.id);pass('Stripe TEST recurring invoice actually paid');
const s=environment(),h=await load('supabase/functions/payment-first-checkout/index.ts',s);assert.equal((await h(request({checkoutVersion:2,plan:'solo',interval:'month',cardClub:false,business:{name:'Isolated QA',city:'QA, CA'}}))).status,200);const intent=s.db.rows('checkout_intents')[0],session=[...s.sessions.values()][0];intent.main_price_id=sub.items.data[0].price.id;Object.assign(session,{status:'complete',payment_status:'paid',customer:customer.id,subscription:sub.id,customer_details:{email:'qa@example.invalid'}});delete s.context.__handler;const api=await load('supabase/functions/_shared/paymentFirstActivation.ts',s);await api.activateCheckout(stripe,session);await api.activateCheckout(stripe,session);assert.equal(s.db.rows('personal_profiles').length,1);assert.equal(s.calls.emails.length,1);assert.ok(intent.activated_at);assert.equal(s.db.rows('personal_profiles')[0].subscription_status,'pending');pass('Actual business activation handles settled TEST subscription once, without live access');
await stripe.subscriptions.cancel(sub.id);await api.syncBusinessSubscription(stripe,sub.id);assert.equal((await stripe.subscriptions.retrieve(sub.id)).status,'canceled');assert.equal(s.db.rows('personal_profiles')[0].subscription_status,'pending');pass('Real TEST cancellation stays isolated from production access');
const pi=await stripe.paymentIntents.create({amount:3900,currency:'usd',customer:customer.id,payment_method:pm.id,payment_method_types:['card'],confirm:true,metadata:{qa:'launch-lifecycle'}});payments.push(pi.id);assert.equal(pi.livemode,false);assert.equal(pi.status,'succeeded');pass('Stripe TEST one-time $39 payment actually settled');
const p=environment(),ph=await load('supabase/functions/personal-card-order/index.ts',p);assert.equal((await ph(request({action:'create',draft:draft(false),pdf:await pdfBase64()}))).status,200);const order=p.db.rows('personal_card_orders')[0],ps=[...p.sessions.values()][0];Object.assign(ps,{status:'complete',payment_status:'paid',amount_total:pi.amount,currency:pi.currency,payment_intent:pi.id,customer:customer.id,customer_details:{email:'qa@example.invalid',name:'QA Buyer'},shipping_details:{name:'QA Buyer',address:{line1:'1 QA St',city:'QA',state:'CA',postal_code:'90000',country:'US'}}});delete p.context.__handler;const pa=await load('supabase/functions/_shared/personalCards.ts',p);await pa.activatePersonalOrder(stripe,ps);await pa.activatePersonalOrder(stripe,ps);assert.equal(order.production_status,'needs_review');assert.equal(p.calls.emails.length,1);assert.equal(p.db.rows('personal_profiles').length,0);pass('Personal paid order reaches review exactly once with no unwanted subscription');
try{await stripe.paymentIntents.create({amount:3900,currency:'usd',payment_method:'pm_card_chargeDeclined',payment_method_types:['card'],confirm:true,metadata:{qa:'launch-lifecycle'}});throw new Error('Expected decline');}catch(e){assert.equal(e.type,'StripeCardError');}pass('Stripe TEST decline produces no successful payment');
console.log(JSON.stringify({checks,scope:'Real TEST API settlements; simulated completed Checkout envelope; actual helpers with isolated DB/auth/email. Hosted payment page and real inbox not exercised.'}));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{
for(const id of subs)try{const s=await stripe.subscriptions.retrieve(id);if(s.status!=='canceled')await stripe.subscriptions.cancel(id);}catch(e){console.error('TEST subscription cleanup failed: '+id);process.exitCode=1;}
for(const id of payments)try{await stripe.refunds.create({payment_intent:id});}catch(e){console.error('TEST payment cleanup failed: '+id);process.exitCode=1;}
if(customer)try{await stripe.customers.del(customer.id);}catch(e){console.error('TEST customer cleanup failed: '+customer.id);process.exitCode=1;}
console.log('TEST cleanup finished; no production customer or billing record touched.');
});
