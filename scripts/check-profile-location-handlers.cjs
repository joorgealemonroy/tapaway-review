// Actual edge handlers with in-memory providers. No messages or network access.
const assert=require('node:assert/strict');
const {createHmac}=require('node:crypto');
const {environment,load,request}=require('./check-personal-commerce.cjs');
const PROFILE='55555555-5555-4555-8555-555555555555';
const LOCATION='66666666-6666-4666-8666-666666666666';
let checks=0;const pass=async(name,work)=>{await work();console.log('PASS '+name);checks++;};
async function sender(status='ready') {
 const s=environment();Object.assign(s.env,{SUPABASE_URL:'https://database.invalid',SUPABASE_ANON_KEY:'fixture',TWILIO_API_KEY:'fixture',TWILIO_FROM_NUMBER:'+12025550180'});
 s.context.Deno.serve=h=>s.context.__handler=h;s.db.auth.getUser=async()=>({data:{user:{id:'customer'}},error:null});
 s.db.rows('personal_profiles').push({id:PROFILE,user_id:'customer',full_name:'Wrong display label',is_approved:true,subscription_status:'active'});
 s.db.rows('profile_sms_programs').push({profile_id:PROFILE,brand_name:'AV Meal Prep',sender_status:status,sender_number:'+16615550999',registration_reference:'fixture-approved',sender_verified_at:'2026-11-01',opt_out_webhook_verified_at:'2026-11-01'});
 s.db.rows('personal_email_captures').push({profile_id:PROFILE,phone:'+16615550123',sms_opt_in:true,sms_marketing_opt_in:true});
 const oldRpc=s.db.rpc.bind(s.db);s.audienceCalls=[];s.rechecks=[];
 s.db.rpc=async(name,args)=>{
  if(name==='has_role')return{data:false,error:null};
  if(name==='personal_profile_is_active')return{data:true,error:null};
  if(name==='get_profile_location_sms_recipients'){s.audienceCalls.push(args);return s.audienceError?{data:null,error:{code:'22023'}}:{data:[{phone:'+16615550123'},{phone:'+16615550124'},{phone:'+16615550124'}],error:null};}
  if(name==='profile_location_sms_recipient_allowed'){s.rechecks.push(args);return{data:args.p_phone!==s.revokedPhone,error:null};}
  return oldRpc(name,args);
 };
 s.provider=[];s.context.fetch=async(url,init)=>{assert.equal(url,'https://connector-gateway.lovable.dev/twilio/Messages.json');s.provider.push(new URLSearchParams(init.body));return new Response('{}',{status:201});};
 const handler=await load('supabase/functions/send-mass-sms/index.ts',s);
 const send=(extra={})=>{const req=request({profile_id:PROFILE,message:'Fresh meals have arrived at Store One.',campaign_type:'restock',location_id:LOCATION,confirmed_restock:true,...extra});req.headers.set('Authorization','Bearer fixture');return handler(req);};
 return{s,send};
}
(async()=>{
 await pass('Managed sender pending blocks provider traffic even if the global TapAway sender exists',async()=>{
  const {s,send}=await sender('pending');const r=await send();assert.equal(r.status,409);assert.equal((await r.json()).code,'SMS_SENDER_NOT_READY');assert.equal(s.provider.length,0);assert.equal(s.db.rows('sms_campaigns').length,0);
 });
 await pass('A managed sender cannot reuse the shared legacy sender even if marked verified',async()=>{
  const {s,send}=await sender();s.db.rows('profile_sms_programs')[0].sender_number=s.env.TWILIO_FROM_NUMBER;
  const r=await send();assert.equal(r.status,409);assert.equal((await r.json()).code,'SMS_SENDER_NOT_READY');assert.equal(s.provider.length,0);assert.equal(s.audienceCalls.length,0);assert.equal(s.db.rows('sms_campaigns').length,0);
 });
 await pass('Owner checks, explicit topic and confirmed restock prevent unintended audiences',async()=>{
  const {s,send}=await sender();s.db.rows('personal_profiles')[0].user_id='someone-else';assert.equal((await send()).status,403);s.db.rows('personal_profiles')[0].user_id='customer';
  assert.equal((await send({campaign_type:undefined})).status,400);assert.equal((await send({confirmed_restock:false})).status,400);
  assert.equal((await send({campaign_type:'ordering'})).status,400);s.audienceError=true;assert.equal((await send()).status,400);assert.equal(s.provider.length,0);
 });
 await pass('Scoped send deduplicates numbers, rechecks revocation, and uses the verified merchant sender',async()=>{
  const {s,send}=await sender();s.revokedPhone='+16615550124';const r=await send();assert.equal(r.status,200);const body=await r.json();assert.equal(body.recipient_count,1);assert.equal(body.success_count,1);assert.equal(body.skipped_opt_outs,1);
  assert.equal(s.provider.length,1);assert.equal(s.provider[0].get('From'),'+16615550999');assert.match(s.provider[0].get('Body'),/^AV Meal Prep:/);assert.match(s.provider[0].get('Body'),/Reply STOP to opt out/);
  assert.equal(s.audienceCalls[0].p_location_id,LOCATION);assert.equal(s.audienceCalls[0].p_campaign_type,'restock');assert.equal(s.rechecks.length,2);assert.equal(s.rechecks[0].p_sender_number,'+16615550999');
  const campaign=s.db.rows('sms_campaigns')[0];assert.equal(campaign.campaign_type,'restock');assert.equal(campaign.location_id,LOCATION);assert.equal(campaign.recipient_count,1);
 });
 await pass('Ordering-only campaigns deliberately use the ordering audience without a fridge filter',async()=>{
  const {s,send}=await sender();assert.equal((await send({campaign_type:'ordering',location_id:null,message:'This week’s menu is ready.'})).status,200);assert.equal(s.audienceCalls[0].p_campaign_type,'ordering');assert.equal(s.audienceCalls[0].p_location_id,null);assert.equal(s.provider.length,2);
 });
 await pass('Location signup normalizes a phone, records only explicit selected consent and preserves rate limits',async()=>{
  const s=environment();Object.assign(s.env,{SUPABASE_URL:'https://database.invalid'});const records=[];const old=s.db.rpc.bind(s.db);
  s.db.rpc=async(name,args)=>{if(name==='record_profile_location_sms_opt_in'){records.push(args);return{data:'contact',error:null};}return old(name,args);};
  s.context.fetch=async()=>{throw new Error('Signup must never send a message');};const h=await load('supabase/functions/public-intake/index.ts',s);
  const data={action:'location_sms_subscribe',profileId:PROFILE,locationId:LOCATION,phone:'(661) 555-0123',restockConsent:true,orderingConsent:false,consentVersion:1};
  assert.equal((await h(request({...data,restockConsent:'yes'}))).status,400);assert.equal(records.length,0);
  for(let i=0;i<3;i++)assert.equal((await h(request(data))).status,200);assert.equal((await h(request(data))).status,429);
  assert.equal(records.length,3);assert.equal(records[0].p_phone,'+16615550123');assert.equal(records[0].p_restock_consent,true);assert.equal(records[0].p_ordering_consent,false);assert.equal(records[0].p_consent_version,1);assert.equal(records[0].p_name,null);
 });
 await pass('Invalid, stale and bot signup requests do not bypass the authoritative consent RPC',async()=>{
  const s=environment();let writes=0;const old=s.db.rpc.bind(s.db);s.db.rpc=async(name,args)=>{if(name==='record_profile_location_sms_opt_in'){writes++;return{error:{code:'22023',message:'Please refresh the signup form and review the updated consent'}};}return old(name,args);};
  const h=await load('supabase/functions/public-intake/index.ts',s);const data={action:'location_sms_subscribe',profileId:PROFILE,phone:'+16615550123',orderingConsent:true,consentVersion:1};
  assert.equal((await h(request({...data,website:'bot.invalid'}))).status,200);assert.equal(writes,0);
  assert.equal((await h(request({...data,locationId:'not-a-uuid'}))).status,400);assert.equal(writes,0);
  const stale=await h(request(data));assert.equal(stale.status,400);assert.match((await stale.json()).error,/refresh/);assert.equal(writes,1);
 });
 await pass('Only signed Twilio STOP messages can revoke the merchant selected by the destination number',async()=>{
  const s=environment();const webhookUrl='https://functions.invalid/twilio-webhook';Object.assign(s.env,{SUPABASE_URL:'https://database.invalid',TWILIO_AUTH_TOKEN:'fixture-secret',TWILIO_WEBHOOK_URL:webhookUrl});s.context.Deno.serve=h=>s.context.__handler=h;
  s.db.rows('personal_email_captures').push({profile_id:'unrelated',phone:'+16615550123',sms_opt_in:true});const calls=[];s.db.rpc=async(name,args)=>{assert.equal(name,'revoke_profile_location_sms');calls.push(args);return{data:true,error:null};};
  const h=await load('supabase/functions/twilio-webhook/index.ts',s);const params=new URLSearchParams({From:'+16615550123',To:'+16615550999',Body:'Stop',OptOutType:'STOP'});
  const signed=webhookUrl+[...params.keys()].sort().map(k=>k+params.get(k)).join('');const sig=createHmac('sha1','fixture-secret').update(signed).digest('base64');
  const req=(signature,body=params.toString())=>new Request(webhookUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','x-twilio-signature':signature},body});
  assert.equal((await h(req('invalid'))).status,200);assert.equal(calls.length,0);assert.equal((await h(req(sig,params.toString()+'&Injected=true'))).status,200);assert.equal(calls.length,0);
  assert.equal((await h(req(sig))).status,200);assert.equal(calls.length,1);assert.equal(calls[0].p_sender_number,'+16615550999');assert.equal(calls[0].p_phone,'+16615550123');assert.equal(s.db.rows('personal_email_captures')[0].sms_opt_in,true);
 });
 await pass('Shared-number STOP reaches legacy revocation even if a managed sender was misconfigured to collide',async()=>{
  for(const managed of [false,true]) {
   const s=environment();const webhookUrl='https://functions.invalid/twilio-webhook';Object.assign(s.env,{SUPABASE_URL:'https://database.invalid',TWILIO_AUTH_TOKEN:'fixture-secret',TWILIO_WEBHOOK_URL:webhookUrl,TWILIO_FROM_NUMBER:'+12025550180'});s.context.Deno.serve=h=>s.context.__handler=h;
   const calls=[];s.db.rpc=async(name,args)=>{calls.push({name,args});return{data:name==='revoke_profile_location_sms'?managed:{personal_count:1,restaurant_count:1},error:null};};
   const h=await load('supabase/functions/twilio-webhook/index.ts',s);const params=new URLSearchParams({From:'+16615550123',To:'+12025550180',Body:'STOP'});
   const signed=webhookUrl+[...params.keys()].sort().map(k=>k+params.get(k)).join('');const sig=createHmac('sha1','fixture-secret').update(signed).digest('base64');
   const r=await h(new Request(webhookUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','x-twilio-signature':sig},body:params.toString()}));
   assert.equal(r.status,200);assert.deepEqual(calls.map(c=>c.name),['revoke_profile_location_sms','revoke_legacy_shared_sms']);assert.equal(calls[1].args.p_phone,'+16615550123');
  }
 });
 console.log(`${checks} managed location handler checks passed. No external traffic.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
