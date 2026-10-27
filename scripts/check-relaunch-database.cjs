// Real isolated PostgreSQL policy, trigger, and reservation checks. No network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(path.join(process.env.QA_MODULES, '@electric-sql/pglite'));
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let checks = 0;
const pass = async (name, run) => { await run(); console.log(`PASS ${name}`); checks++; };
const sourceFunction = (file, name) => {
  const sql = read(file); const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  assert.ok(start >= 0, `Missing real function ${name}`);
  const end = sql.indexOf('$$;', start); assert.ok(end > start);
  return sql.slice(start, end + 3);
};
(async () => {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT current_user::text$$;
    CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql AS $$SELECT coalesce(current_setting('qa.admin',true),'')='yes'$$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;`);
  await db.exec(read('scripts/fixtures/launch-schema.sql'));
  await db.exec(`CREATE TABLE creator_products(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),creator_id uuid NOT NULL REFERENCES personal_profiles(id),title text NOT NULL,
    description text,price_cents integer NOT NULL,product_type text NOT NULL DEFAULT 'pdf',file_url text,cover_image_url text,is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),image_urls text[],long_description text,duration_minutes integer NOT NULL DEFAULT 30,booking_url text);
    CREATE TABLE creator_availability(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),creator_id uuid NOT NULL,day_of_week int NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      start_time time NOT NULL,end_time time NOT NULL,timezone text NOT NULL DEFAULT 'UTC',created_at timestamptz DEFAULT now(),UNIQUE(creator_id,day_of_week));
    CREATE TABLE bookings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),product_id uuid NOT NULL REFERENCES creator_products(id),creator_id uuid NOT NULL REFERENCES personal_profiles(id),
      buyer_email text,booking_date date NOT NULL,start_time time NOT NULL,timezone text NOT NULL DEFAULT 'UTC',status text NOT NULL DEFAULT 'pending',stripe_session_id text,
      created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
    CREATE TABLE creator_purchases(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),product_id uuid NOT NULL REFERENCES creator_products(id),buyer_email text NOT NULL,
      stripe_session_id text NOT NULL,access_token text NOT NULL,access_expires_at timestamptz NOT NULL,created_at timestamptz DEFAULT now());
    CREATE TABLE menu_sections(id uuid PRIMARY KEY,restaurant_id uuid,name text,sort_order integer);
    CREATE TABLE menu_items(id uuid PRIMARY KEY,section_id uuid,name text,sort_order integer);
    CREATE TABLE personal_card_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,profile_id uuid,quantity int,status text DEFAULT 'pending',stripe_session_id text,is_addon boolean DEFAULT false,created_at timestamptz DEFAULT now(),shipping_name text,shipping_address_line1 text,shipping_address_line2 text,shipping_city text,shipping_state text,shipping_postal_code text,shipping_country text DEFAULT 'US');
    CREATE TABLE affiliates(id uuid PRIMARY KEY,user_id uuid NOT NULL,referral_code text NOT NULL,is_active boolean NOT NULL DEFAULT true);
    CREATE TABLE affiliate_referrals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),affiliate_id uuid NOT NULL,referred_user_id uuid NOT NULL UNIQUE,
      referred_profile_id uuid,created_at timestamptz NOT NULL DEFAULT now(),ip_address text);
    CREATE TABLE affiliate_commissions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),affiliate_id uuid,referral_id uuid,amount numeric,status text);
    ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY affiliate_own ON affiliates FOR SELECT TO authenticated USING(user_id=auth.uid());
    CREATE POLICY affiliate_insert ON affiliate_referrals FOR INSERT TO authenticated WITH CHECK(referred_user_id=auth.uid());
    CREATE POLICY affiliate_read ON affiliate_referrals FOR SELECT TO authenticated USING(affiliate_id IN(SELECT id FROM affiliates WHERE user_id=auth.uid()));
    CREATE POLICY commission_admin ON affiliate_commissions FOR ALL TO authenticated USING(is_admin());
    CREATE TABLE nfc_cards(id uuid PRIMARY KEY,public_code text,claim_code_hash text,status text,owner_user_id uuid,destination_type text,destination_value text,
      claimed_at timestamptz,created_at timestamptz,batch_id text,card_type text,paid_order_ref text);
    CREATE TABLE magic_link_tokens(id uuid PRIMARY KEY,token_hash text);
    CREATE TABLE rep_setup_tokens(id uuid PRIMARY KEY,token text);
    CREATE TABLE sales_reps(id uuid PRIMARY KEY,email text,name text,phone text,payout_method text,is_active boolean,created_at timestamptz,updated_at timestamptz,
      agreement_accepted boolean,agreement_accepted_at timestamptz,agreement_version text,signature_name text,signature_at timestamptz,quality_gate_exempt boolean);
    CREATE FUNCTION is_sales_rep() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM sales_reps WHERE id=auth.uid() AND is_active=true)$$;
    CREATE TABLE rep_demo_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),rep_user_id uuid NOT NULL,full_name text NOT NULL,address_line1 text NOT NULL,address_line2 text,
      city text NOT NULL,state text NOT NULL,zip text NOT NULL,requested_at timestamptz DEFAULT now(),fulfilled boolean DEFAULT false,tracking_number text,shipped_at timestamptz);
    CREATE TABLE promo_tokens(id uuid PRIMARY KEY,token uuid,discount_type text,expires_at timestamptz,is_used boolean DEFAULT false,used_by_user_id uuid,reserved_by uuid,reserved_at timestamptz);
    CREATE TABLE personal_analytics(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid,event_type text,visitor_info jsonb,created_at timestamptz DEFAULT now());
    CREATE TABLE analytics_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),restaurant_id uuid,event_type text,event_data jsonb,created_at timestamptz DEFAULT now());
    CREATE TABLE support_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,email text,request_type text,status text DEFAULT 'NEW',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
    CREATE TABLE rep_applications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,email text,status text DEFAULT 'pending',reviewed_at timestamptz,reviewed_by uuid,created_at timestamptz DEFAULT now());
    CREATE TABLE sms_signup_submissions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,phone text NOT NULL,consent_text text NOT NULL,consent_at timestamptz NOT NULL DEFAULT now(),user_agent text,source text NOT NULL DEFAULT '/sms-signup',created_at timestamptz NOT NULL DEFAULT now(),marketing_consent_text text,marketing_consent_at timestamptz,transactional_consent_text text,transactional_consent_at timestamptz);
    CREATE TABLE personal_email_captures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid,email text,name text,phone text,message text,created_at timestamptz DEFAULT now(),sms_opt_in boolean DEFAULT false,sms_opt_in_at timestamptz,
      sms_marketing_opt_in boolean DEFAULT false,sms_marketing_opt_in_at timestamptz,sms_transactional_opt_in boolean DEFAULT false,sms_transactional_opt_in_at timestamptz);
    ALTER TABLE personal_email_captures ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Anyone can submit email captures" ON personal_email_captures FOR INSERT TO anon,authenticated WITH CHECK(profile_id IS NOT NULL);
    CREATE TABLE lead_forms(id uuid PRIMARY KEY,profile_id uuid,is_active boolean);
    CREATE TABLE lead_submissions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid,form_id uuid);
    ALTER TABLE lead_forms ENABLE ROW LEVEL SECURITY; ALTER TABLE lead_submissions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY \"Public can view active lead forms\" ON lead_forms FOR SELECT TO anon,authenticated USING(is_active=true);
    CREATE POLICY \"Anyone can submit leads\" ON lead_submissions FOR INSERT TO anon,authenticated WITH CHECK(form_id IS NOT NULL AND profile_id IS NOT NULL);
    CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    INSERT INTO storage.buckets(id,public) VALUES('personal-photos',true),('personal-link-images',true),('card-print-files',false),('creator-files',false);
    ALTER TABLE personal_profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
    ALTER TABLE personal_card_requests ENABLE ROW LEVEL SECURITY;
    ALTER TABLE nfc_cards ENABLE ROW LEVEL SECURITY;
    ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE creator_purchases ENABLE ROW LEVEL SECURITY;
    ALTER TABLE sales_reps ENABLE ROW LEVEL SECURITY;
    ALTER TABLE rep_demo_requests ENABLE ROW LEVEL SECURITY;
    ALTER TABLE magic_link_tokens ENABLE ROW LEVEL SECURITY;
    ALTER TABLE rep_setup_tokens ENABLE ROW LEVEL SECURITY;
    CREATE POLICY owner_profile ON personal_profiles TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
    CREATE POLICY owner_restaurant ON restaurants TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
    CREATE POLICY "Users can insert own card requests" ON personal_card_requests FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
    CREATE POLICY card_owner ON nfc_cards TO authenticated USING(owner_user_id=auth.uid()) WITH CHECK(owner_user_id=auth.uid());
    CREATE POLICY "Anyone can create bookings" ON bookings FOR INSERT TO anon,authenticated WITH CHECK(product_id IS NOT NULL AND creator_id IS NOT NULL);
    CREATE POLICY booking_owner ON bookings TO authenticated USING(creator_id IN(SELECT id FROM personal_profiles WHERE user_id=auth.uid()));
    CREATE POLICY rep_owner ON sales_reps TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
    CREATE POLICY "Reps can insert own demo request" ON rep_demo_requests FOR INSERT TO authenticated WITH CHECK(rep_user_id=auth.uid());
    CREATE POLICY rep_reads_demo ON rep_demo_requests FOR SELECT TO authenticated USING(rep_user_id=auth.uid());
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;
    CREATE VIEW personal_profiles_public WITH(security_invoker=false) AS
      SELECT id,username,full_name,bio,headline,profile_photo_url,header_type,header_color,header_image_url,background_color,pfp_position,plan_type,subscription_status FROM personal_profiles WHERE subscription_status='active';
    CREATE VIEW bookings_public WITH(security_invoker=true) AS SELECT product_id,booking_date,start_time,status,timezone,created_at FROM bookings;
    GRANT ALL ON personal_profiles_public,bookings_public TO anon,authenticated,service_role;`);
  for(const fn of ['hub_access_allowed','creator_booking_is_public']) await db.exec(sourceFunction('supabase/migrations/20261021190000_hub_payment_requests.sql',fn));
  await db.exec(sourceFunction('supabase/migrations/20261021120000_launch_hardening.sql','personal_profile_is_active'));
  await db.exec(sourceFunction('supabase/migrations/20260219115131_d297da57-6742-45e0-b35d-6e0c3cc2e929.sql','prevent_card_reclaim'));
  await db.exec('CREATE TRIGGER prevent_card_reclaim_trigger BEFORE UPDATE ON nfc_cards FOR EACH ROW EXECUTE FUNCTION prevent_card_reclaim()');
  const owner=uid(1), creator=uid(2), draft=uid(3), gated=uid(4), gift=uid(5), product=uid(10), otherProduct=uid(11), request=uid(20), card=uid(30), regular=uid(40), activeRep=uid(41), disabledRep=uid(42), restaurant=uid(50);
  for(const [id,name,approved,payment,status,created] of [[creator,'live',true,'paying','active','2026-08-01'],[draft,'draft',false,'paying','active','2026-10-27'],[gated,'paused',true,'payment_required','active','2026-08-01'],[gift,'gift',true,'unknown_manual','trialing','2026-08-01']])
    await db.query("INSERT INTO personal_profiles(id,user_id,username,full_name,is_approved,payment_state,subscription_status,created_at,profile_photo_url) VALUES($1,$2,$3,$3,$4,$5,$6,$7,'image.png')",[id,owner,name,approved,payment,status,created]);
  await db.query("INSERT INTO creator_products(id,creator_id,title,price_cents,product_type,duration_minutes) VALUES($1,$2,'Consultation',2500,'booking',30),($3,$2,'Long consultation',4500,'booking',60),($4,$5,'Paused product',2500,'booking',30)",[product,creator,otherProduct,uid(12),gated]);
  await db.query("INSERT INTO creator_availability(creator_id,day_of_week,start_time,end_time,timezone) SELECT $1,day,'09:00','18:00','UTC' FROM generate_series(0,6) day",[creator]);
  await db.query("INSERT INTO nfc_cards(id,status,owner_user_id,destination_type,destination_value,card_type) VALUES($1,'claimed',$2,'profile','live','standard')",[card,owner]);
  await db.query("INSERT INTO sales_reps(id,is_active,quality_gate_exempt) VALUES($1,true,false),($2,false,false)",[activeRep,disabledRep]);
  await db.query("INSERT INTO restaurants(id,owner_id,is_approved,payment_state,subscription_status,created_at) VALUES($1,$2,true,'payment_required','active','2026-08-01')",[restaurant,owner]);
  await db.query("INSERT INTO menu_sections VALUES($1,$2,'Lunch',0)",[uid(51),restaurant]);
  const asRole=async(role,user,fn)=>{await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user??'']);await db.exec(`SET ROLE ${role}`);try{return await fn();}finally{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub','',false)");}};
  const day=(await db.query("SELECT (current_date+3)::text AS booking_day")).rows[0].booking_day;
  const reserve=(key=request,time='10:00',prod=product,email='buyer@example.invalid',tz='UTC',date=day)=>db.query('SELECT reserve_creator_booking($1,$2,$3,$4,$5,$6) result',[prod,email,date,time,tz,key]).then(r=>r.rows[0].result);
  const demo=(rep,extra='')=>db.query(`INSERT INTO rep_demo_requests(rep_user_id,full_name,address_line1,city,state,zip${extra?',fulfilled,tracking_number':''}) VALUES($1,'Fixture Rep','Example Street','Example City','CA','00000'${extra?",true,'FAKE'":''})`,[rep]);
  await pass('Baseline reproduces unapproved projection, forged paid booking, card reclaim and rep escalation',async()=>{
    await asRole('anon',null,async()=>{
      assert.equal((await db.query('SELECT * FROM personal_profiles_public')).rows.length,3);
      await db.query("INSERT INTO bookings(product_id,creator_id,booking_date,start_time,status) VALUES($1,$2,$3,'09:00','paid')",[product,creator,day]);
    });
    await asRole('authenticated',owner,async()=>{
      await db.query("UPDATE nfc_cards SET status='other' WHERE id=$1",[card]);
      await db.query("UPDATE nfc_cards SET status='unclaimed',card_type='vip',paid_order_ref='forged' WHERE id=$1",[card]);
      await db.query("INSERT INTO personal_card_requests(user_id,profile_id,quantity,status) VALUES($1,$2,999,'approved')",[owner,gated]);
    });
    await asRole('authenticated',disabledRep,()=>db.query('UPDATE sales_reps SET is_active=true,quality_gate_exempt=true WHERE id=$1',[disabledRep]));
    await asRole('authenticated',regular,()=>demo(regular,'forged'));
    await db.exec('DELETE FROM bookings; DELETE FROM personal_card_requests; DELETE FROM rep_demo_requests');
    await db.query("UPDATE nfc_cards SET status='claimed',card_type='standard',paid_order_ref=NULL WHERE id=$1",[card]);
    await db.query('UPDATE sales_reps SET is_active=false,quality_gate_exempt=false WHERE id=$1',[disabledRep]);
  });
  const migration=read('supabase/migrations/20261027090000_public_access_and_reservations.sql');
  assert.equal(migration,read('drizzle/migrations/0032_public_access_and_reservations.sql'));
  await db.exec(migration);
  await pass('Public projections honor approval/payment gates; owners keep product/menu previews and gifts stay unchanged',async()=>{
    await asRole('anon',null,async()=>{
      assert.deepEqual((await db.query('SELECT username FROM personal_profiles_public')).rows.map(r=>r.username),['live']);
      assert.deepEqual((await db.query('SELECT username FROM get_public_personal_showcase(10)')).rows.map(r=>r.username),['live']);
      assert.equal((await db.query('SELECT * FROM get_public_creator_products($1)',[gated])).rows.length,0);
      assert.equal((await db.query('SELECT * FROM get_public_restaurant_menu($1)',[restaurant])).rows.length,0);
      await assert.rejects(()=>db.query("UPDATE personal_profiles_public SET full_name='forged' WHERE id=$1",[creator]),/permission denied/);
    });
    await asRole('authenticated',owner,async()=>{
      assert.equal((await db.query('SELECT * FROM get_public_creator_products($1)',[gated])).rows.length,1);
      assert.equal((await db.query('SELECT * FROM get_public_restaurant_menu($1)',[restaurant])).rows.length,1);
    });
    assert.equal((await db.query('SELECT personal_profile_is_active($1) allowed',[gift])).rows[0].allowed,true);
    assert.equal((await db.query('SELECT payment_state FROM personal_profiles WHERE id=$1',[gated])).rows[0].payment_state,'payment_required');
  });
  await pass('Browser roles cannot create card orders, read reset capabilities or call server reservation/payment RPCs',async()=>{
    for(const role of ['anon','authenticated']) await asRole(role,owner,async()=>{
      await assert.rejects(()=>db.query('SELECT * FROM magic_link_tokens'),/permission denied/);
      await assert.rejects(()=>db.query('SELECT * FROM rep_setup_tokens'),/permission denied/);
      await assert.rejects(()=>db.query('INSERT INTO personal_card_requests(user_id) VALUES($1)',[owner]),/permission denied/);
      await assert.rejects(()=>reserve(),/permission denied/);
      await assert.rejects(()=>db.query('SELECT fulfill_creator_booking($1,$2,$3,$4,2500,\'usd\',$5)',[uid(90),request,'cs_fixture',product,'buyer@example.invalid']),/permission denied/);
      await assert.rejects(()=>db.query('SELECT redeem_free_promo_token($1,$2,$3)',[uid(60),owner,restaurant]),/permission denied/);
    });
    await asRole('service_role',null,()=>db.query('INSERT INTO personal_card_requests(user_id,profile_id,quantity,status) VALUES($1,$2,2,\'pending\')',[owner,creator]));
  });
  await pass('Owners cannot manufacture unclaimed/VIP/paid cards but can point cards to their own hub',async()=>{
    await asRole('authenticated',owner,async()=>{
      for(const changes of ["status='other'","card_type='vip'","paid_order_ref='forged'","owner_user_id=NULL","claim_code_hash='forged'","destination_type='url'","destination_value='someone-else'"])
        await assert.rejects(()=>db.query(`UPDATE nfc_cards SET ${changes} WHERE id=$1`,[card]),/managed by TapAway|own hub/);
      await db.query("UPDATE nfc_cards SET destination_value='gift' WHERE id=$1",[card]);
    });
  });
  await pass('Disabled reps cannot reinstate access or bypass quality gates; active reps get one pending kit',async()=>{
    await asRole('authenticated',disabledRep,async()=>{
      for(const changes of ['is_active=true','quality_gate_exempt=true',"agreement_accepted=true"])
        await assert.rejects(()=>db.query(`UPDATE sales_reps SET ${changes} WHERE id=$1`,[disabledRep]),/managed by TapAway/);
      await db.query("UPDATE sales_reps SET name='New name',phone='555' WHERE id=$1",[disabledRep]);
      await assert.rejects(()=>demo(disabledRep),/active reps/);
    });
    await asRole('authenticated',regular,()=>assert.rejects(()=>demo(regular),/active reps/));
    await asRole('authenticated',activeRep,async()=>{
      await assert.rejects(()=>demo(activeRep,'forged'),/active reps/);
      await demo(activeRep); await assert.rejects(()=>demo(activeRep),/already been requested/);
      const row=(await db.query('SELECT * FROM rep_demo_requests')).rows[0];assert.equal(row.fulfilled,false);assert.equal(row.tracking_number,null);
      assert.equal((await db.query('UPDATE rep_demo_requests SET fulfilled=true WHERE rep_user_id=$1 RETURNING id',[activeRep])).rows.length,0);
    });
  });
  await pass('Storage media limits preserve privacy and supported video while excluding active document types',async()=>{
    const rows=(await db.query('SELECT * FROM storage.buckets')).rows;
    for(const row of rows.filter(r=>r.id!=='creator-files')){assert.equal(row.file_size_limit,20971520);assert.ok(!row.allowed_mime_types.includes('text/html'));assert.ok(!row.allowed_mime_types.includes('image/svg+xml'));}
    assert.equal(rows.find(r=>r.id==='card-print-files').public,false);
    assert.ok(rows.find(r=>r.id==='personal-photos').allowed_mime_types.includes('video/mp4'));
    assert.equal(rows.find(r=>r.id==='creator-files').file_size_limit,null);
  });
  await pass('Browser paid-booking inserts are denied, including through the safe slot view',async()=>{
    for(const role of ['anon','authenticated']) await asRole(role,owner,async()=>{
      await assert.rejects(()=>db.query("INSERT INTO bookings(product_id,creator_id,booking_date,start_time,status) VALUES($1,$2,$3,'09:00','paid')",[product,creator,day]),/permission denied/);
      await assert.rejects(()=>db.query("UPDATE bookings_public SET status='paid'"),/permission denied/);
    });
  });
  let reserved;
  await pass('Server reservations validate schedule and snapshot price/duration; retries return the same hold',async()=>{
    await asRole('service_role',null,async()=>{
      for(const args of [[uid(21),'10:01'],[uid(22),'10:00:00.1'],[uid(23),'18:00'],[uid(24),'10:00',product,'bad-email'],[uid(25),'10:00',product,'buyer@example.invalid','No/SuchZone'],[uid(26),'10:00',uid(12)],[uid(27),'10:00',product,'buyer@example.invalid','UTC','2000-01-01']])
        await assert.rejects(()=>reserve(...args),/available|Invalid|future/);
      reserved=await reserve(); assert.equal(reserved.priceCents,2500);assert.equal(reserved.durationMinutes,30);assert.equal(reserved.stripeSessionId,null);
      assert.deepEqual(await reserve(),reserved);
      await assert.rejects(()=>reserve(request,'11:00'),/does not match/);
      await db.query("UPDATE bookings SET stripe_session_id='cs_fixture' WHERE id=$1",[reserved.bookingId]);
      assert.equal((await reserve()).stripeSessionId,'cs_fixture');
    });
  });
  await pass('Overlapping products cannot reserve the same creator; concurrent callers yield one hold',async()=>{
    await asRole('service_role',null,async()=>{
      await assert.rejects(()=>reserve(uid(28),'10:00',otherProduct),/just reserved/);
      const outcomes=await Promise.allSettled([reserve(uid(29),'12:00'),reserve(uid(31),'12:00')]);
      assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.filter(r=>r.status==='rejected').length,1);
    });
  });
  await pass('Public slot results include cross-product UTC overlaps without buyer/booking/payment identifiers',async()=>{
    await asRole('anon',null,async()=>{
      const rows=(await db.query('SELECT * FROM get_public_booking_slots($1,$2,$2)',[otherProduct,day])).rows;
      assert.equal(rows.length,2);assert.ok(rows.every(r=>r.starts_at&&r.ends_at));
      for(const row of rows) assert.deepEqual(Object.keys(row).sort(),['booking_date','created_at','ends_at','reserved_until','start_time','starts_at','status'].sort());
      assert.ok(!JSON.stringify(rows).includes('buyer@')); assert.ok(!JSON.stringify(rows).includes('cs_fixture'));
      assert.equal((await db.query('SELECT * FROM bookings')).rows.length,0);
      assert.equal((await db.query('SELECT * FROM get_public_booking_slots($1,$2,($2::date+32))',[otherProduct,day])).rows.length,0);
    });
  });
  await pass('Creators cannot mark bookings paid or edit buyers, but can cancel their own appointment',async()=>{
    const cancel=await asRole('service_role',null,()=>reserve(uid(32),'13:00'));
    await asRole('authenticated',owner,async()=>{
      for(const changes of ["status='paid'","buyer_email='other@example.invalid'","price_cents=1","stripe_session_id='cs_forged'"])
        await assert.rejects(()=>db.query(`UPDATE bookings SET ${changes} WHERE id=$1`,[cancel.bookingId]),/managed by TapAway/);
      await db.query("UPDATE bookings SET status='canceled' WHERE id=$1",[cancel.bookingId]);
    });
  });
  const fulfill=(id=reserved.bookingId,key=request,session='cs_fixture',amount=2500,email='buyer@example.invalid')=>db.query("SELECT fulfill_creator_booking($1,$2,$3,$4,$5,'usd',$6) result",[id,key,session,product,amount,email]).then(r=>r.rows[0].result);
  await pass('Only matching stored Stripe proof confirms the booking; repeated delivery is idempotent',async()=>{
    await asRole('service_role',null,async()=>{
      for(const args of [[reserved.bookingId,request,'cs_wrong'],[reserved.bookingId,request,'cs_fixture',1],[reserved.bookingId,request,'cs_fixture',2500,'other@example.invalid'],[reserved.bookingId,uid(34)]])
        await assert.rejects(()=>fulfill(...args),/does not match/);
      assert.deepEqual(await fulfill(),{confirmed:true,reviewRequired:false,alreadyConfirmed:false});
      assert.deepEqual(await fulfill(),{confirmed:true,reviewRequired:false,alreadyConfirmed:true});
    });
  });
  await pass('Expired reservations can be replaced; late conflicting payment is held for review',async()=>{
    await asRole('service_role',null,async()=>{
      const expired=await reserve(uid(35),'14:00');
      await db.query("UPDATE bookings SET reserved_until=now()-interval '1 second',stripe_session_id='cs_expired' WHERE id=$1",[expired.bookingId]);
      await assert.rejects(()=>reserve(uid(35),'14:00'),/no longer pending/);
      await reserve(uid(36),'14:00');
      assert.deepEqual(await fulfill(expired.bookingId,uid(35),'cs_expired'),{confirmed:false,reviewRequired:true,alreadyConfirmed:false});
      assert.equal((await db.query('SELECT status FROM bookings WHERE id=$1',[expired.bookingId])).rows[0].status,'payment_review');
    });
  });
  await pass('Purchase replay and payment-intent reuse cannot create additional download grants',async()=>{
    await asRole('service_role',null,async()=>{
      const purchase=(session,pi)=>db.query("INSERT INTO creator_purchases(product_id,buyer_email,stripe_session_id,stripe_payment_intent_id,access_token,access_expires_at) VALUES($1,'buyer@example.invalid',$2,$3,'private-token',now()+interval '1 day')",[product,session,pi]);
      await purchase('cs_download','pi_download');
      await assert.rejects(()=>purchase('cs_download','pi_other'),/duplicate key/);
      await assert.rejects(()=>purchase('cs_other','pi_download'),/duplicate key/);
      assert.equal((await db.query('SELECT payment_status FROM creator_purchases')).rows[0].payment_status,'paid');
    });
    await asRole('authenticated',owner,()=>assert.rejects(()=>db.query("UPDATE creator_purchases SET payment_status='paid'"),/permission denied/));
  });
  await pass('Single-use free promos cannot bypass ownership, expiry, reservations, billing or a targeted payment hold',async()=>{
    const newRestaurant=uid(52),token=uid(60);
    await db.query("INSERT INTO restaurants(id,owner_id,subscription_status,payment_state,is_approved,created_at) VALUES($1,$2,'pending','unknown_manual',false,now())",[newRestaurant,owner]);
    await db.query("INSERT INTO promo_tokens(id,discount_type,expires_at,is_used) VALUES($1,'free',now()+interval '1 day',false)",[token]);
    const redeem=(user=owner,id=newRestaurant)=>db.query('SELECT redeem_free_promo_token($1,$2,$3) ok',[token,user,id]).then(r=>r.rows[0].ok);
    await asRole('service_role',null,async()=>{
      assert.equal(await redeem(regular),false);assert.equal(await redeem(owner,restaurant),false);
      await db.query('UPDATE promo_tokens SET reserved_by=$1,reserved_at=now() WHERE id=$2',[regular,token]);assert.equal(await redeem(),false);
      await db.query("UPDATE promo_tokens SET reserved_by=NULL,expires_at=now()-interval '1 second' WHERE id=$1",[token]);assert.equal(await redeem(),false);
      await db.query("UPDATE promo_tokens SET expires_at=now()+interval '1 day' WHERE id=$1",[token]);
      await db.query("UPDATE restaurants SET stripe_subscription_id='sub_existing' WHERE id=$1",[newRestaurant]);assert.equal(await redeem(),false);
      await db.query('UPDATE restaurants SET stripe_subscription_id=NULL WHERE id=$1',[newRestaurant]);
      const results=await Promise.all([redeem(),redeem()]);assert.equal(results.filter(Boolean).length,1);
      const row=(await db.query('SELECT payment_state,is_approved FROM restaurants WHERE id=$1',[newRestaurant])).rows[0];assert.equal(row.payment_state,'complimentary');assert.equal(row.is_approved,false);
    });
  });
  await pass('Public lead forms honor hub access and direct submission/analytics forgery is denied',async()=>{
    await db.query('INSERT INTO lead_forms VALUES($1,$2,true),($3,$4,true)',[uid(70),creator,uid(71),gated]);
    for(const role of ['anon','authenticated']) await asRole(role,owner,async()=>{
      assert.deepEqual((await db.query('SELECT profile_id FROM lead_forms')).rows.map(r=>r.profile_id),[creator]);
      await assert.rejects(()=>db.query('INSERT INTO lead_submissions(form_id,profile_id) VALUES($1,$2)',[uid(70),creator]),/permission denied/);
      await assert.rejects(()=>db.query("INSERT INTO personal_analytics(profile_id,event_type) VALUES($1,'profile_visit')",[creator]),/permission denied/);
      await assert.rejects(()=>db.query("INSERT INTO analytics_events(restaurant_id,event_type) VALUES($1,'tap')",[restaurant]),/permission denied/);
    });
    await asRole('service_role',null,()=>db.query('INSERT INTO lead_submissions(form_id,profile_id) VALUES($1,$2)',[uid(70),creator]));
  });
  await pass('Public intake cannot bypass the server to forge support/application/consent state',async()=>{
    for(const role of ['anon','authenticated']) await asRole(role,owner,async()=>{
      for(const table of ['support_requests','rep_applications','personal_email_captures','sms_signup_submissions'])
        await assert.rejects(()=>db.query(`INSERT INTO ${table} DEFAULT VALUES`),/permission denied/);
      await assert.rejects(()=>db.query('SELECT record_personal_capture($1,NULL,$2,NULL,NULL,false,false,NULL,NULL,NULL)',[creator,'visitor@example.invalid']),/permission denied/);
      await assert.rejects(()=>db.query('SELECT reserve_legacy_card_addon($1,$2,$3,$4,$5,$6,1,$7,$8)',[creator,owner,'cus_fixture','sub_fixture','in_fixture','pi_fixture',{},uid(80)]),/permission denied/);
    });
  });
  await pass('Capture and explicit consent audit are atomic; failed audit never leaves an opted-in contact',async()=>{
    const capture=(id=creator,marketing=false)=>db.query('SELECT record_personal_capture($1,NULL,$2,$3,NULL,$4,false,$5,NULL,$6) id',[id,'visitor@example.invalid','+15555550123',marketing,'Fixture explicit marketing consent','Fixture browser']);
    await asRole('service_role',null,async()=>{
      await assert.rejects(()=>capture(gated),/hub is unavailable/);
      await capture();assert.equal((await db.query('SELECT count(*) n FROM sms_signup_submissions')).rows[0].n,0);
      const plain=(await db.query('SELECT * FROM personal_email_captures')).rows[0];assert.equal(plain.sms_opt_in,false);assert.equal(plain.sms_marketing_opt_in_at,null);
    });
    await db.exec("ALTER TABLE sms_signup_submissions ADD CONSTRAINT force_fixture_failure CHECK(source='/sms-signup')");
    await asRole('service_role',null,()=>assert.rejects(()=>capture(creator,true),/force_fixture_failure/));
    assert.equal((await db.query('SELECT count(*) n FROM personal_email_captures')).rows[0].n,1);
    await db.exec('ALTER TABLE sms_signup_submissions DROP CONSTRAINT force_fixture_failure');
    await asRole('service_role',null,()=>capture(creator,true));
    const consent=(await db.query('SELECT * FROM sms_signup_submissions')).rows[0];assert.equal(consent.name,'Website visitor');assert.equal(consent.source,'personal-hub:'+creator);assert.equal(consent.transactional_consent_at,null);
    const row=(await db.query('SELECT * FROM personal_email_captures WHERE sms_marketing_opt_in=true')).rows[0];assert.equal(row.name,null);assert.deepEqual(row.sms_marketing_opt_in_at,consent.marketing_consent_at);assert.deepEqual(row.created_at,consent.created_at);
  });
  await pass('Restaurant entitlement shares the payment gate and preserves existing approved gifts',async()=>{
    assert.equal((await db.query('SELECT restaurant_is_active($1) allowed',[restaurant])).rows[0].allowed,false);
    await db.query("UPDATE restaurants SET subscription_status='trialing',payment_state='unknown_manual' WHERE id=$1",[restaurant]);
    assert.equal((await db.query('SELECT restaurant_is_active($1) allowed',[restaurant])).rows[0].allowed,true);
  });
  await pass('Legacy three-card allowance is atomic, retry-safe and shared across profiles of a subscription',async()=>{
    const secondProfile=uid(81);await db.query("UPDATE personal_profiles SET stripe_customer_id='cus_fixture' WHERE id=$1",[creator]);
    await db.query("INSERT INTO personal_profiles(id,user_id,username,is_approved,subscription_status,stripe_customer_id,created_at) VALUES($1,$2,'other-page',true,'active','cus_fixture',now())",[secondProfile,owner]);
    // The unrelated earlier fixture card request must not consume this pool.
    await db.exec('DELETE FROM personal_card_requests');
    const address={name:'Fixture Buyer',line1:'Example Street',line2:'',city:'Example City',state:'CA',postal_code:'00000',country:'US'};
    const claim=(key,quantity=2,profile=creator,customer='cus_fixture',shipping=address)=>db.query('SELECT reserve_legacy_card_addon($1,$2,$3,$4,$5,$6,$7,$8,$9) result',[profile,owner,customer,'sub_fixture','in_fixture','pi_fixture',quantity,shipping,key]).then(r=>r.rows[0].result);
    await asRole('service_role',null,async()=>{
      await assert.rejects(()=>claim(uid(82),2,creator,'cus_wrong'),/not eligible/);
      await assert.rejects(()=>claim(uid(82),4),/Invalid card/);
      const before=await claim(uid(82));assert.equal(before.success,true);assert.equal(before.remaining,1);
      assert.equal((await claim(uid(82))).duplicate,true);
      await assert.rejects(()=>claim(uid(82),1),/different card details/);
      assert.equal((await claim(uid(83),2,secondProfile)).success,false);
      const outcomes=await Promise.all([claim(uid(84),1,creator),claim(uid(85),1,secondProfile)]);assert.equal(outcomes.filter(r=>r.success).length,1);
      assert.equal((await db.query('SELECT sum(quantity)::int n FROM personal_card_requests')).rows[0].n,3);
      await db.exec("UPDATE personal_card_requests SET status='printing'");
      assert.equal((await claim(uid(86),1)).success,false);
    });
  });
  await pass('Affiliate attribution rejects self-referrals and other profiles; commission writes stay server/admin-only',async()=>{
    const genuine=uid(101),self=uid(102),other=uid(103),someone=uid(104);
    await db.query("INSERT INTO affiliates(id,user_id,referral_code) VALUES($1,$2,'genuine'),($3,$4,'self'),($5,$6,'another')",[genuine,someone,self,owner,other,regular]);
    await db.query("INSERT INTO personal_profiles(id,user_id,username) VALUES($1,$2,'unrelated')",[uid(105),someone]);
    await asRole('authenticated',owner,async()=>{
      // This caller cannot read the affiliate's private row; the narrow checker
      // still permits an actual code relationship and never grants write access.
      assert.equal((await db.query('SELECT * FROM affiliates WHERE id=$1',[genuine])).rows.length,0);
      await assert.rejects(()=>db.query('INSERT INTO affiliate_referrals(affiliate_id,referred_user_id,referred_profile_id) VALUES($1,$2,$3)',[self,owner,creator]),/must belong/);
      await assert.rejects(()=>db.query('INSERT INTO affiliate_referrals(affiliate_id,referred_user_id,referred_profile_id) VALUES($1,$2,$3)',[genuine,owner,uid(105)]),/must belong/);
      await assert.rejects(()=>db.query("UPDATE personal_profiles SET referred_by='genuine' WHERE id=$1",[creator]),/matching referral/);
      await db.query("INSERT INTO affiliate_referrals(affiliate_id,referred_user_id,referred_profile_id,created_at,ip_address) VALUES($1,$2,$3,'2000-01-01','forged')",[genuine,owner,creator]);
      await db.query("UPDATE personal_profiles SET referred_by='GENUINE' WHERE id=$1",[creator]);
      await assert.rejects(()=>db.query("UPDATE personal_profiles SET referred_by='another' WHERE id=$1",[creator]),/existing referral/);
      await assert.rejects(()=>db.query('INSERT INTO affiliate_commissions(affiliate_id,amount,status) VALUES($1,999999,\'paid\')',[self]),/row-level security/);
    });
    const saved=(await db.query('SELECT * FROM affiliate_referrals WHERE referred_user_id=$1',[owner])).rows[0];
    assert.ok(new Date(saved.created_at)>new Date('2000-01-02'));assert.equal(saved.ip_address,null);
    assert.equal((await db.query('SELECT referred_by FROM personal_profiles WHERE id=$1',[creator])).rows[0].referred_by,'genuine');
  });
  await pass('New security-definer functions have pinned search paths and no browser mutation grants',async()=>{
    const rows=(await db.query("SELECT proname,proconfig FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN('reserve_creator_booking','fulfill_creator_booking','get_public_booking_slots','redeem_free_promo_token')")).rows;
    assert.equal(rows.length,4);assert.ok(rows.every(r=>r.proconfig.includes('search_path=public')));
  });
  await db.close(); console.log(`${checks} database relaunch checks passed.`);
})().catch(error=>{ console.error(error);process.exit(1); });
