const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(path.join(process.env.QA_MODULES,'@electric-sql/pglite'));
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const owner='875c4312-7f6c-46cb-ba69-86d1becd7d65',a='aff3e306-8ccf-4c55-b33f-88da2d17bba8',b='e0e6ff46-9574-4df8-84bd-94ecedfbd4fd',source='ed9c16da-72a1-4a96-b8e5-ed384c1e78d1';
const migration=read('scripts/ops/2026-11-06-las-islas-modern-hubs.sql');
const support=read('supabase/migrations/20261106231500_legacy_hub_migration_support.sql');
const history=read('supabase/migrations/20261106231600_migrated_hub_historical_reports.sql');
let checks=0;const pass=async(name,fn)=>{await fn();console.log('PASS '+name);checks++;};
(async()=>{
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('qa.user',true),'')::uuid$$;
 CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$SELECT coalesce(current_setting('qa.admin',true),'false')='true'$$;`);
 const common='id uuid primary key, email text, plan_type text, subscription_status text, payment_state text, stripe_customer_id text, stripe_subscription_id text, trial_ends_at timestamptz, is_approved boolean, legacy_allowance boolean, legacy_allowance_key text, legacy_allowance_source text, legacy_allowance_granted_at timestamptz, google_place_id text, created_at timestamptz default now()';
 await db.exec(`CREATE TABLE restaurants(${common},owner_id uuid,restaurant_name text,custom_slug text unique,logo_url text,address text,phone text,instagram_url text,directions_url text,google_review_url text,yelp_review_url text);
 CREATE TABLE personal_profiles(${common},user_id uuid,username text unique,full_name text,profile_photo_url text,header_type text,header_color text,background_color text,pfp_position text,button_theme text,logo_scale text,logo_bg_color text,show_username boolean,contact_enabled boolean,contact_company text,contact_name text,contact_phone text,contact_address text,contact_display_style text,approved_at timestamptz,pipeline_status text,source text,onboarding_source text,formatted_address text,business_phone text);
 CREATE TABLE personal_links(id uuid primary key default gen_random_uuid(),profile_id uuid references personal_profiles(id),link_type text,label text,url text,sort_order integer,cover_image_url text,display_style text,grid_size text);
 CREATE TABLE personal_blocks(id uuid primary key default gen_random_uuid(),profile_id uuid references personal_profiles(id),block_type text,content jsonb,sort_order integer);
 CREATE TABLE analytics_hits(id uuid default gen_random_uuid(),event_id text,hub_id uuid,hub_kind text,event_name text,session_id text,occurred_at timestamptz,created_at timestamptz,traffic_class text,is_validated boolean,props jsonb default '{}',referrer_host text,campaign_channel text,device_category text,path text);
 CREATE TABLE analytics_events(id uuid default gen_random_uuid(),restaurant_id uuid,event_type text,created_at timestamptz,event_data jsonb);
 CREATE TABLE personal_analytics(id uuid default gen_random_uuid(),profile_id uuid,event_type text,created_at timestamptz,visitor_info jsonb);`);
 const consent='id uuid primary key, name text, phone text, created_at timestamptz,sms_opt_in boolean,sms_opt_in_at timestamptz,sms_marketing_opt_in boolean,sms_marketing_opt_in_at timestamptz,sms_transactional_opt_in boolean,sms_transactional_opt_in_at timestamptz';
 await db.exec(`CREATE TABLE restaurant_sms_subscribers(${consent},restaurant_id uuid);CREATE TABLE personal_email_captures(${consent},profile_id uuid);`);
 await db.query("SELECT set_config('qa.user',$1,false)",[owner]);await db.exec("SELECT set_config('qa.admin','true',false)");
 await db.query("INSERT INTO personal_profiles(id,user_id,username,profile_photo_url,header_type,header_color,background_color,pfp_position,button_theme,logo_scale,logo_bg_color) VALUES($1,$2,'islasmarias','https://example.com/correct-logo.png','logo','#ffffff','#fffaf3','center','glass','lg','#ffffff')",[source,owner]);
 await db.query("INSERT INTO personal_links(profile_id,link_type,cover_image_url) VALUES($1,'instagram','https://example.com/food.jpg'),($1,'phone','https://example.com/food2.jpg')",[source]);
 for(const [id,slug] of [[a,'lasislasfontana'],[b,'lasislasmarias']]){
   await db.query("INSERT INTO restaurants(id,owner_id,custom_slug,restaurant_name,logo_url,email,plan_type,subscription_status,payment_state,is_approved,legacy_allowance,legacy_allowance_key,legacy_allowance_source,stripe_customer_id,stripe_subscription_id,phone,instagram_url,directions_url,google_review_url,yelp_review_url) VALUES($1,$2,$3,'Test location','old.png','owner@example.com','monthly','active','unknown_manual',true,true,'sub_existing','original','cus_existing','sub_existing','(909) 555-0100','https://example.com/instagram','https://example.com/map','https://example.com/review','https://example.com/yelp')",[id,owner,slug]);
   await db.query("INSERT INTO analytics_hits(event_id,hub_id,hub_kind,event_name,session_id,occurred_at,created_at,traffic_class,is_validated) VALUES($1,$2,'business','hub_view','session','2026-11-01','2026-11-01','human',true)",[slug,id]);
   await db.query("INSERT INTO analytics_events(restaurant_id,event_type,created_at) VALUES($1,'tap','2026-11-01'),($1,'menu_view','2026-11-01')",[id]);
 }
 await db.query("INSERT INTO restaurant_sms_subscribers(id,restaurant_id,name,phone,created_at,sms_opt_in,sms_opt_in_at,sms_marketing_opt_in,sms_marketing_opt_in_at,sms_transactional_opt_in) VALUES(gen_random_uuid(),$1,'Test visitor','+19095550100','2026-11-01',true,'2026-11-01',true,'2026-11-01',false)",[a]);
 await db.exec(support);await db.exec(history);
 const report=async(kind=null,id=null)=>(await db.query("SELECT historical_analytics_report(30,$1,$2,'','2026-11-05','2026-10-25') AS r",[kind,id])).rows[0].r;
 const before=await report();
 await pass('Migration rolls back all changes if a destination collides',async()=>{
   await db.query("INSERT INTO personal_profiles(id,username) VALUES(gen_random_uuid(),'lasislasmarias-new')");
   await assert.rejects(()=>db.exec(migration),/collision/);await db.exec('ROLLBACK');
   assert.equal((await db.query('SELECT count(*)::int n FROM legacy_hub_migrations')).rows[0].n,0);
   assert.equal((await db.query("SELECT count(*)::int n FROM restaurants WHERE custom_slug LIKE '%-legacy'")).rows[0].n,0);
   await db.exec("DELETE FROM personal_profiles WHERE username='lasislasmarias-new'");
 });
 await db.exec(migration);
 await pass('Both URLs use modern profiles and retain exact owner, billing and allowance keys',async()=>{
   const rows=(await db.query('SELECT p.*,r.custom_slug FROM personal_profiles p JOIN restaurants r ON p.id=r.id')).rows;
   assert.equal(rows.length,2);for(const p of rows){assert.equal(p.user_id,owner);assert.equal(p.full_name,'');assert.equal(p.show_username,false);assert.equal(p.profile_photo_url,'https://example.com/correct-logo.png');assert.equal(p.stripe_subscription_id,'sub_existing');assert.equal(p.legacy_allowance_key,'sub_existing');assert.equal(p.plan_type,'monthly');assert.equal(p.custom_slug,p.username+'-legacy');}
   assert.equal((await db.query('SELECT count(*)::int n FROM personal_links WHERE profile_id=$1',[a])).rows[0].n,6);
   assert.equal((await db.query("SELECT count(*)::int n FROM personal_links WHERE profile_id=$1 AND url LIKE '%.pdf'",[a])).rows[0].n,1);
 });
 await pass('Canonical events retain their IDs and validation; history follows without copying or double counting',async()=>{
   assert.equal((await db.query("SELECT count(*)::int n FROM analytics_hits WHERE hub_kind='solo' AND is_validated")).rows[0].n,2);
   const after=await report();assert.deepEqual(after.totals,before.totals);assert.equal((await report('solo',a)).totals.events,2);assert.equal((await report('business',a)).totals.events,0);
   assert.equal((await db.query('SELECT count(*)::int n FROM analytics_events')).rows[0].n,4);
 });
 await pass('SMS consent and original timestamps are preserved without broadening permission',async()=>{
   const p=(await db.query('SELECT * FROM personal_email_captures')).rows[0],r=(await db.query('SELECT * FROM restaurant_sms_subscribers')).rows[0];
   for(const k of ['id','phone','sms_opt_in','sms_opt_in_at','sms_marketing_opt_in','sms_marketing_opt_in_at','sms_transactional_opt_in'])assert.deepEqual(p[k],r[k]);
 });
 await pass('Stripe updates from either record synchronize without recursion or new entitlements',async()=>{
   await db.query("UPDATE restaurants SET subscription_status='past_due',payment_state='past_due' WHERE id=$1",[a]);assert.equal((await db.query('SELECT subscription_status FROM personal_profiles WHERE id=$1',[a])).rows[0].subscription_status,'past_due');
   await db.query("UPDATE personal_profiles SET subscription_status='active',payment_state='paying' WHERE id=$1",[a]);assert.equal((await db.query('SELECT payment_state FROM restaurants WHERE id=$1',[a])).rows[0].payment_state,'paying');
   assert.equal((await db.query('SELECT legacy_allowance_key FROM restaurants WHERE id=$1',[a])).rows[0].legacy_allowance_key,'sub_existing');
 });
 await pass('Re-running the migration does not duplicate profiles, links, subscribers or events',async()=>{await db.exec(migration);assert.equal((await db.query('SELECT count(*)::int n FROM legacy_hub_migrations')).rows[0].n,2);assert.equal((await db.query('SELECT count(*)::int n FROM personal_email_captures')).rows[0].n,1);assert.deepEqual((await report()).totals,before.totals);});
 await pass('Mapping snapshots stay private and unrelated owners cannot read migrated history',async()=>{
   await db.exec("SELECT set_config('qa.admin','false',false);SET ROLE authenticated");assert.equal((await report('solo',a)).totals.events,2);
   await assert.rejects(()=>db.exec('SELECT * FROM legacy_hub_migrations'),/permission denied/);
   await db.query("SELECT set_config('qa.user',$1,false)",[source]);await assert.rejects(()=>report('solo',a),/denied/);await db.exec('RESET ROLE');
 });
 await db.close();console.log(`PASS ${checks} isolated hub migration checks. No live writes.`);
})().catch(e=>{console.error(e);process.exit(1);});
