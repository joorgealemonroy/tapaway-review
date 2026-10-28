// Isolated provider-proof checks. No real Stripe, customer records or emails.
const assert = require('node:assert/strict');
const path = require('node:path');
const { build } = require('esbuild');
const root = path.join(__dirname, '..');
let checks = 0;
const pass = async (name, run) => { await run(); checks++; console.log('PASS ' + name); };
function fixture(priceId) {
  const profile = {id:'00000000-0000-4000-8000-000000000001',stripe_customer_id:'cus_fixture'};
  const invoice={id:'in_fixture',livemode:true,status:'paid',paid:true,amount_paid:500,currency:'usd',customer:'cus_fixture',subscription:'sub_fixture',payment_intent:'pi_fixture',
    lines:{data:[{subscription_item:'si_fixture',price:{id:priceId},amount:500}]}};
  const sub={id:'sub_fixture',livemode:true,status:'active',customer:'cus_fixture',current_period_end:Math.floor(Date.now()/1000)+86400,
    items:{data:[{id:'si_fixture',quantity:1,price:{id:priceId,unit_amount:500,currency:'usd',recurring:{interval:'month',interval_count:1}}}]},latest_invoice:invoice};
  const session={livemode:true,status:'complete',mode:'subscription',subscription:'sub_fixture',customer:'cus_fixture',metadata:{type:'card_addon',profile_id:profile.id}};
  const charge={id:'ch_fixture',livemode:true,paid:true,refunded:false,disputed:false,amount_refunded:0,payment_intent:'pi_fixture',customer:'cus_fixture',invoice:'in_fixture'};
  const payment={id:'pi_fixture',livemode:true,status:'succeeded',currency:'usd',amount_received:500,customer:'cus_fixture',invoice:'in_fixture',latest_charge:charge};
  const state={profile,invoice,sub,session,charge,payment,membership:null};
  state.stripe={subscriptions:{list:async()=>({data:[sub]})},checkout:{sessions:{list:async()=>({data:[session]})}},
    invoices:{retrieve:async()=>invoice},paymentIntents:{retrieve:async()=>payment},charges:{retrieve:async()=>charge}};
  state.db={from:table=>{assert.equal(table,'card_club_memberships');const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:state.membership,error:null})};return q;}};
  return state;
}
(async()=>{
  const result=await build({entryPoints:[path.join(root,'supabase/functions/_shared/legacyCardAllowance.ts')],bundle:true,platform:'node',format:'cjs',write:false});
  const module={exports:{}};new Function('module','exports',result.outputFiles[0].text)(module,module.exports);
  const {legacyCardPaymentProof,LEGACY_CARD_ADDON_PRICE}=module.exports;
  const run=s=>legacyCardPaymentProof(s.stripe,s.db,s.profile);
  await pass('Current live paid legacy add-on returns exact subscription, invoice and payment binding',async()=>{
    assert.deepEqual(await run(fixture(LEGACY_CARD_ADDON_PRICE)),{subscriptionId:'sub_fixture',invoiceId:'in_fixture',paymentIntentId:'pi_fixture'});
  });
  await pass('Trial, expired, test-mode and canceled subscriptions cannot claim the allowance',async()=>{
    for(const patch of [{status:'trialing'},{status:'canceled'},{current_period_end:1},{livemode:false},{customer:'cus_other'}]){
      const s=fixture(LEGACY_CARD_ADDON_PRICE);Object.assign(s.sub,patch);assert.equal(await run(s),null);
    }
  });
  await pass('Price, currency, quantity and interval must match the original three-card plan',async()=>{
    for(const patch of [{id:'price_other'},{unit_amount:1},{currency:'eur'},{recurring:{interval:'year',interval_count:1}}]){
      const s=fixture(LEGACY_CARD_ADDON_PRICE);Object.assign(s.sub.items.data[0].price,patch);assert.equal(await run(s),null);
    }
    const s=fixture(LEGACY_CARD_ADDON_PRICE);s.sub.items.data[0].quantity=2;assert.equal(await run(s),null);
  });
  await pass('Modern memberships cannot also consume the legacy allowance',async()=>{
    const s=fixture(LEGACY_CARD_ADDON_PRICE);s.membership={id:'fixture-modern'};assert.equal(await run(s),null);
  });
  await pass('Only the profile bound by the original completed Checkout Session qualifies',async()=>{
    for(const patch of [{status:'open'},{livemode:false},{customer:'cus_other'},{subscription:'sub_other'},{metadata:{type:'card_addon',profile_id:'someone-else'}},{metadata:{type:'other',profile_id:'00000000-0000-4000-8000-000000000001'}}]){
      const s=fixture(LEGACY_CARD_ADDON_PRICE);Object.assign(s.session,patch);assert.equal(await run(s),null);
    }
  });
  await pass('Unpaid, zero-value, wrong-customer or mismatched invoices do not establish payment',async()=>{
    for(const patch of [{status:'open'},{paid:false},{amount_paid:0},{customer:'cus_other'},{subscription:'sub_other'},{lines:{data:[]}},{payment_intent:null}]){
      const s=fixture(LEGACY_CARD_ADDON_PRICE);Object.assign(s.invoice,patch);assert.equal(await run(s),null);
    }
  });
  await pass('Failed or mismatched payment intents cannot grant free card requests',async()=>{
    for(const patch of [{status:'processing'},{livemode:false},{amount_received:0},{customer:'cus_other'},{invoice:'in_other'},{latest_charge:null}]){
      const s=fixture(LEGACY_CARD_ADDON_PRICE);Object.assign(s.payment,patch);assert.equal(await run(s),null);
    }
  });
  await pass('Full or partial refunds, disputes and mismatched charges are rejected',async()=>{
    for(const patch of [{refunded:true},{amount_refunded:1},{disputed:true},{paid:false},{livemode:false},{payment_intent:'pi_other'},{customer:'cus_other'},{invoice:'in_other'}]){
      const s=fixture(LEGACY_CARD_ADDON_PRICE);Object.assign(s.charge,patch);assert.equal(await run(s),null);
    }
  });
  console.log(`${checks} legacy card payment checks passed`);
})().catch(error=>{console.error(error);process.exit(1)});
