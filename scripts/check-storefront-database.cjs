/* Execute the new migration against an isolated in-memory PostgreSQL instance.
 * QA_MODULES must contain @electric-sql/pglite. No production connection is used.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(path.join(process.env.QA_MODULES,'@electric-sql/pglite'));
(async()=>{
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE public.checkout_intents(id uuid PRIMARY KEY);
    CREATE TABLE public.personal_profiles(id uuid PRIMARY KEY, username text, subscription_status text, is_approved boolean);
    CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA storage TO anon,authenticated;
    GRANT ALL ON storage.objects TO anon,authenticated;
    CREATE POLICY old_permissive_storage ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);`);
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261020090000_storefront_orders.sql'),'utf8'));
  const key='a'.repeat(64);
  const concurrent=await Promise.all(Array.from({length:20},()=>db.query('SELECT public.storefront_take_quota($1,5) AS used',[key])));
  assert.deepEqual(concurrent.map(r=>r.rows[0].used).filter(n=>n>0).sort(),[1,2,3,4,5]);
  assert.equal(concurrent.filter(r=>r.rows[0].used===-1).length,15);
  await db.exec("INSERT INTO storage.objects(bucket_id) VALUES ('personal-card-artwork'),('restaurant-logos'); SET ROLE anon;");
  assert.deepEqual((await db.query('SELECT bucket_id FROM storage.objects')).rows,[{bucket_id:'restaurant-logos'}]);
  await assert.rejects(()=>db.query('SELECT * FROM public.personal_card_orders'),/permission denied/);
  await assert.rejects(()=>db.query('SELECT * FROM public.storefront_quotas'),/permission denied/);
  await assert.rejects(()=>db.query('SELECT public.storefront_take_quota($1,100)',[key]),/permission denied/);
  await assert.rejects(()=>db.query("INSERT INTO storage.objects(bucket_id) VALUES ('personal-card-artwork')"),/row-level security/);
  await db.exec('RESET ROLE;');
  const order='11111111-1111-4111-8111-111111111111', profile='22222222-2222-4222-8222-222222222222';
  await db.query("INSERT INTO personal_profiles VALUES ($1,'original','active',true)",[profile]);
  await db.query("INSERT INTO personal_card_orders(id,personal_profile_id,checkout_token_hash,artwork_hash,destinations,status,activated_at,hub_requested,stripe_livemode) VALUES ($1,$2,$3,$3,'[]','paid',now(),true,true)",[order,profile,key]);
  await db.exec('SET ROLE anon;');
  assert.equal((await db.query('SELECT public.personal_card_hub_destination($1) AS slug',[order])).rows[0].slug,'original');
  await db.exec('RESET ROLE;'); await db.query("UPDATE personal_profiles SET username='renamed' WHERE id=$1",[profile]); await db.exec('SET ROLE anon;');
  assert.equal((await db.query('SELECT public.personal_card_hub_destination($1) AS slug',[order])).rows[0].slug,'renamed');
  await db.exec('RESET ROLE;'); await db.query("UPDATE personal_profiles SET subscription_status='canceled' WHERE id=$1",[profile]); await db.exec('SET ROLE anon;');
  assert.equal((await db.query('SELECT public.personal_card_hub_destination($1) AS slug',[order])).rows[0].slug,null);
  await db.exec('RESET ROLE;'); await db.query("UPDATE personal_profiles SET subscription_status='active' WHERE id=$1",[profile]); await db.query('UPDATE personal_card_orders SET stripe_livemode=false WHERE id=$1',[order]); await db.exec('SET ROLE anon;');
  assert.equal((await db.query('SELECT public.personal_card_hub_destination($1) AS slug',[order])).rows[0].slug,null);
  await db.close(); console.log('PASS migration, atomic five-question quota, private-order/artwork access, stable hub links, canceled hosting, and test/live isolation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
