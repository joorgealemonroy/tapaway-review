// Real isolated PostgreSQL trigger regression. No provider calls or production data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(path.join(process.env.QA_MODULES,'@electric-sql/pglite'));
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function sourceFunction(file,name){const sql=read(file),start=sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);assert.ok(start>=0,name);const rest=sql.slice(start),match=/\bAS\s+(\$\w*\$)/i.exec(rest);assert.ok(match);const end=rest.indexOf(match[1]+';',match.index+match[0].length);assert.ok(end>0);return rest.slice(0,end+match[1].length+1);}
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let checks=0;const pass=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
(async()=>{
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT current_user::text$$;
 CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$SELECT auth.uid()='${uid(99)}'::uuid$$;
 GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;`);
 await db.exec(read('scripts/fixtures/launch-schema.sql'));
 await db.exec(`ALTER TABLE personal_profiles ALTER COLUMN is_founding_user SET DEFAULT false;
 ALTER TABLE personal_profiles ALTER COLUMN is_founding_user SET NOT NULL;
 ALTER TABLE personal_profiles ALTER COLUMN legacy_allowance SET DEFAULT false;
 ALTER TABLE personal_profiles ALTER COLUMN created_at SET DEFAULT now();
 ALTER TABLE personal_profiles ALTER COLUMN is_approved SET DEFAULT false;
 CREATE TABLE payment_first_config(id integer PRIMARY KEY,payment_first_launch_at timestamptz);
 INSERT INTO payment_first_config VALUES(1,now()-interval '1 day');
 CREATE TABLE legacy_allowance_entitlements(relationship_key text PRIMARY KEY,source text,record_count integer);
 GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated,service_role;
 GRANT SELECT ON personal_profiles TO anon;
 ALTER TABLE personal_profiles ENABLE ROW LEVEL SECURITY;
 CREATE POLICY profile_owner ON personal_profiles TO authenticated USING(user_id=auth.uid() OR is_admin()) WITH CHECK(user_id=auth.uid() OR is_admin());`);
 await db.exec(sourceFunction('drizzle/migrations/0018_payment_first_profile_order_model.sql','assign_founding_status'));
 await db.exec('CREATE TRIGGER trg_assign_founding_status BEFORE INSERT ON personal_profiles FOR EACH ROW EXECUTE FUNCTION assign_founding_status()');
 await db.exec(read('drizzle/migrations/0021_legacy_cutoff_auto_grant.sql'));
 await db.exec(read('drizzle/migrations/0022_guard_legacy_fields.sql'));
 await db.exec(read('drizzle/migrations/0023_guard_legacy_fields_invoker.sql'));
 await db.exec(sourceFunction('drizzle/migrations/0025_launch_hardening.sql','guard_profile_approval_fields'));
 await db.exec('CREATE TRIGGER trg_guard_profile_approval_fields BEFORE INSERT OR UPDATE ON personal_profiles FOR EACH ROW EXECUTE FUNCTION guard_profile_approval_fields()');
 await db.exec(sourceFunction('drizzle/migrations/0029_hub_payment_requests.sql','hub_access_allowed'));
 await db.exec('CREATE POLICY public_active ON personal_profiles FOR SELECT TO anon,authenticated USING(hub_access_allowed(subscription_status,is_approved,payment_state,trial_ends_at,created_at,stripe_subscription_id))');
 const asRole=async(role,user,fn)=>{await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user||'']);await db.exec(`SET ROLE ${role}`);try{return await fn();}finally{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub','',false)");}};
 const row=id=>db.query('SELECT * FROM personal_profiles WHERE id=$1',[uid(id)]).then(r=>r.rows[0]);
 const insert=async(n,values={})=>{const obj={id:uid(n),user_id:uid(n),username:`qa${n}`,full_name:`QA ${n}`,email:`qa${n}@example.invalid`,subscription_status:'pending',plan_type:'personal_hosted',...values},keys=Object.keys(obj);await db.query(`INSERT INTO personal_profiles(${keys.join(',')})VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,keys.map(k=>obj[k]));};
 await pass('Actual old trigger order reproduces active founding status for a pending TEST purchase',async()=>{
  await asRole('service_role',null,()=>insert(1,{onboarding_source:'personal_cards_v1_test',stripe_customer_id:'cus_test',stripe_subscription_id:'sub_test'}));
  const r=await row(1);assert.equal(r.subscription_status,'active');assert.equal(r.plan_type,'founding_pro');assert.equal(r.is_founding_user,true);assert.equal(r.is_approved,false);
  assert.equal((await asRole('anon',null,()=>db.query('SELECT id FROM personal_profiles WHERE id=$1',[uid(1)]))).rows.length,0); // Existing approval gate still blocks the underlying table.
 });
 await pass('Actual old browser guard leaves founding authority despite keeping billing pending; legacy guard is already invoker-safe',async()=>{
  await asRole('authenticated',uid(2),()=>insert(2,{legacy_allowance:true,legacy_allowance_key:'forged',legacy_allowance_source:'forged'}));
  const r=await row(2);assert.equal(r.subscription_status,'pending');assert.equal(r.plan_type,'founding_pro');assert.equal(r.is_founding_user,true);assert.equal(r.legacy_allowance,false);assert.equal(r.legacy_allowance_key,null);
  assert.equal((await db.query("SELECT prosecdef FROM pg_proc WHERE proname='guard_legacy_fields'")).rows[0].prosecdef,false);
 });
 await db.exec('DELETE FROM personal_profiles');
 // Existing genuine founding, gift and legacy records must retain every field.
 await insert(10,{is_founding_user:true,founding_number:10,plan_type:'founding_pro',subscription_status:'active',is_approved:true,payment_state:'complimentary',onboarding_source:'payment_first_manual',legacy_allowance:true,legacy_allowance_key:'sub_old',legacy_allowance_source:'manual',created_at:'2020-01-01T00:00:00Z'});
 await insert(11,{plan_type:'solo',subscription_status:'trialing',is_approved:true,payment_state:'unknown_manual',onboarding_source:'payment_first_gift',created_at:'2020-01-01T00:00:00Z'});
 const before=(await db.query('SELECT * FROM personal_profiles ORDER BY id')).rows;
 await pass('Retirement migration repeats safely without changing any existing gift/founding/legacy record',async()=>{
  const journal=JSON.parse(read('drizzle/migrations/meta/_journal.json'));
  const entry=journal.entries.find(value=>value.tag==='0033_retire_automatic_founding_grants');
  assert.ok(entry,'Founding retirement must be registered');assert.equal(entry.idx,33);
  assert.ok(Number.isFinite(entry.when)&&entry.when>journal.entries.find(value=>value.idx===32).when);
  const stamp=new Date(entry.when).toISOString().replace(/[-:T]/g,'').slice(0,14);
  const sql=read(`drizzle/migrations/${entry.tag}.sql`);
  assert.equal(sql,read(`supabase/migrations/${stamp}_retire_automatic_founding_grants.sql`));
  await db.exec(sql);await db.exec(sql);
  assert.deepEqual((await db.query('SELECT * FROM personal_profiles ORDER BY id')).rows,before);
 });
 await pass('Service TEST/draft/unpaid inserts keep their chosen pending state and cannot acquire public access',async()=>{
  for(const [n,source]of[[20,'personal_cards_v1_test'],[21,'payment_first_test'],[22,null]]){
   await asRole('service_role',null,()=>insert(n,{onboarding_source:source,stripe_customer_id:'cus_qa'+n,stripe_subscription_id:'sub_qa'+n}));
   const r=await row(n);assert.equal(r.subscription_status,'pending');assert.equal(r.plan_type,'personal_hosted');assert.equal(r.is_founding_user,false);assert.equal(r.founding_number,null);assert.equal(r.legacy_allowance,false);
   assert.equal((await asRole('anon',null,()=>db.query('SELECT id FROM personal_profiles WHERE id=$1',[uid(n)]))).rows.length,0);
  }
 });
 await pass('Verified service paid subscription, manual gift and real admin decisions retain exact explicit state',async()=>{
  await asRole('service_role',null,()=>insert(23,{subscription_status:'active',is_approved:true,payment_state:'paying',stripe_customer_id:'cus_paid',stripe_subscription_id:'sub_paid',onboarding_source:'personal_cards_v1'}));
  const paid=await row(23);assert.equal(paid.subscription_status,'active');assert.equal(paid.plan_type,'personal_hosted');assert.equal(paid.is_founding_user,false);assert.equal(paid.legacy_allowance,false);
  await asRole('service_role',null,()=>insert(24,{subscription_status:'active',payment_state:'complimentary',is_approved:true,plan_type:'solo'}));
  const gift=await row(24);assert.equal(gift.plan_type,'solo');assert.equal(gift.payment_state,'complimentary');assert.equal(gift.is_founding_user,false);
  await asRole('authenticated',uid(99),()=>insert(25,{subscription_status:'active',is_approved:true,is_founding_user:true,founding_number:100,plan_type:'founding_pro',payment_state:'complimentary'}));
  const admin=await row(25);assert.equal(admin.is_founding_user,true);assert.equal(admin.founding_number,100);assert.equal(admin.plan_type,'founding_pro');
 });
 await pass('Untrusted insert normalizes forged founding/billing/legacy and backdating while preserving a usable owner draft',async()=>{
  await asRole('authenticated',uid(30),()=>insert(30,{plan_type:'founding_pro',is_founding_user:true,founding_number:1,subscription_status:'active',is_approved:true,payment_state:'complimentary',created_at:'2000-01-01T00:00:00Z',stripe_customer_id:'cus_forged',stripe_subscription_id:'sub_forged',onboarding_source:'personal_cards_v1',legacy_allowance:true,legacy_allowance_key:'sub_forged',legacy_allowance_source:'manual'}));
  const r=await row(30);assert.equal(r.plan_type,null);assert.equal(r.is_founding_user,false);assert.equal(r.founding_number,null);assert.equal(r.subscription_status,'pending');assert.equal(r.is_approved,false);assert.equal(r.payment_state,'unknown_manual');assert.equal(r.stripe_subscription_id,null);assert.equal(r.onboarding_source,null);assert.equal(r.legacy_allowance,false);assert.equal(r.legacy_allowance_key,null);assert.ok(Date.now()-Date.parse(r.created_at)<60000);
  assert.equal((await asRole('authenticated',uid(30),()=>db.query('SELECT id FROM personal_profiles WHERE id=$1',[uid(30)]))).rows.length,1);
  assert.equal((await asRole('anon',null,()=>db.query('SELECT id FROM personal_profiles WHERE id=$1',[uid(30)]))).rows.length,0);
 });
 await pass('Owner edits remain usable while founding/plan/created-at escalation is rejected and legacy forgery is clamped',async()=>{
  await asRole('authenticated',uid(30),async()=>{
   for(const changes of["is_founding_user=true","founding_number=1","plan_type='founding_pro'","created_at='2000-01-01'","subscription_status='active'"])
    await assert.rejects(()=>db.exec(`UPDATE personal_profiles SET ${changes} WHERE id='${uid(30)}'`),/managed by TapAway/);
   await db.exec(`UPDATE personal_profiles SET bio='Owner can still edit',show_founding_badge=true,legacy_allowance=true,legacy_allowance_key='forged' WHERE id='${uid(30)}'`);
  });
  const r=await row(30);assert.equal(r.bio,'Owner can still edit');assert.equal(r.legacy_allowance,false);assert.equal(r.legacy_allowance_key,null);
 });
 await pass('Existing founding owners keep their badge preference and all trusted legacy entitlements unchanged',async()=>{
  await asRole('authenticated',uid(10),()=>db.exec(`UPDATE personal_profiles SET bio='Updated existing gift',show_founding_badge=false WHERE id='${uid(10)}'`));
  const r=await row(10);assert.equal(r.is_founding_user,true);assert.equal(r.founding_number,10);assert.equal(r.plan_type,'founding_pro');assert.equal(r.payment_state,'complimentary');assert.equal(r.legacy_allowance,true);assert.equal(r.legacy_allowance_key,'sub_old');
 });
 await db.close();console.log(`${checks} real-trigger founding/authority checks passed. No network mutations.`);
})().catch(e=>{console.error(e);process.exitCode=1});
