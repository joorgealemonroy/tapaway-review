/* Isolated provider doubles: no real purchases, emails or customer mutations. */
const assert = require('node:assert/strict');
const { environment, load } = require('./check-personal-commerce.cjs');
const crypto = require('node:crypto');
const HUB = '11111111-1111-4111-8111-111111111111', OWNER = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'a'.repeat(64), hash = v => crypto.createHash('sha256').update(v).digest('hex');
let n = 0;
const pass = async (name, fn) => { await fn(); n++; console.log('PASS ' + name); };
async function fixture(kind='personal') {
  const s = environment(); s.context.__mode='live'; Object.assign(s.env,{RESEND_API_KEY:'fixture',SUPABASE_URL:'https://database.invalid'});
  s.context.Deno.serve=h=>s.context.__handler=h;
  const profile={id:HUB,user_id:OWNER,owner_id:OWNER,email:'owner@example.invalid',username:'existing-hub',custom_slug:'existing-hub',full_name:'Existing hub',restaurant_name:'Existing hub',is_approved:true,subscription_status:'active',payment_state:'complimentary',plan_type:'solo_pro',bio:'untouched',legacy_allowance:false};
  s.db.rows(kind==='personal'?'personal_profiles':'restaurants').push(profile);
  s.db.users.set('owner@example.invalid',{id:OWNER,email:'owner@example.invalid'});
  s.db.auth.admin.getUserById=async id=>({data:{user:{id,email:'owner@example.invalid'}},error:null});
  s.db.auth.admin.generateLink=async ({email})=>({data:{properties:{hashed_token:'fixture_auth_hash'},user:{id:OWNER,email}},error:null});
  s.db.auth.verifyOtp=async()=>({data:{user:{id:OWNER,email:'owner@example.invalid'},session:{access_token:'fixture_access',refresh_token:'fixture_refresh'}},error:null});
  s.stripe.customers={list:async()=>({data:[],has_more:false})}; s.stripe.subscriptions.list=async()=>({data:[],has_more:false});
  const i={id:'33333333-3333-4333-8333-333333333333',hub_kind:kind,hub_id:HUB,bound_owner_id:OWNER,intended_email:'owner@example.invalid',token_hash:hash(TOKEN),expires_at:new Date(Date.now()+86400000).toISOString(),stripe_livemode:true};
  s.db.rows('subscription_invitations').push(i);
  const rpc=s.db.rpc.bind(s.db);
  s.db.rpc=async(name,args)=>{
    if(name==='fulfill_subscription_invitation') { assert.equal(args._id,i.id); if(!i.paid_at) {Object.assign(i,{paid_at:args._paid_at,stripe_subscription_id:args._subscription});Object.assign(profile,{subscription_status:'active',payment_state:'paying',stripe_subscription_id:args._subscription});}return {data:{paid:true},error:null}; }
    if(name==='associate_subscription_invitation') {assert.equal(args._user,OWNER);i.associated_at=new Date().toISOString();return {data:{associated:true},error:null};}
    return rpc(name,args);
  };
  const create=s.stripe.checkout.sessions.create;
  s.stripe.checkout.sessions.create=async(...args)=>{const session=await create(...args);session.livemode=true;return session;};
  s.context.fetch=async(url,init)=>{assert.equal(url,'https://api.resend.com/emails');s.calls.emails.push(JSON.parse(init.body));if(s.failMail){s.failMail=false;return new Response('',{status:503});}return new Response(JSON.stringify({id:'fixture_mail'}),{status:200});};
  const api=await load('supabase/functions/_shared/subscriptionInvitation.ts',s);
  const call=body=>api.handleSubscriptionInvitation(new Request('https://functions.invalid/invite',{method:'POST',headers:{'x-forwarded-for':'192.0.2.1'},body:JSON.stringify(body)}));
  const checkout=(plan='solo',interval='month',cardClub=false)=>call({action:'checkout',token:TOKEN,plan,interval,cardClub});
  function paid(plan='solo',interval='month',club=false) {
    const session=[...s.sessions.values()][0],meta=session.metadata,amount=plan==='solo'?interval==='year'?19900:2000:interval==='year'?39000:3900,total=amount+(club?interval==='year'?6000:500:0);
    Object.assign(session,{status:'complete',payment_status:'paid',subscription:'sub_fixture',customer:'cus_fixture',shipping_details:{name:'Owner',address:{line1:'1 Fixture St',city:'City',state:'CA',postal_code:'90000',country:'US'}}});
    const invoice={id:'in_fixture',livemode:true,paid:true,status:'paid',amount_paid:total,currency:'usd',customer:'cus_fixture',subscription:'sub_fixture',payment_intent:'pi_fixture',status_transitions:{paid_at:1700000000}};
    const sub={id:'sub_fixture',livemode:true,status:'active',customer:'cus_fixture',metadata:meta,latest_invoice:invoice,items:{data:[{id:'si_main',quantity:1,price:{id:`price_${plan}_${interval}`,unit_amount:amount,currency:'usd',recurring:{interval,interval_count:1}}},...(club?[{id:'si_club',quantity:1,price:{id:'price_club',product:'prod_club',unit_amount:interval==='year'?6000:500,currency:'usd',recurring:{interval,interval_count:1}}}]:[])]}};
    s.subscriptions.set(sub.id,sub);
    const charge={livemode:true,paid:true,payment_intent:'pi_fixture',invoice:'in_fixture',amount_refunded:0,refunded:false,disputed:false};
    s.stripe.paymentIntents.retrieve=async()=>({id:'pi_fixture',livemode:true,status:'succeeded',amount_received:total,currency:'usd',customer:'cus_fixture',invoice:'in_fixture',latest_charge:charge});
    return {session,sub,invoice,charge};
  }
  return {s,i,profile,api,call,checkout,paid};
}
(async()=>{
  for(const plan of ['solo','venue']) for(const interval of ['month','year']) for(const club of [false,true]) await pass(`${plan}/${interval}/club=${club}: exact immediate-charge contract and activation`,async()=>{
    const f=await fixture();assert.equal((await f.checkout(plan,interval,club)).status,200);const p=f.s.calls.checkout[0];assert.equal(p.subscription_data.trial_period_days,undefined);assert.equal(p.line_items.length,club?2:1);assert.equal(p.line_items[0].price,`price_${plan}_${interval}`);assert.equal(p.customer_email,'owner@example.invalid');if(club&&interval==='year'){assert.equal(p.line_items[1].price_data.unit_amount,6000);assert.equal(p.line_items[1].price_data.recurring.interval,'year');}if(club&&interval==='month')assert.equal(p.line_items[1].price,'price_card_club');const proof=f.paid(plan,interval,club);await f.api.activateSubscriptionInvitation(f.s.stripe,proof.session);await f.api.activateSubscriptionInvitation(f.s.stripe,proof.session);assert.equal(f.profile.id,HUB);assert.equal(f.profile.username,'existing-hub');assert.equal(f.profile.bio,'untouched');assert.equal(f.profile.user_id,OWNER);assert.equal(f.profile.legacy_allowance,false);assert.equal(f.s.calls.emails.length,1);assert.equal(f.s.calls.separate.length,0);
  });
  await pass('Admin-only creation; opening never changes free active profile',async()=>{const f=await fixture();const before=JSON.stringify(f.profile);assert.equal((await f.call({action:'mint',kind:'personal',hubId:HUB,email:'owner@example.invalid'})).status,401);f.s.context.__user={id:OWNER};assert.equal((await f.call({action:'mint',kind:'personal',hubId:HUB,email:'owner@example.invalid'})).status,403);assert.equal(JSON.stringify(f.profile),before);});
  await pass('Paid and uncertain billing fail closed',async()=>{for(const failure of ['paid','uncertain']){const f=await fixture();if(failure==='paid')f.profile.stripe_subscription_id='sub_existing';else f.s.stripe.customers.list=async()=>{throw Error('provider down');};assert.equal((await f.checkout()).status,409);assert.equal(f.s.calls.checkout.length,0);assert.equal(f.profile.is_approved,true);}});
  await pass('Concurrent checkout and retry create one session',async()=>{const f=await fixture();const responses=await Promise.all([f.checkout(),f.checkout(),f.checkout()]);assert.ok(responses.some(r=>r.status===200));assert.equal(f.s.calls.checkout.length,1);assert.equal((await f.checkout()).status,200);assert.equal(f.s.calls.checkout.length,1);});
  await pass('Cancel/change expires old session without interrupting live hub',async()=>{const f=await fixture();await f.checkout();const old=[...f.s.sessions.values()][0];await f.checkout('venue','year',true);assert.equal(old.status,'expired');assert.equal(f.profile.is_approved,true);assert.equal(f.profile.payment_state,'complimentary');assert.equal(f.profile.stripe_subscription_id,undefined);});
  await pass('Expired/revoked/invalid links and failed payment leave hub public',async()=>{for(const mode of ['expired','revoked','invalid','failed']){const f=await fixture();if(mode==='expired')f.i.expires_at='2020-01-01';if(mode==='revoked')f.i.revoked_at='2020-01-01';if(mode==='failed'){await f.checkout();const paid=f.paid();paid.session.payment_status='unpaid';await f.api.activateSubscriptionInvitation(f.s.stripe,paid.session);}else assert.equal((await f.call({action:'checkout',token:mode==='invalid'?'bad':TOKEN,plan:'solo',interval:'month',cardClub:false})).status,409);assert.equal(f.profile.is_approved,true);assert.equal(f.profile.subscription_status,'active');assert.equal(f.profile.payment_state,'complimentary');assert.equal(f.s.calls.emails.length,0);}});
  await pass('Cross-session and spoofed browser success cannot activate',async()=>{const f=await fixture();await f.checkout();assert.equal((await(await f.call({action:'status',token:TOKEN,sessionId:'cs_other'})).json()).status,'not_paid');assert.equal(f.i.paid_at,undefined);const paid=f.paid();paid.session.metadata.hub_id='other';await assert.rejects(()=>f.api.activateSubscriptionInvitation(f.s.stripe,paid.session));assert.equal(f.i.paid_at,undefined);});
  await pass('Email retries keep identical one-use access link; owner verifies once',async()=>{const f=await fixture();await f.checkout();const paid=f.paid();f.s.failMail=true;await assert.rejects(()=>f.api.activateSubscriptionInvitation(f.s.stripe,paid.session));await f.api.activateSubscriptionInvitation(f.s.stripe,paid.session);assert.equal(f.s.calls.emails[0].text,f.s.calls.emails[1].text);const token=f.i.access_delivery_token;assert.equal((await f.call({action:'access',accessToken:token})).status,200);assert.equal((await f.call({action:'access',accessToken:token})).status,410);assert.equal(f.profile.user_id,OWNER);});
  await pass('Restaurant paid activation preserves existing restaurant identity',async()=>{const f=await fixture('restaurant');await f.checkout('venue','month',false);await f.api.activateSubscriptionInvitation(f.s.stripe,f.paid('venue','month',false).session);assert.equal(f.s.db.rows('personal_profiles').length,0);assert.equal(f.profile.owner_id,OWNER);assert.equal(f.profile.custom_slug,'existing-hub');});
  await pass('Current paid proof rejects mode, prices, invoices and refunded charges',async()=>{for(const change of ['mode','price','invoice','refund','trial']){const f=await fixture();await f.checkout();const paid=f.paid();if(change==='mode')paid.sub.livemode=false;if(change==='price')paid.sub.items.data[0].price.unit_amount=1;if(change==='invoice')paid.invoice.paid=false;if(change==='refund')paid.charge.refunded=true;if(change==='trial')paid.sub.trial_end=1800000000;try{await f.api.activateSubscriptionInvitation(f.s.stripe,paid.session);}catch{}assert.equal(f.i.paid_at,undefined);assert.equal(f.s.calls.emails.length,0);}});
  console.log(`${n} optional invitation checks passed; no external traffic.`);
})().catch(e=>{console.error(e);process.exitCode=1;});