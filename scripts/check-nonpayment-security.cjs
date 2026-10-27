/* Isolated edge boundary regressions: no real network, delivery or production writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { randomUUID, createHash, createHmac } = require('node:crypto');
const { build } = require('esbuild');
const { environment, request } = require('./check-personal-commerce.cjs');
const root = path.resolve(__dirname, '..');
let checks = 0;
async function check(label, fn) { await fn(); checks++; console.log('PASS ' + label); }
function state() {
  const s = environment();
  Object.assign(s.env, { SUPABASE_URL: 'https://fixture.supabase.co', SUPABASE_ANON_KEY: 'fixture-anon', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service', GOOGLE_PLACES_API_KEY_SERVER: 'fixture-google', TWILIO_AUTH_TOKEN: 'fixture-twilio' });
  s.context.console = {log(){},warn(){},error(){}};
  s.context.Deno.serve = fn => s.context.__handler = fn;
  s.context.__lookup = async () => [{address:'93.184.216.34',family:4}];
  s.context.__request = () => { throw new Error('Unexpected socket call'); };
  s.context.__mail = async options => { s.calls.emails.push(options); return {ok:true,id:'fixture-email'}; };
  s.context.fetch = async () => { throw new Error('Unexpected network call'); };
  s.db.auth.getUser = async () => ({data:{user:s.context.__user},error:null});
  s.db.auth.admin.getUserById = async id => ({data:{user:{id,email:'fixture@example.invalid'}},error:null});
  s.db.auth.admin.updateUserById = async (id, data) => { s.passwords.push({id,data}); return {data:{user:{id}},error:null}; };
  s.db.auth.admin.generateLink = async () => ({data:{properties:{hashed_token:'fixture-session-hash'}},error:null});
  s.db.auth.verifyOtp = async () => ({data:{session:{access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600}},error:null});
  s.passwords=[];
  const from = s.db.from.bind(s.db);
  s.db.from = name => { const q = from(name); q.gt = (k,v) => {q.filters.push(r=>r[k]>v);return q;}; q.gte = (k,v) => {q.filters.push(r=>r[k]>=v);return q;}; return q; };
  return s;
}
async function load(file, s) {
  delete s.context.__handler;
  const result = await build({entryPoints:[path.join(root,file)],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'isolated-nonpayment',setup(b){
    b.onResolve({filter:/^(https:\/\/esm.sh\/@supabase\/supabase-js|npm:@supabase\/supabase-js@2$)/},()=>({path:'db',namespace:'fixture'}));
    b.onResolve({filter:/^npm:@supabase\/supabase-js@2\/cors$/},()=>({path:'cors',namespace:'fixture'}));
    b.onResolve({filter:/^https:\/\/deno.land\/.*\/http\/server.ts$/},()=>({path:'serve',namespace:'fixture'}));
    b.onResolve({filter:/^https:\/\/deno.land\/x\/xhr/},()=>({path:'empty',namespace:'fixture'}));
    b.onResolve({filter:/paymentFirst.ts$/},()=>({path:'payment',namespace:'fixture'}));
    b.onResolve({filter:/\/_shared\/email.ts$/},()=>({path:'email',namespace:'fixture'}));
    b.onResolve({filter:/^https:\/\/esm.sh\/resend@/},()=>({path:'resend',namespace:'fixture'}));
    b.onResolve({filter:/^node:dns\/promises$/},()=>({path:'dns',namespace:'fixture'}));
    b.onResolve({filter:/^node:https?$/},()=>({path:'http',namespace:'fixture'}));
    b.onLoad({filter:/.*/,namespace:'fixture'},({path:p})=>({loader:'js',contents:{db:'export const createClient=()=>globalThis.__db;',cors:'export const corsHeaders={};',serve:'export const serve=fn=>globalThis.__handler=fn;',empty:'',payment:'export const admin=()=>globalThis.__db;export const sendEmail=(...args)=>globalThis.__send(...args);export const frontendUrl=()=>"https://tapaway.co";export const cors={};export const json=(body,status=200)=>new Response(JSON.stringify(body),{status});export const getStripe=()=>globalThis.__stripe;export const verifiedPrice=async()=>({id:"fixture-price",amount:2000});',email:'export const sendEmailAndLog=(opts)=>globalThis.__mail(opts);export const sendTemplatedEmail=(opts)=>globalThis.__mail(opts);',resend:'export class Resend { constructor(){this.emails={send:opts=>globalThis.__mail(opts)}} }',dns:'export const lookup=(...args)=>globalThis.__lookup(...args);',http:'export const request=(...args)=>globalThis.__request(...args);'}[p]}));
  }}]});
  s.context.module={exports:{}}; s.context.exports=s.context.module.exports;
  new vm.Script(result.outputFiles[0].text,{filename:file}).runInContext(s.context);
  return s.context.__handler || s.context.module.exports;
}
const invoke = (body, ip='192.0.2.1') => { const r=request(body,ip); r.headers.set('authorization','Bearer fixture-jwt');return r; };
function socket(s, responses) {
  s.sockets=[];
  s.context.__request=(options, callback)=>{
    s.sockets.push(options); const req=new EventEmitter();req.destroy=error=>{if(error)queueMicrotask(()=>req.emit('error',error));};
    req.end=()=>queueMicrotask(()=>{const value=responses.shift();if(!value)throw new Error('Unexpected HTTP call');if(value.stall)return;
      const incoming=new EventEmitter();incoming.statusCode=value.status||200;incoming.headers=value.headers||{};incoming.destroy=()=>{};
      callback(incoming);queueMicrotask(()=>{if(value.body)incoming.emit('data',Buffer.from(value.body));incoming.emit('end');});
    });return req;
  };
}
function tokenFixture(s, rep=false) {
  const token='fixture-token-'+randomUUID(); const userId=randomUUID();
  s.db.rows(rep?'rep_setup_tokens':'magic_link_tokens').push({id:randomUUID(),user_id:userId,email:'fixture@example.invalid',token,token_hash:createHash('sha256').update(token).digest('hex'),used_at:null,expires_at:new Date(Date.now()+600000).toISOString()});
  if(rep)s.db.rows('sales_reps').push({id:userId});
  return {token,newPassword:'fixture-password-123',setupToken:token,agreementAccepted:true,signatureName:'Fixture Partner'};
}
async function main(){
  for(const rep of [false,true]) {
    const file='supabase/functions/'+(rep?'verify-rep-setup-token':'verify-magic-link')+'/index.ts';
    await check((rep?'rep':'magic')+' token preview and bad input never consume or change password',async()=>{
      const s=state(),b=tokenFixture(s,rep),h=await load(file,s);delete b.newPassword;
      assert.equal((await h(request(b))).status,200);assert.equal(s.passwords.length,0);
      assert.equal((await h(request({...b,newPassword:'short'}))).status,400);
      assert.equal(s.db.rows(rep?'rep_setup_tokens':'magic_link_tokens')[0].used_at,null);
    });
    await check((rep?'rep':'magic')+' concurrent token use allows exactly one password mutation',async()=>{
      const s=state(),b=tokenFixture(s,rep),h=await load(file,s);
      const rs=await Promise.all([h(request(b)),h(request({...b,newPassword:'fixture-different-password'}))]);
      assert.deepEqual(rs.map(x=>x.status).sort(),[200,400]);assert.equal(s.passwords.length,1);
      assert.equal((await h(request(b))).status,400);assert.equal(s.passwords.length,1);
    });
    await check((rep?'rep':'magic')+' ambiguous Auth failure burns token and blocks replay',async()=>{
      const s=state(),b=tokenFixture(s,rep),h=await load(file,s);s.db.auth.admin.updateUserById=async()=>{s.passwords.push({});return {error:{message:'fixture transient'}};};
      assert.equal((await h(request(b))).status,503);assert.equal((await h(request(b))).status,400);assert.equal(s.passwords.length,1);
    });
  }
  await check('magic link canonical email mismatch cannot mutate Auth',async()=>{const s=state(),b=tokenFixture(s),h=await load('supabase/functions/verify-magic-link/index.ts',s);s.db.auth.admin.getUserById=async()=>({data:{user:{email:'other@example.invalid'}}});assert.equal((await h(request(b))).status,400);assert.equal(s.passwords.length,0);});
  await check('rep agreement must persist before success',async()=>{const s=state(),b=tokenFixture(s,true),h=await load('supabase/functions/verify-rep-setup-token/index.ts',s);s.db.tables.set('sales_reps',[]);assert.equal((await h(request(b))).status,503);assert.equal((await h(request(b))).status,400);});
  await check('physical VIP card never grants plan access and only one concurrent claim succeeds',async()=>{
    const s=state();s.context.__user={id:randomUUID()};const profile={user_id:s.context.__user.id,username:'fixture',plan_type:'free',subscription_status:'pending',is_approved:false};s.db.rows('personal_profiles').push(profile);s.db.rows('nfc_cards').push({id:randomUUID(),public_code:'FIXTURE',status:'unclaimed',owner_user_id:null,card_type:'vip',paid_order_ref:'forged-fixture'});
    const h=await load('supabase/functions/claim-card/index.ts',s),rs=await Promise.all([h(invoke({public_code:'FIXTURE'})),h(invoke({public_code:'FIXTURE'}))]);assert.deepEqual(rs.map(x=>x.status).sort(),[200,409]);assert.equal(profile.plan_type,'free');assert.equal(profile.subscription_status,'pending');assert.equal(profile.is_approved,false);
  });
  for(const name of ['assign-test-owner','seed-demo-accounts','magic-onboarding','restore-admin','seed-test-accounts'])await check(name+' is retired without side effects',async()=>{const s=state(),h=await load('supabase/functions/'+name+'/index.ts',s);assert.equal((await h(request({}))).status,410);assert.equal(s.db.tables.size,0);assert.equal(s.calls.emails.length,0);});
  await check('public address boundary rejects internal, mapped, transition and malformed addresses',async()=>{
    const api=await load('supabase/functions/_shared/safeFetch.ts',state());for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','100.64.0.1','192.168.0.1','0.0.0.0','224.0.0.1','::1','::ffff:8.8.8.8','fc00::1','fe80::1','2002:7f00:1::','2001:db8::1','nonsense'])assert.equal(api.isPublicAddress(ip),false,ip);
    for(const ip of ['8.8.8.8','93.184.216.34','2606:4700:4700::1111'])assert.equal(api.isPublicAddress(ip),true,ip);
    for(const u of ['http://example.com','file:///etc/passwd','https://a:b@example.com','https://example.com:8080','https://localhost','https://127.1','https://[::ffff:127.0.0.1]'])assert.throws(()=>api.publicUrl(u));
  });
  await check('outbound request pins DNS address while verifying original TLS host and strips credentials',async()=>{
    const s=state();socket(s,[{body:'fixture'}]);const api=await load('supabase/functions/_shared/safeFetch.ts',s);const r=await api.safeFetch('https://example.com/path?x=1',{headers:{Authorization:'fixture-secret',Cookie:'fixture-cookie',Host:'localhost',Accept:'text/html'}});assert.equal(await r.text(),'fixture');const o=s.sockets[0];assert.equal(o.hostname,'93.184.216.34');assert.equal(o.servername,'example.com');assert.equal(o.rejectUnauthorized,true);assert.equal(o.headers.Host,'example.com');assert.equal(o.headers.Authorization,undefined);assert.equal(o.headers.Cookie,undefined);
  });
  await check('private/mixed DNS and redirected private destination are blocked before connection',async()=>{
    const s=state();socket(s,[{status:302,headers:{location:'https://127.0.0.1/private'}}]);const api=await load('supabase/functions/_shared/safeFetch.ts',s);await assert.rejects(()=>api.safeFetch('https://example.com'));assert.equal(s.sockets.length,1);
    s.context.__lookup=async()=>[{address:'93.184.216.34',family:4},{address:'10.0.0.1',family:4}];await assert.rejects(()=>api.safeFetch('https://example.com'));assert.equal(s.sockets.length,1);
  });
  await check('each redirect revalidates DNS, clamps body size and enforces timeout',async()=>{
    const s=state();let lookups=0;s.context.__lookup=async()=>[++lookups===1?{address:'93.184.216.34',family:4}:{address:'127.0.0.1',family:4}];socket(s,[{status:302,headers:{location:'/next'}}]);const api=await load('supabase/functions/_shared/safeFetch.ts',s);await assert.rejects(()=>api.safeFetch('https://example.com'));assert.equal(s.sockets.length,1);
    s.context.__lookup=async()=>[{address:'93.184.216.34',family:4}];socket(s,[{body:'123456'}]);await assert.rejects(()=>api.safeFetch('https://example.com',{maxBytes:3}));socket(s,[{body:'123456'}]);assert.equal(await (await api.safeFetch('https://example.com',{maxBytes:3,truncate:true})).text(),'123');socket(s,[{stall:true}]);await assert.rejects(()=>api.safeFetch('https://example.com',{timeoutMs:10}));
  });
  await check('metadata import never returns script or credential-bearing image URLs',async()=>{
    const s=state();s.context.__user={id:'fixture-owner'};socket(s,[{body:'<title>Fixture</title><meta property="og:image" content="javascript:alert(1)"><link rel="icon" href="https://user:fixture-password@example.com/icon.png">'}]);const h=await load('supabase/functions/fetch-link-metadata/index.ts',s);const response=await h(invoke({url:'https://example.com'}));assert.equal(response.status,200);const body=await response.json();assert.equal(body.title,'Fixture');assert.equal(body.image,'');assert.equal(body.favicon,'https://example.com/favicon.ico');
  });
  await check('Google photo hosting rejects anonymous/ordinary users before paid API or storage',async()=>{
    const s=state(),h=await load('supabase/functions/lookup-place-id/index.ts',s);assert.equal((await h(request({action:'photo_hosted',photoName:'places/fixture/photos/fixture'}))).status,401);s.context.__user={id:randomUUID()};assert.equal((await h(invoke({action:'photo_hosted',photoName:'places/fixture/photos/fixture'}))).status,403);
  });
  await check('Google team photo imports always use own random path and trusted raster response',async()=>{
    const s=state();s.context.__user={id:randomUUID()};s.db.rows('sales_reps').push({id:s.context.__user.id,is_active:true});let upload;
    s.context.fetch=async(url,init)=>{if(url.startsWith('https://places.googleapis.com/'))return new Response(JSON.stringify({photoUri:'https://lh3.googleusercontent.com/fixture'}));upload={url,init};return new Response('{}');};socket(s,[{headers:{'content-type':'image/png'},body:'fixture-image'}]);const h=await load('supabase/functions/lookup-place-id/index.ts',s);const r=await h(invoke({action:'photo_hosted',photoName:'places/fixture/photos/fixture',subdir:'victim-folder',slug:'overwrite'}));assert.equal(r.status,200);const b=await r.json();assert.match(b.path,new RegExp('^place-imports/'+s.context.__user.id+'/'));assert(!upload.url.includes('victim-folder'));assert.equal(upload.init.headers['x-upsert'],'false');
  });
  await check('lead honeypot never deletes supplied records and simultaneous notifications dedupe',async()=>{
    const s=state(),id=randomUUID();s.db.rows('lead_submissions').push({id,profile_id:'fixture-profile',created_at:new Date().toISOString(),submission_data:{name:'Fixture'}});s.db.rows('personal_profiles').push({id:'fixture-profile',user_id:'fixture-user',username:'fixture'});const h=await load('supabase/functions/notify-new-lead/index.ts',s);assert.equal((await h(request({submissionId:id,website:'bot'}))).status,200);assert.equal(s.db.rows('lead_submissions').length,1);assert.equal(s.calls.emails.length,0);const rs=await Promise.all([h(request({submissionId:id})),h(request({submissionId:id}))]);assert(rs.every(r=>r.status===200));assert.equal(s.calls.emails.length,2);assert.equal(new Set(s.calls.emails.map(e=>e.idempotencyKey)).size,1);assert.equal(s.calls.emails[0].idempotencyKey,'lead-notification/'+id);assert.equal(s.calls.emails[0].html,s.calls.emails[1].html);assert.equal(s.calls.emails[0].templateKey,'lead_notification');
  });
  await check('failed lead notification can retry with the same provider idempotency key',async()=>{
    const s=state(),id=randomUUID();s.db.rows('lead_submissions').push({id,profile_id:'fixture-profile',created_at:new Date().toISOString(),submission_data:{name:'Fixture'}});s.db.rows('personal_profiles').push({id:'fixture-profile',user_id:'fixture-user',username:'fixture'});let sends=0;s.context.__mail=async opts=>{s.calls.emails.push(opts);return {ok:++sends>1};};const h=await load('supabase/functions/notify-new-lead/index.ts',s);assert.equal((await h(request({submissionId:id}))).status,500);assert.equal((await h(request({submissionId:id}))).status,200);assert.equal(s.calls.emails[0].idempotencyKey,s.calls.emails[1].idempotencyKey);assert.equal(s.calls.emails[0].html,s.calls.emails[1].html);
  });
  await check('support recipient quota persists across worker reloads and IP changes',async()=>{
    const s=state(),body={requestType:'OTHER',name:'Fixture',businessName:'Fixture',email:'fixture@example.invalid',description:'Help'};for(let n=0;n<3;n++){const h=await load('supabase/functions/support-notification/index.ts',s);assert.equal((await h(request(body,'192.0.2.'+(n+1)))).status,200);}const h=await load('supabase/functions/support-notification/index.ts',s);assert.equal((await h(request(body,'192.0.2.9'))).status,429);assert.equal(s.calls.emails.length,6);
  });
  await check('public global quota and oversized streamed bodies stop provider calls',async()=>{
    const s=state();const rpc=s.db.rpc.bind(s.db);s.db.rpc=async(name,args)=>name==='storefront_take_quota'?{data:-1}:rpc(name,args);for(const endpoint of ['lookup-place-id','storefront-support','notify-new-lead']){const h=await load('supabase/functions/'+endpoint+'/index.ts',s);const r=await h(request({mode:'ai',visitor:randomUUID(),message:'Cards?',address:'Fixture',submissionId:randomUUID()}));assert.equal(r.status,429,endpoint);}const t=state(),h=await load('supabase/functions/support-notification/index.ts',t);const r=await h(request({description:'x'.repeat(18000)}));assert(r.status>=400);assert.equal(t.calls.emails.length,0);
  });
  await check('Twilio verifies canonical URL, honors valid STOP and retries DB failures',async()=>{
    const s=state();const phone='+15555550123';s.db.rows('restaurant_sms_subscribers').push({phone,sms_opt_in:true});s.db.rows('personal_email_captures').push({phone,sms_opt_in:true});const h=await load('supabase/functions/twilio-webhook/index.ts',s),raw=new URLSearchParams({From:phone,Body:'STOP'}).toString();const canonical=s.env.SUPABASE_URL+'/functions/v1/twilio-webhook';
    const req=(signed,forwarded)=>{const sig=createHmac('sha1',s.env.TWILIO_AUTH_TOKEN).update(signed+'BodySTOPFrom'+phone).digest('base64');return new Request(canonical,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','x-twilio-signature':sig,'x-forwarded-for':'192.0.2.1','x-forwarded-url':forwarded||canonical},body:raw});};
    assert.equal((await h(req('https://attacker.example/callback','https://attacker.example/callback'))).status,200);assert.equal(s.db.rows('restaurant_sms_subscribers')[0].sms_opt_in,true);assert.equal((await h(req(canonical,'https://attacker.example/callback'))).status,200);assert.equal(s.db.rows('restaurant_sms_subscribers')[0].sms_opt_in,false);assert.equal(s.db.rows('personal_email_captures')[0].sms_opt_in,false);s.db.failures.set('restaurant_sms_subscribers:update',1);assert.equal((await h(req(canonical))).status,503);
  });
  await check('admin-looking email alone never authorizes role protected mutations',async()=>{
    for(const endpoint of ['generate-promo-token','delete-user-complete','create-personal-account','create-legacy-client-account','approve-rep-application','resend-rep-invite']){const s=state();s.context.__user={id:randomUUID(),email:'tap@tapaway.co',app_metadata:{role:'admin'}};const h=await load('supabase/functions/'+endpoint+'/index.ts',s);assert.equal((await h(invoke({discount_type:'free'}))).status,403,endpoint);assert.equal(s.passwords.length,0);assert.equal(s.calls.emails.length,0);}
    const s=state();s.context.__user={id:randomUUID()};s.db.rows('user_roles').push({user_id:s.context.__user.id,role:'admin'});const h=await load('supabase/functions/generate-promo-token/index.ts',s);assert.equal((await h(invoke({discount_type:'free'}))).status,200);assert.equal(s.db.rows('promo_tokens').length,1);
  });
  await check('lead submission derives owner, validates fields/entitlement and records independent consent',async()=>{
    const s=state(),id=randomUUID();s.db.rows('lead_forms').push({id,profile_id:'fixture-owner',is_active:true,fields:[{label:'Email',type:'email',required:true},{label:'Phone',type:'phone'},{label:'Service',type:'select',options:['Fixture One','Fixture Two']}]});const rpc=s.db.rpc.bind(s.db);let active=true;s.db.rpc=async(name,args)=>name==='personal_profile_is_active'?{data:active,error:null}:rpc(name,args);const h=await load('supabase/functions/submit-lead/index.ts',s);
    const body={formId:id,profileId:'forged-owner',values:{Email:'fixture@example.invalid',Phone:'+1 555 555 0123',Service:'Fixture One'},smsConsent:{marketing:false,transactional:true,transactionalText:'fixture consent'}};
    assert.equal((await h(request({...body,website:'bot'}))).status,200);assert.equal(s.db.rows('lead_submissions').length,0);
    active=false;assert.equal((await h(request(body))).status,404);active=true;
    assert.equal((await h(request({...body,values:{...body.values,Other:'not a form field'}}))).status,400);
    assert.equal((await h(request({...body,values:{...body.values,Email:'invalid'}}))).status,400);
    assert.equal((await h(request({...body,values:{...body.values,Service:'unlisted'}}))).status,400);
    assert.equal((await h(request(body))).status,200);const row=s.db.rows('lead_submissions')[0];assert.equal(row.profile_id,'fixture-owner');const consent=JSON.parse(row.submission_data._tapaway_sms_consent);assert.equal(consent.marketing,false);assert.equal(consent.transactional,true);assert.equal(s.db.rows('personal_email_captures').length,0);
  });
  await check('lead submit durable form budget works across networks and blocks writes',async()=>{
    const s=state(),id=randomUUID();s.db.rows('lead_forms').push({id,profile_id:'fixture-owner',is_active:true,fields:[{label:'Name',type:'text',required:true}]});let quotas=0;s.db.rpc=async(name,args)=>name==='personal_profile_is_active'?{data:true}: {data:++quotas===3?-1:1};const h=await load('supabase/functions/submit-lead/index.ts',s);assert.equal((await h(request({formId:id,values:{Name:'Fixture'}}))).status,429);assert.equal(s.db.rows('lead_submissions').length,0);
  });
  await check('public intake honeypots and invalid or inactive captures never write',async()=>{
    const s=state();const rpc=s.db.rpc.bind(s.db);let captured=0;s.db.rpc=async(name,args)=>name==='personal_profile_is_active'?{data:false}:name==='record_personal_capture'?(captured++,{data:randomUUID()}):rpc(name,args);const h=await load('supabase/functions/public-intake/index.ts',s);
    assert.equal((await h(request({website:'bot',action:'support'}))).status,200);assert.equal(s.db.tables.size,0);
    assert.equal((await h(request({action:'capture',profileId:randomUUID(),email:'fixture@example.invalid'}))).status,404);
    assert.equal((await h(request({action:'capture',profileId:randomUUID(),phone:'+15555550123',marketingConsent:true}))).status,400);assert.equal(captured,0);
  });
  await check('personal capture uses atomic RPC, normalized contact and separate explicit consent',async()=>{
    const s=state(),rpc=s.db.rpc.bind(s.db);let capture;s.db.rpc=async(name,args)=>name==='personal_profile_is_active'?{data:true}:name==='record_personal_capture'?(capture=args,{data:randomUUID()}):rpc(name,args);const h=await load('supabase/functions/public-intake/index.ts',s);
    assert.equal((await h(request({action:'capture',profileId:randomUUID(),name:'Fixture',phone:'(555) 555-0123',marketingConsent:true,transactionalConsent:false,marketingText:'fixture marketing disclosure',sms_opt_in_at:'2001-01-01',source:'forged'}))).status,200);
    assert.equal(capture.p_phone,'+15555550123');assert.equal(capture.p_marketing_consent,true);assert.equal(capture.p_transactional_consent,false);assert.equal(capture.p_transactional_text,null);assert.equal(capture.source,undefined);assert.equal(capture.sms_opt_in_at,undefined);
  });
  await check('public support and rep submissions cannot forge user, status, review or creation fields',async()=>{
    const s=state(),h=await load('supabase/functions/public-intake/index.ts',s);s.context.__user={id:'fixture-user'};
    assert.equal((await h(invoke({action:'support',name:'Fixture',email:'fixture@example.invalid',description:'Help',requestType:'OTHER',user_id:'victim',status:'CLOSED',created_at:'2001-01-01'}))).status,200);const row=s.db.rows('support_requests')[0];assert.equal(row.user_id,'fixture-user');assert.equal(row.status,'NEW');assert.notEqual(row.created_at,'2001-01-01');
    assert.equal((await h(request({action:'rep_application',name:'Fixture',email:'applicant@example.invalid',status:'approved',reviewed_by:'victim',reviewed_at:'2001-01-01'}))).status,200);const app=s.db.rows('rep_applications')[0];assert.equal(app.status,'pending');assert.equal(app.reviewed_by,null);assert.equal(app.reviewed_at,null);
  });
  await check('standalone SMS signup persists only chosen program with server timestamps',async()=>{
    const s=state(),h=await load('supabase/functions/public-intake/index.ts',s);const body={action:'sms_signup',name:'Fixture',phone:'+15555550123'};assert.equal((await h(request(body))).status,400);assert.equal((await h(request({...body,transactionalConsent:true,transactionalText:'fixture transactional disclosure',source:'forged',consent_at:'2001-01-01'}))).status,200);const row=s.db.rows('sms_signup_submissions')[0];assert.equal(row.marketing_consent_at,null);assert.equal(row.transactional_consent_text,'fixture transactional disclosure');assert.equal(row.source,'/sms-signup');assert.notEqual(row.consent_at,'2001-01-01');
  });
  await check('public intake contact quota persists through reloads and network changes',async()=>{
    const s=state(),rpc=s.db.rpc.bind(s.db);let captures=0;s.db.rpc=async(name,args)=>name==='personal_profile_is_active'?{data:true}:name==='record_personal_capture'?(captures++,{data:randomUUID()}):rpc(name,args);for(let i=0;i<4;i++){const h=await load('supabase/functions/public-intake/index.ts',s);const r=await h(request({action:'capture',profileId:randomUUID(),email:'fixture@example.invalid'},'192.0.2.'+(i+1)));assert.equal(r.status,i<3?200:429);}assert.equal(captures,3);
  });
  await check('customer AI checks canonical account entitlement before consuming provider allowance',async()=>{
    const s=state();s.db.rows('restaurants').push({id:'fixture-restaurant',owner_id:'fixture-owner',subscription_status:'active',payment_state:'complimentary'});const rpc=s.db.rpc.bind(s.db);let active=false;s.db.rpc=async(name,args)=>name==='restaurant_is_active'?{data:active}:rpc(name,args);const api=await load('supabase/functions/_shared/customerAiGuard.ts',s);assert.equal(await api.customerAiAllowed(request({}),'fixture-owner','fixture-restaurant'),false);assert.equal(s.db.quota.size,0);active=true;assert.equal(await api.customerAiAllowed(request({}),'fixture-owner','fixture-restaurant'),true);assert.equal(await api.customerAiAllowed(request({}),'different-owner','fixture-restaurant'),false);
  });
  await check('SMS sends require canonical entitlement and matching program consent; phones deduplicate',async()=>{
    const s=state();Object.assign(s.env,{TWILIO_API_KEY:'fixture-twilio-api',TWILIO_FROM_NUMBER:'+15555550100'});s.context.__user={id:'fixture-owner'};const id=randomUUID();s.db.rows('personal_profiles').push({id,user_id:'fixture-owner',full_name:'Fixture',subscription_status:'active',is_approved:true});s.db.rows('personal_email_captures').push({profile_id:id,phone:'555-555-0123',sms_opt_in:true,sms_marketing_opt_in:true,sms_transactional_opt_in:false},{profile_id:id,phone:'+15555550123',sms_opt_in:true,sms_marketing_opt_in:true,sms_transactional_opt_in:false},{profile_id:id,phone:'+15555550124',sms_opt_in:true,sms_marketing_opt_in:false,sms_transactional_opt_in:true});
    const rpc=s.db.rpc.bind(s.db);let active=false;s.db.rpc=async(name,args)=>name==='has_role'?{data:false}:name==='personal_profile_is_active'?{data:active}:rpc(name,args);const sent=[];s.context.fetch=async(url,opts)=>{assert.equal(url,'https://connector-gateway.lovable.dev/twilio/Messages.json');sent.push(new URLSearchParams(opts.body).get('To'));return new Response('{}');};const h=await load('supabase/functions/send-mass-sms/index.ts',s);
    assert.equal((await h(invoke({profile_id:id,message:'Fixture offer'}))).status,403);assert.equal(sent.length,0);active=true;assert.equal((await h(invoke({profile_id:id,message:'Fixture offer'}))).status,200);assert.deepEqual(sent,['+15555550123']);assert.equal((await h(invoke({profile_id:id,message:'Please leave a review',review_request:true}))).status,200);assert.deepEqual(sent,['+15555550123','+15555550124']);
  });
  for (const failure of ['revoked', 'unavailable']) await check('SMS rechecks consent before each send: '+failure,async()=>{
    const s=state();Object.assign(s.env,{TWILIO_API_KEY:'fixture-twilio-api',TWILIO_FROM_NUMBER:'+15555550100'});s.context.__user={id:'fixture-owner'};const id=randomUUID();s.db.rows('personal_profiles').push({id,user_id:'fixture-owner',full_name:'Fixture'});const contact={profile_id:id,phone:'+15555550123',sms_opt_in:true,sms_marketing_opt_in:true};s.db.rows('personal_email_captures').push(contact);
    const rpc=s.db.rpc.bind(s.db);s.db.rpc=async(name,args)=>name==='has_role'?{data:false}:name==='personal_profile_is_active'?{data:true}:rpc(name,args);const from=s.db.from.bind(s.db);let reads=0;s.db.from=name=>{if(name==='personal_email_captures'&&++reads===2){if(failure==='revoked')contact.sms_opt_in=false;else s.db.failures.set(name+':select',1);}return from(name);};let sent=0;s.context.fetch=async()=>{sent++;return new Response('{}');};const h=await load('supabase/functions/send-mass-sms/index.ts',s);assert.equal((await h(invoke({profile_id:id,message:'Fixture offer'}))).status,200);assert.equal(reads,2);assert.equal(sent,0);
  });
  await check('affiliate review ignores forged email/IP and uses canonical Auth identity',async()=>{
    const s=state(),referralId=randomUUID(),affiliateId=randomUUID();s.context.__user={id:'fixture-referred'};s.db.rows('affiliate_referrals').push({id:referralId,affiliate_id:affiliateId,referred_user_id:s.context.__user.id,created_at:new Date().toISOString(),ip_address:'fixture-unverified-ip'},{id:randomUUID(),affiliate_id:affiliateId,referred_user_id:'another-user',created_at:new Date().toISOString(),ip_address:'fixture-unverified-ip'});s.db.rows('affiliates').push({id:affiliateId,user_id:'fixture-partner'});const h=await load('supabase/functions/check-affiliate-abuse/index.ts',s);assert.equal((await h(invoke({referralId,affiliateId,referredEmail:'forged@mailinator.com',ipAddress:'fixture-unverified-ip'}))).status,200);assert.equal(s.db.rows('affiliate_abuse_flags').length,0);assert.equal((await h(invoke({referralId,affiliateId,extra:'x'.repeat(5000)}))).status,400);
  });
  await check('canonical affiliate flags deduplicate across concurrent and repeated checks',async()=>{
    const s=state(),referralId=randomUUID(),affiliateId=randomUUID();s.context.__user={id:'fixture-referred'};s.db.rows('affiliate_referrals').push({id:referralId,affiliate_id:affiliateId,referred_user_id:s.context.__user.id,created_at:new Date().toISOString()});s.db.rows('affiliates').push({id:affiliateId,user_id:'fixture-partner'});s.db.auth.admin.getUserById=async()=>({data:{user:{id:s.context.__user.id,email:'fixture@mailinator.com'}}});const h=await load('supabase/functions/check-affiliate-abuse/index.ts',s);const rs=await Promise.all([h(invoke({referralId,affiliateId})),h(invoke({referralId,affiliateId}))]);assert(rs.every(r=>r.status===200));assert.equal(s.db.rows('affiliate_abuse_flags').length,1);assert.equal(s.db.rows('affiliate_abuse_flags')[0].flag_type,'suspicious_domain');s.db.quota.clear();assert.equal((await h(invoke({referralId,affiliateId}))).status,200);assert.equal(s.db.rows('affiliate_abuse_flags').length,1);
  });
  console.log(`${checks} isolated nonpayment security checks passed.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
