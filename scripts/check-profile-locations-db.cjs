// Isolated PostgreSQL behavior checks. No live records, messages, or providers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(path.join(process.env.QA_MODULES, '@electric-sql/pglite'));
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let checks = 0;
const pass = async (name, work) => { await work(); console.log('PASS ' + name); checks++; };
(async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid()='${uid(99)}'::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
    CREATE TABLE public.personal_profiles(id uuid PRIMARY KEY,user_id uuid NOT NULL,active boolean NOT NULL DEFAULT true);
    CREATE FUNCTION public.personal_profile_is_active(_profile_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM personal_profiles WHERE id=_profile_id AND active) $$;
    CREATE TABLE public.personal_email_captures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid NOT NULL REFERENCES personal_profiles(id),name text,phone text,email text,message text,created_at timestamptz DEFAULT now(),
      sms_opt_in boolean DEFAULT false,sms_opt_in_at timestamptz,sms_marketing_opt_in boolean DEFAULT false,sms_marketing_opt_in_at timestamptz,sms_transactional_opt_in boolean DEFAULT false,sms_transactional_opt_in_at timestamptz);
    CREATE TABLE public.sms_campaigns(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid NOT NULL REFERENCES personal_profiles(id),message text,recipient_count integer DEFAULT 0,success_count integer DEFAULT 0,failure_count integer DEFAULT 0,created_at timestamptz DEFAULT now());
    CREATE TABLE public.restaurant_sms_subscribers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),phone text,sms_opt_in boolean DEFAULT false);
    GRANT ALL ON public.personal_profiles,public.personal_email_captures,public.sms_campaigns TO service_role;
  `);
  // Run the actual existing capture BEFORE INSERT functions, not simplified
  // versions, so the new server-owned writes meet the current production guards.
  for(const [file,name] of [
    ['20261028031359_public_access_and_reservations.sql','guard_public_intake_authority'],
    ['20260920130000_intake_velocity_throttles.sql','throttle_public_intake'],
  ]) {
    const source=fs.readFileSync(path.join(__dirname,'../supabase/migrations',file),'utf8');
    const start=source.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
    await db.exec(source.slice(start,source.indexOf('$$;',start)+3));
    await db.exec(`CREATE TRIGGER fixture_${name} BEFORE INSERT ON public.personal_email_captures FOR EACH ROW EXECUTE FUNCTION public.${name}()`);
  }
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261112060000_profile_locations_and_sms.sql'),'utf8'));
  const ownerA=uid(1),ownerB=uid(2),a=uid(10),b=uid(11),off=uid(12),legacy=uid(13),a1=uid(20),a2=uid(21),placeholder=uid(22),b1=uid(23);
  await db.query('INSERT INTO personal_profiles VALUES($1,$2,true),($3,$4,true),($5,$2,false)',[a,ownerA,b,ownerB,off]);
  await db.query('INSERT INTO personal_profiles VALUES($1,$2,true)',[legacy,ownerA]);
  await db.query("INSERT INTO profile_locations(id,profile_id,slug,name,is_placeholder) VALUES($1,$2,'store-one','Store One',false),($3,$2,'store-two','Store Two',false),($4,$2,'placeholder','Location coming soon',true),($5,$6,'other','Other store',false)",[a1,a,a2,placeholder,b1,b]);
  for(const [id,name] of [[a,'AV Meal Prep'],[b,'Other Merchant'],[off,'Inactive']]) await db.query("INSERT INTO profile_sms_programs(profile_id,brand_name,frequency_text,terms_url,privacy_url) VALUES($1,$2,'Message frequency varies.','https://example.invalid/terms','https://example.invalid/privacy')",[id,name]);
  const asRole=async(role,user,work)=>{await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user||'']);await db.exec(`SET ROLE ${role}`);try{return await work();}finally{await db.exec('RESET ROLE');}};
  const enroll=(profile=a,location=a1,phone='+16615550123',restock=true,ordering=false,version=1)=>asRole('service_role',null,()=>db.query('SELECT record_profile_location_sms_opt_in($1,$2,$3,$4,$5,$6,$7,$8) id',[profile,location,phone,'Fixture customer',restock,ordering,version,'Fixture agent']).then(r=>r.rows[0].id));
  const audience=(profile=a,topic='restock',location=null)=>db.query('SELECT * FROM get_profile_location_sms_recipients($1,$2,$3)',[profile,topic,location]).then(r=>r.rows);
  await pass('Location RLS isolates owners and keeps public data behind the active-hub projection',async()=>{
    await asRole('authenticated',ownerA,async()=>{
      assert.equal((await db.query('SELECT * FROM profile_locations')).rows.length,3);
      assert.equal((await db.query("UPDATE profile_locations SET name='Forged' WHERE id=$1 RETURNING id",[b1])).rows.length,0);
      await assert.rejects(()=>db.query("INSERT INTO profile_locations(profile_id,slug,name) VALUES($1,'forged','Forged')",[b]),/row-level security/);
      await db.query("UPDATE profile_locations SET subtitle='By the front door' WHERE id=$1",[a1]);
      await assert.rejects(()=>db.query('DELETE FROM profile_locations WHERE id=$1',[a1]),/permission denied/);
    });
    await asRole('anon',null,async()=>{
      await assert.rejects(()=>db.query('SELECT * FROM profile_locations'),/permission denied/);
      const rows=(await db.query('SELECT get_public_profile_locations($1) data',[a])).rows[0].data;
      assert.equal(rows.length,3);assert.ok(!('profile_id' in rows[0]));
      assert.deepEqual((await db.query('SELECT get_public_profile_locations($1) data',[off])).rows[0].data,[]);
      const program=(await db.query('SELECT get_public_profile_sms_program($1) data',[a])).rows[0].data;
      assert.equal(program.sender_ready,false);assert.equal(program.signup_ready,true);
      assert.match(program.restock_consent_text,/from AV Meal Prep/);assert.ok(!('sender_number' in program));
      assert.equal((await db.query('SELECT get_public_profile_sms_program($1) data',[off])).rows[0].data,null);
    });
  });
  await pass('Only bounded server intake can record permission; foreign, placeholder, inactive, stale and invalid signups fail',async()=>{
    for(const role of ['anon','authenticated']) await asRole(role,ownerA,async()=>{
      await assert.rejects(()=>db.query("SELECT record_profile_location_sms_opt_in($1,$2,'+16615550123',NULL,true,false,1,NULL)",[a,a1]),/permission denied/);
      await assert.rejects(()=>db.query('SELECT * FROM profile_sms_programs'),/permission denied/);
      await assert.rejects(()=>db.query("UPDATE profile_sms_programs SET sender_status='ready' WHERE profile_id=$1",[a]),/permission denied/);
      await assert.rejects(()=>db.query("SELECT revoke_legacy_shared_sms('+16615550123')"),/permission denied/);
    });
    await assert.rejects(()=>enroll(a,b1),/location is unavailable/);
    await assert.rejects(()=>enroll(a,placeholder),/Choose an available location/);
    await assert.rejects(()=>enroll(off,null,'+16615550123',false,true),/hub is unavailable/);
    await assert.rejects(()=>enroll(a,a1,'+16615550123',true,false,99),/refresh/);
    await assert.rejects(()=>enroll(a,a1,'not-a-phone'),/phone number/);
    await assert.rejects(()=>enroll(a,a1,'+16615550123',false,false),/preferences/);
    assert.equal((await db.query('SELECT * FROM personal_email_captures')).rows.length,0);
  });
  let contact;
  await pass('Repeated scans preserve one contact while separate topics and locations stay independent',async()=>{
    contact=await enroll();assert.equal(await enroll(),contact);
    assert.equal((await db.query('SELECT * FROM personal_email_captures')).rows.length,1);
    assert.equal((await audience()).length,1);assert.equal((await audience(a,'ordering')).length,0);
    await enroll(a,a2);assert.equal((await audience()).length,1,'All-location audience deduplicates the same phone');
    await enroll(a,null,'+16615550124',false,true);
    assert.equal((await audience(a,'ordering')).length,1);assert.equal((await audience(a,'restock',a1)).length,1);
    await assert.rejects(()=>audience(a,'ordering',a1),/valid text audience/);
    await assert.rejects(()=>audience(a,'restock',b1),/location is unavailable/);
    const evidence=(await db.query('SELECT consent_text,topic FROM profile_sms_consent_events WHERE contact_id=$1',[contact])).rows;
    assert.ok(evidence.every(e=>e.topic==='restock'&&e.consent_text.includes('AV Meal Prep')));
    await asRole('authenticated',ownerA,async()=>{
      const data=(await db.query('SELECT get_profile_sms_dashboard($1) data',[a])).rows[0].data;
      assert.deepEqual(data.audience,{total:2,restock:1,ordering:1});
      assert.equal(data.locations.find(l=>l.id===a1).subscriber_count,1);
      await assert.rejects(()=>db.query('SELECT get_profile_sms_dashboard($1)',[b]),/Forbidden/);
    });
  });
  await pass('Ready sending requires verified merchant identity and opt-out plumbing; recipient checks bind the exact sender',async()=>{
    await assert.rejects(()=>db.query("UPDATE profile_sms_programs SET sender_status='ready' WHERE profile_id=$1",[a]),/check constraint/);
    await db.query("UPDATE profile_sms_programs SET sender_number='+16615550999',registration_reference='fixture-campaign',sender_verified_at=now(),opt_out_webhook_verified_at=now(),sender_status='ready' WHERE profile_id=$1",[a]);
    const can=(sender)=>db.query("SELECT profile_location_sms_recipient_allowed($1,'+16615550123','restock',$2,$3) allowed",[a,a1,sender]).then(r=>r.rows[0].allowed);
    assert.equal(await can('+16615550999'),true);assert.equal(await can('+16615550888'),false);
  });
  await pass('Shared-sender STOP revokes legacy personal and restaurant permission while preserving managed merchants',async()=>{
    await db.query("INSERT INTO personal_email_captures(profile_id,phone,sms_opt_in,sms_marketing_opt_in) VALUES($1,'+16615550123',true,true)",[legacy]);
    await db.query("INSERT INTO restaurant_sms_subscribers(phone,sms_opt_in) VALUES('+16615550123',true),('+16615550125',true)");
    const result=await asRole('service_role',null,()=>db.query("SELECT revoke_legacy_shared_sms('+16615550123') data"));
    assert.deepEqual(result.rows[0].data,{personal_count:1,restaurant_count:1});
    assert.equal((await db.query('SELECT sms_opt_in FROM personal_email_captures WHERE profile_id=$1',[legacy])).rows[0].sms_opt_in,false);
    const restaurant=(await db.query('SELECT phone,sms_opt_in FROM restaurant_sms_subscribers ORDER BY phone')).rows;
    assert.deepEqual(restaurant,[{phone:'+16615550123',sms_opt_in:false},{phone:'+16615550125',sms_opt_in:true}]);
    assert.equal((await db.query('SELECT sms_opt_in FROM personal_email_captures WHERE id=(SELECT capture_id FROM profile_sms_contacts WHERE id=$1)',[contact])).rows[0].sms_opt_in,true);
    assert.equal((await audience()).length,1,'STOP to the shared number must not revoke a separately registered brand');
  });
  await pass('A merchant STOP revokes all its topics durably without affecting another merchant',async()=>{
    await enroll(b,b1);await db.query("UPDATE profile_sms_programs SET sender_number='+16615550888' WHERE profile_id=$1",[b]);
    assert.equal((await db.query("SELECT revoke_profile_location_sms('+16615550999','+16615550123') revoked")).rows[0].revoked,true);
    assert.equal((await audience()).length,0);assert.equal((await audience(b)).length,1);
    await db.query('UPDATE personal_email_captures SET sms_opt_in=true,sms_marketing_opt_in=true WHERE id=(SELECT capture_id FROM profile_sms_contacts WHERE id=$1)',[contact]);
    assert.equal((await audience()).length,0,'Generic flag edits cannot override recorded STOP');
    await enroll(a,null,'+16615550123',false,true);
    assert.equal((await audience()).length,0,'Fresh ordering consent does not silently re-enroll restocks');
    assert.equal((await audience(a,'ordering')).length,2);
    assert.equal((await db.query("SELECT count(*)::int n FROM profile_sms_consent_events WHERE contact_id=$1 AND action='opt_out'",[contact])).rows[0].n,1);
  });
  await pass('Archival removes location audiences and copy edits require a fresh consent version',async()=>{
    await enroll();await asRole('authenticated',ownerA,()=>db.query('UPDATE profile_locations SET is_active=false WHERE id=$1',[a1]));
    await assert.rejects(()=>audience(a,'restock',a1),/location is unavailable/);
    await asRole('authenticated',ownerA,()=>db.query("SELECT update_profile_sms_program($1,'AV Meal Prep','Message frequency varies.','https://example.invalid/terms','https://example.invalid/privacy')",[a]));
    assert.equal((await db.query('SELECT consent_version FROM profile_sms_programs WHERE profile_id=$1',[a])).rows[0].consent_version,1,'Unchanged save does not invalidate consent');
    await asRole('authenticated',ownerA,()=>db.query("SELECT update_profile_sms_program($1,'Updated AV Brand','Message frequency varies.','https://example.invalid/terms','https://example.invalid/privacy')",[a]));
    const program=(await db.query('SELECT consent_version,sender_status FROM profile_sms_programs WHERE profile_id=$1',[a])).rows[0];
    assert.deepEqual(program,{consent_version:2,sender_status:'pending'});assert.equal((await audience(a,'ordering')).length,0);
  });
  await db.close();console.log(`${checks} profile-location database checks passed. No external traffic.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
