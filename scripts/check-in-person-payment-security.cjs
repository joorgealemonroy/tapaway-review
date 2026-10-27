/* Isolated owner identity, payment binding and welcome retry checks. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { build } = require('esbuild');
const { environment } = require('./check-personal-commerce.cjs');
let count = 0;
async function pass(name, run) { await run(); count++; console.log('PASS ' + name); }
async function fixture() {
  const state = environment();
  Object.assign(state.env, { RESEND_API_KEY:'re_fixture',SUPABASE_URL:'https://database.invalid' });
  const profile = { id:'hub_fixture',user_id:'owner_fixture',username:'fixture',full_name:'Fixture <script>owner</script>',subscription_status:'pending',stripe_subscription_id:null };
  state.db.rows('personal_profiles').push(profile);
  const metadata={type:'in_person_close',hub_type:'personal_profile',hub_id:profile.id};
  const session={id:'cs_live_fixture',livemode:true,status:'complete',payment_status:'paid',mode:'subscription',customer:'cus_fixture',subscription:'sub_fixture',metadata,customer_details:{email:'payer@example.invalid'}};
  const subscription={id:'sub_fixture',livemode:true,customer:'cus_fixture',status:'active',metadata,items:{data:[{price:{id:'price_fixture',recurring:{interval:'month'}}}]}};
  state.sessions.set(session.id,session);state.subscriptions.set(subscription.id,subscription);
  state.db.auth.admin.getUserById=async id=>({data:{user:{id,email:'owner@example.invalid'}},error:null});
  state.context.fetch=async(url,init)=>{
    assert.equal(url,'https://api.resend.com/emails','No external traffic permitted');
    state.calls.emails.push(JSON.parse(init.body));
    if(state.failEmail){state.failEmail=false;return new Response('Fixture unavailable',{status:503});}
    return new Response(JSON.stringify({id:'email_fixture'}),{status:200});
  };
  const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/stripe-webhook/index.ts'),'utf8');
  const output=await build({stdin:{contents:source+'\nexport { handleInPersonClose, sendDashboardAccessEmail };',resolveDir:path.join(__dirname,'../supabase/functions/stripe-webhook'),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'isolated-provider',setup(b){
    b.onResolve({filter:/^https:\/\/esm.sh\/@supabase\/supabase-js/},()=>({path:'db',namespace:'fixture'}));
    b.onResolve({filter:/^https:\/\/esm.sh\/stripe@/},()=>({path:'stripe',namespace:'fixture'}));
    b.onResolve({filter:/^https:\/\/deno.land\/.*\/http\/server.ts$/},()=>({path:'serve',namespace:'fixture'}));
    b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({loader:'js',contents:path==='db'?'export const createClient=()=>globalThis.__db':path==='stripe'?'export default class Stripe { constructor(){return globalThis.__stripe} }':'export const serve=()=>{}'}));
  }}]});
  state.context.module={exports:{}};state.context.exports=state.context.module.exports;
  new vm.Script(output.outputFiles[0].text).runInContext(state.context);
  return {...state,profile,session,subscription,api:state.context.module.exports};
}
(async()=>{
  await pass('In-person access goes only to the bound Auth owner and escapes business content',async()=>{
    const f=await fixture();await f.api.handleInPersonClose(f.stripe,f.session);
    assert.deepEqual(f.calls.emails[0].to,['owner@example.invalid']);assert.doesNotMatch(f.calls.emails[0].html,/<script>/);
    assert.match(f.calls.emails[0].html,/&lt;script&gt;/);assert.equal(f.db.rows('magic_link_tokens')[0].user_id,'owner_fixture');
    assert.equal(f.db.rows('magic_link_tokens')[0].email,'owner@example.invalid');assert.equal(f.profile.user_id,'owner_fixture');
    assert.equal(f.db.rows('email_sends')[0].template_key,'in_person_dashboard_access');
  });
  await pass('Owner lookup failures cannot redirect account access to the Stripe payer',async()=>{
    const f=await fixture();f.db.auth.admin.getUserById=async()=>({error:new Error('Fixture Auth failure')});
    await assert.rejects(f.api.handleInPersonClose(f.stripe,f.session));assert.equal(f.calls.emails.length,0);
    assert.equal(f.db.rows('magic_link_tokens').length,0);
  });
  await pass('An unowned hub resolves an existing inbox exactly and never creates a duplicate identity',async()=>{
    const f=await fixture();f.profile.user_id=null;f.db.users.set('payer@example.invalid',{id:'payer_owner',email:'payer@example.invalid'});
    f.db.auth.admin.getUserById=async id=>({data:{user:{id,email:'payer@example.invalid'}},error:null});
    await f.api.handleInPersonClose(f.stripe,f.session);assert.equal(f.profile.user_id,'payer_owner');assert.equal(f.db.users.size,1);
    assert.equal(f.db.rows('magic_link_tokens')[0].user_id,'payer_owner');assert.deepEqual(f.calls.emails[0].to,['payer@example.invalid']);
  });
  await pass('Token persistence failures stop mail instead of sending a broken access link',async()=>{
    for(const operation of ['delete','insert']) { const f=await fixture();f.db.failures.set('magic_link_tokens:'+operation,1);
      await assert.rejects(f.api.handleInPersonClose(f.stripe,f.session));assert.equal(f.calls.emails.length,0); }
  });
  await pass('Provider failure remains retryable after the paid hub update already succeeded',async()=>{
    const f=await fixture();f.failEmail=true;
    // fetch closes over the fixture state before its public wrapper is returned.
    const send=f.context.fetch;let fail=true;f.context.fetch=async(...args)=>fail?(fail=false,new Response('Fixture temporary',{status:503})):send(...args);
    await assert.rejects(f.api.handleInPersonClose(f.stripe,f.session),/email unavailable/);
    assert.equal(f.profile.subscription_status,'active');await f.api.handleInPersonClose(f.stripe,f.session);
    assert.equal(f.calls.emails.length,1);assert.equal(f.db.rows('magic_link_tokens').length,1);
  });
  await pass('Wrong subscription environment, customer and hub binding cannot activate',async()=>{
    for(const mutate of [f=>f.subscription.livemode=false,f=>f.subscription.customer='cus_other',f=>f.subscription.metadata={type:'in_person_close',hub_id:'other'}]) {
      const f=await fixture();mutate(f);await assert.rejects(f.api.handleInPersonClose(f.stripe,f.session));
      assert.equal(f.profile.subscription_status,'pending');assert.equal(f.calls.emails.length,0);
    }
  });
  await pass('A guarded reversal state never emits an account-is-active email',async()=>{
    const f=await fixture(),from=f.db.from.bind(f.db);
    f.db.from=table=>{const q=from(table),then=q.then.bind(q);q.then=(resolve,reject)=>then(result=>{
      if(table==='personal_profiles'&&q.action==='update'){f.profile.subscription_status='past_due';f.profile.is_approved=false;}
      return resolve(result);
    },reject);return q;};
    await f.api.handleInPersonClose(f.stripe,f.session);assert.equal(f.calls.emails.length,0);assert.equal(f.db.rows('magic_link_tokens').length,0);
  });
  console.log(`${count} in-person payment security checks passed. No external traffic.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
