/* Actual checkout handlers + real Stripe TEST API. Database, artwork storage, auth,
 * and email remain isolated fixtures. This is not a paid end-to-end browser test.
 * Needs STRIPE_TEST_SECRET_KEY and QA_MODULES containing stripe@14.21.0.
 * Never prints keys, checkout URLs, or changes the deployed environment.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { environment, load, request, pdfBase64, draft } = require('./check-personal-commerce.cjs');
const key = process.env.STRIPE_TEST_SECRET_KEY;
if (!/^(sk|rk)_test_/.test(key || '')) throw new Error('A Stripe TEST key is required. Live keys are refused.');
const Stripe = require(path.join(process.env.QA_MODULES, 'stripe'));
const stripe = new Stripe(key, { apiVersion:'2023-10-16' });
const offers = {
  solo_month:['price_1UQOCBDg8DaTuVNZQbcVxN2M',2000,'month'],
  solo_year:['price_1UQOCBDg8DaTuVNZ7lC5mlkg',19900,'year'],
  venue_month:['price_1UQOCCDg8DaTuVNZ49I2RTMk',3900,'month'],
  venue_year:['price_1UQOCCDg8DaTuVNZLnrnkW3G',39000,'year'],
  card_club:['price_1UQOCCDg8DaTuVNZufOCdQhk',500,'month'],
};
const results = [];
const openSessions = new Set();
async function verifiedPrice(offer) {
  const [id,amount,interval]=offers[offer], p=await stripe.prices.retrieve(id);
  assert.equal(p.livemode,false);assert.equal(p.active,true);assert.equal(p.unit_amount,amount);assert.equal(p.currency,'usd');assert.equal(p.recurring?.interval,interval);
  return {id,amount,interval,product:typeof p.product==='string'?p.product:p.product.id};
}
async function personalPrice(kind,amount,recurring) {
  const id='tapaway_personal_'+kind+'_v1'; let product;
  try { product=await stripe.products.retrieve(id,{expand:['default_price']}); }
  catch(e) { if(e.code!=='resource_missing')throw e;product=await stripe.products.create({id,name:kind==='cards'?'TapAway Personal — 2 custom NFC cards':'TapAway Personal Hub',metadata:{commerce_version:'personal_cards_v1',item:kind},default_price_data:{currency:'usd',unit_amount:amount,...(recurring?{recurring:{interval:'month'}}:{})},expand:['default_price']},{idempotencyKey:'tapaway-qa-personal-'+kind+'-v1'}); }
  assert.equal(product.livemode,false);assert.equal(product.active,true);const p=product.default_price;
  assert.equal(p.active,true);assert.equal(p.unit_amount,amount);assert.equal(p.currency,'usd');assert.equal(p.type,recurring?'recurring':'one_time');
  return p.id;
}
async function run(name,file,body,expected,prices) {
  const state=environment();state.context.__stripe=stripe;state.context.__verifiedPrice=verifiedPrice;
  state.env.PERSONAL_CARDS_PRICE_ID_TEST=prices.cards;state.env.PERSONAL_HUB_PRICE_ID_TEST=prices.hub;
  // Track every created session for cleanup even if a handler check fails later.
  const tracked=Object.create(stripe);
  tracked.checkout={sessions:{...stripe.checkout.sessions,create:async(...args)=>{const s=await stripe.checkout.sessions.create(...args);assert.equal(s.livemode,false);openSessions.add(s.id);return s;}}};
  state.context.__stripe=tracked;
  const handler=await load(file,state), response=await handler(request(body));
  if(response.status!==200)throw new Error(name+': handler returned '+response.status+' '+await response.text());
  const table=file.includes('personal-card-order')?'personal_card_orders':'checkout_intents';
  const id=state.db.rows(table)[0].stripe_checkout_session_id;
  const s=await stripe.checkout.sessions.retrieve(id,{expand:['line_items']});
  assert.equal(s.livemode,false);assert.equal(s.status,'open');assert.equal(s.customer,null);assert.equal(s.subscription,null);assert.equal(s.mode,expected.mode);assert.equal(s.amount_total,expected.total);
  assert.equal(s.line_items.data.length,expected.lines.length);
  s.line_items.data.forEach((line,i)=>{assert.equal(line.price.unit_amount,expected.lines[i].amount);assert.equal(line.price.recurring?.interval||null,expected.lines[i].interval);assert.equal(line.quantity,1);});
  assert.equal(state.calls.emails.length,0);
  await stripe.checkout.sessions.expire(id);openSessions.delete(id);
  assert.equal((await stripe.checkout.sessions.retrieve(id)).status,'expired');
  const record={name,sessionId:id,livemode:false,mode:s.mode,total:s.amount_total,lines:expected.lines,status:'expired',paid:false};results.push(record);console.log('PASS '+JSON.stringify(record));
}
async function main() {
  const prices={cards:await personalPrice('cards',3900,false),hub:await personalPrice('hub',500,true)};
  for(const name of Object.keys(offers))await verifiedPrice(name);
  const pdf=await pdfBase64();
  for(const hosted of [false,true])await run('personal '+(hosted?'with hub':'cards only'),'supabase/functions/personal-card-order/index.ts',{action:'create',draft:draft(hosted),pdf},{mode:hosted?'subscription':'payment',total:hosted?4400:3900,lines:[{amount:3900,interval:null},...(hosted?[{amount:500,interval:'month'}]:[])]},prices);
  for(const plan of ['solo','venue'])for(const interval of ['month','year'])for(const club of [false,true]){
    const amount=offers[plan+'_'+interval][1];
    await run(`business ${plan}/${interval} club=${club}`,'supabase/functions/payment-first-checkout/index.ts',{checkoutVersion:2,plan,interval,cardClub:club,business:{name:'QA configuration check '+randomUUID(),city:'Claremont, CA',goal:'Reviews'}},{mode:'subscription',total:0,lines:[{amount,interval},...(club?[{amount:interval==='year'?6000:500,interval}]:[])]},prices);
  }
  const report={testPrices:prices,checks:results,scope:'Real Stripe test API and actual checkout handlers; isolated database/storage/auth/email. No checkout was paid. No deployed mode changed.'};
  if(process.env.QA_STRIPE_REPORT)writeFileSync(process.env.QA_STRIPE_REPORT,JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:results.length,testPrices:prices,remainingOpenSessions:openSessions.size}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{
  for(const id of openSessions)try{await stripe.checkout.sessions.expire(id);console.log('CLEANED '+id);}catch(e){console.error('Cleanup required for '+id+': '+e.message);process.exitCode=1;}
});
