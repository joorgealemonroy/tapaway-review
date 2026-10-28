// Isolated real PostgreSQL migration/trigger checks. No Stripe/network/account data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(path.join(process.env.QA_MODULES, '@electric-sql/pglite'));
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let checks = 0;
const pass = async (name, run) => { await run(); checks++; console.log(`PASS ${name}`); };
(async () => {
  const db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  await db.exec(read('scripts/fixtures/launch-schema.sql'));
  await db.exec(`CREATE TABLE creator_products(id uuid PRIMARY KEY, duration_minutes integer);
    CREATE TABLE creator_purchases(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),product_id uuid NOT NULL,buyer_email text NOT NULL,
      stripe_session_id text NOT NULL UNIQUE,stripe_payment_intent_id text UNIQUE,payment_status text DEFAULT 'paid',
      access_token text NOT NULL,access_expires_at timestamptz NOT NULL,buyer_email_started_at timestamptz,buyer_email_sent_at timestamptz,
      creator_email_started_at timestamptz,creator_email_sent_at timestamptz);
    CREATE TABLE bookings(id uuid PRIMARY KEY,creator_id uuid,product_id uuid,buyer_email text,booking_date date,start_time time,
      status text,timezone text,created_at timestamptz DEFAULT now(),updated_at timestamptz,starts_at timestamptz,ends_at timestamptz,
      reserved_until timestamptz,reservation_key uuid,stripe_session_id text,price_cents integer,duration_minutes integer);
    CREATE TABLE card_club_memberships(id uuid PRIMARY KEY,checkout_intent_id uuid,main_stripe_subscription_id text,
      status text CHECK(status IN ('offered','declined','pending_activation','activation_failed','active','past_due','cancelled')),review_reason text,updated_at timestamptz);
    CREATE TABLE personal_card_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),status text DEFAULT 'pending',
      legacy_card_payment_intent_id text,legacy_card_subscription_id text);
    CREATE TABLE hub_payment_requests(profile_id uuid PRIMARY KEY,request_version uuid,fulfilled_at timestamptz,
      stripe_subscription_id text,stripe_checkout_session_id text,payment_hold_at timestamptz,
      payment_hold_reason text CHECK(payment_hold_reason IN ('refunded','disputed')),payment_hold_event_id text,
      welcome_email_started_at timestamptz);
    ALTER TABLE personal_card_orders ADD CONSTRAINT orders_status CHECK(status IN ('preparing','checkout_started','paid','refunded','disputed'));
    ALTER TABLE personal_card_orders ADD CONSTRAINT orders_production CHECK(production_status IN ('awaiting_payment','needs_review','approved','printed','shipped','on_hold'));
    ALTER TABLE checkout_intents ADD CONSTRAINT intents_status CHECK(status IN ('created','checkout_started','paid','pending_association','associated','failed','abandoned','needs_review'));
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`);
  const migration=read('drizzle/migrations/0035_payment_reversal_holds.sql');
  assert.equal(migration,read('supabase/migrations/20261027150000_payment_reversal_holds.sql'));
  await db.exec(migration);
  const one=async(sql,params=[]) => (await db.query(sql,params)).rows[0];
  const reverse=(pi,sub=null,reason='refunded',mode='live')=>db.query('SELECT record_payment_reversal($1,$2,$3,$4) result',[mode,pi,sub,reason]);
  const purchase=(n,pi=`pi_case${n}`,status='paid',session=`cs_live_case${n}`)=>db.query(`INSERT INTO creator_purchases(id,product_id,buyer_email,stripe_session_id,stripe_payment_intent_id,payment_status,access_token,access_expires_at)
    VALUES($1,$2,'buyer@example.invalid',$3,$4,$5,'fixture',now()+interval '72 hours')`,[uid(n),uid(1000+n),session,pi,status]);
  const order=(n,pi=`pi_case${n}`,sub=null,mode=true)=>db.query(`INSERT INTO personal_card_orders(id,personal_profile_id,status,production_status,stripe_payment_intent_id,stripe_subscription_id,stripe_livemode)
    VALUES($1,$2,'paid','needs_review',$3,$4,$5)`,[uid(n),uid(n+10000),pi,sub,mode]);
  const profile=(id,sub)=>db.query(`INSERT INTO personal_profiles(id,stripe_subscription_id,subscription_status,payment_state,is_approved) VALUES($1,$2,'active','paying',true)`,[id,sub]);
  const booking=async(n)=>{
    await db.query('INSERT INTO creator_products(id,duration_minutes) VALUES($1,30)',[uid(1000+n)]);
    await db.query(`INSERT INTO bookings(id,creator_id,product_id,buyer_email,booking_date,start_time,status,timezone,starts_at,ends_at,reserved_until,reservation_key,stripe_session_id,price_cents,duration_minutes)
      VALUES($1,$2,$3,'buyer@example.invalid',current_date+10,'10:00','pending','UTC',(current_date+10)+time '10:00',(current_date+10)+time '10:30',now()+interval '35 minutes',$4,$5,2500,30)`,[uid(n+20000),uid(n+30000),uid(n+1000),uid(n+40000),`cs_live_case${n}`]);
  };
  const fulfill=n=>one("SELECT fulfill_creator_booking($1,$2,$3,$4,2500,'usd','buyer@example.invalid') result",[uid(n+20000),uid(n+40000),`cs_live_case${n}`,uid(n+1000)]).then(r=>r.result);
  await pass('Browser roles cannot read or create durable reversal holds',async()=>{
    for(const role of ['anon','authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(()=>db.query('SELECT * FROM payment_reversal_holds'),/permission denied/);
      await assert.rejects(()=>reverse('pi_denied'),/permission denied/);
      await assert.rejects(()=>db.query("SELECT payment_reversal_reason('live','pi_denied',NULL)"),/permission denied/);
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');await reverse('pi_service');await db.exec('RESET ROLE');
  });
  await pass('Refund before creator purchase binding prevents first delivery and stale paid retries',async()=>{
    await reverse('pi_case1'); await purchase(1);
    let p=await one('SELECT * FROM creator_purchases WHERE id=$1',[uid(1)]);
    assert.equal(p.payment_status,'refunded');assert.ok(new Date(p.access_expires_at)<=new Date());
    await db.query("UPDATE creator_purchases SET payment_status='paid',access_expires_at=now()+interval '72 hours',buyer_email_started_at=now() WHERE id=$1",[uid(1)]);
    p=await one('SELECT * FROM creator_purchases WHERE id=$1',[uid(1)]);assert.equal(p.payment_status,'refunded');assert.equal(p.buyer_email_started_at,null);
  });
  await pass('Creator purchase first, refund second revokes existing access and survives stale updates',async()=>{
    await purchase(2); await reverse('pi_case2',null,'disputed');
    await db.query("UPDATE creator_purchases SET payment_status='paid' WHERE id=$1",[uid(2)]);
    assert.equal((await one('SELECT payment_status FROM creator_purchases WHERE id=$1',[uid(2)])).payment_status,'disputed');
  });
  await pass('Partial creator refunds use the same review state before insert and after fulfillment',async()=>{
    await reverse('pi_case13',null,'partial_refund');await purchase(13);
    await purchase(14);await reverse('pi_case14',null,'partial_refund');
    for(const n of [13,14]) {
      await db.query("UPDATE creator_purchases SET payment_status='paid',buyer_email_started_at=now(),access_expires_at=now()+interval '72 hours' WHERE id=$1",[uid(n)]);
      const p=await one('SELECT * FROM creator_purchases WHERE id=$1',[uid(n)]);
      assert.equal(p.payment_status,'payment_review');assert.equal(p.buyer_email_started_at,null);assert.ok(new Date(p.access_expires_at)<=new Date());
    }
  });
  await pass('Refund between booking purchase creation and confirmation returns review, never confirmed',async()=>{
    await purchase(3,'pi_case3','pending');await booking(3);await reverse('pi_case3');
    const result=await fulfill(3);assert.equal(result.confirmed,false);assert.equal(result.reviewRequired,true);
    assert.equal((await one('SELECT status FROM bookings WHERE id=$1',[uid(20003)])).status,'payment_review');
  });
  await pass('Confirmed booking is revoked by a later refund and cannot be reconfirmed',async()=>{
    await purchase(4,'pi_case4','pending');await booking(4);assert.equal((await fulfill(4)).confirmed,true);
    await db.query("UPDATE creator_purchases SET payment_status='paid' WHERE id=$1",[uid(4)]);
    await reverse('pi_case4');assert.equal((await fulfill(4)).confirmed,false);
    await db.query("UPDATE bookings SET status='paid' WHERE id=$1",[uid(20004)]);
    assert.equal((await one('SELECT status FROM bookings WHERE id=$1',[uid(20004)])).status,'payment_review');
  });
  await pass('New booking confirmation without the purchase proof row fails closed',async()=>{
    await booking(5);assert.equal((await fulfill(5)).confirmed,false);
  });
  await pass('Personal refund before PI binding holds production, late profile creation and stale activation',async()=>{
    await order(6,null,'sub_case6');await reverse('pi_case6','sub_case6');
    await db.query("UPDATE personal_card_orders SET stripe_payment_intent_id='pi_case6',status='paid',production_status='needs_review',activation_started_at=now() WHERE id=$1",[uid(6)]);
    await profile(uid(10006),'sub_case6');
    await db.query("UPDATE personal_card_orders SET status='paid',production_status='approved',activated_at=now() WHERE id=$1",[uid(6)]);
    const o=await one('SELECT * FROM personal_card_orders WHERE id=$1',[uid(6)]);assert.equal(o.status,'refunded');assert.equal(o.production_status,'on_hold');assert.equal(o.activated_at,null);
    const p=await one('SELECT * FROM personal_profiles WHERE id=$1',[uid(10006)]);assert.equal(p.subscription_status,'past_due');assert.equal(p.is_approved,false);
  });
  await pass('Refund without subscription metadata still holds a later personal hub via its order',async()=>{
    await reverse('pi_case7');await order(7);await profile(uid(10007),null);
    assert.equal((await one('SELECT is_approved FROM personal_profiles WHERE id=$1',[uid(10007)])).is_approved,false);
  });
  await pass('Later subscription invoice reversal holds hosted access without refunding original printed cards',async()=>{
    await order(8,'pi_original8','sub_case8');await profile(uid(10008),'sub_case8');
    await reverse('pi_renewal8','sub_case8');
    const o=await one('SELECT status,production_status FROM personal_card_orders WHERE id=$1',[uid(8)]);assert.equal(o.status,'paid');assert.equal(o.production_status,'needs_review');
    await db.query("UPDATE personal_profiles SET subscription_status='active',payment_state='paying',is_approved=true WHERE id=$1",[uid(10008)]);
    assert.equal((await one('SELECT is_approved FROM personal_profiles WHERE id=$1',[uid(10008)])).is_approved,false);
  });
  await pass('Business refund before association blocks stale intents, profiles, restaurants and Card Club activation',async()=>{
    await reverse('pi_case9','sub_case9');
    await db.query("INSERT INTO checkout_intents(id,stripe_subscription_id,stripe_livemode,status) VALUES($1,'sub_case9',true,'associated')",[uid(9)]);
    await profile(uid(9),'sub_case9');
    await db.query("INSERT INTO restaurants(id,stripe_subscription_id,subscription_status,payment_state,is_approved) VALUES($1,'sub_case9','active','paying',true)",[uid(9)]);
    await db.query("INSERT INTO card_club_memberships(id,checkout_intent_id,main_stripe_subscription_id,status) VALUES($1,$1,'sub_case9','active')",[uid(9)]);
    await db.query("UPDATE checkout_intents SET status='associated',payment_hold_at=NULL,payment_hold_reason=NULL WHERE id=$1",[uid(9)]);
    const intent=await one('SELECT * FROM checkout_intents WHERE id=$1',[uid(9)]);assert.equal(intent.status,'needs_review');assert.ok(intent.payment_hold_at);assert.equal(intent.payment_hold_reason,'refunded');
    assert.equal((await one('SELECT is_approved FROM restaurants WHERE id=$1',[uid(9)])).is_approved,false);
    assert.equal((await one('SELECT status FROM card_club_memberships WHERE id=$1',[uid(9)])).status,'past_due');
  });
  await pass('Partial refund preserves accurate order status but holds printing; reason upgrades are monotonic',async()=>{
    await order(10);await reverse('pi_case10',null,'partial_refund');
    let o=await one('SELECT status,production_status FROM personal_card_orders WHERE id=$1',[uid(10)]);assert.equal(o.status,'paid');assert.equal(o.production_status,'on_hold');
    await reverse('pi_case10',null,'refunded');await reverse('pi_case10',null,'partial_refund');
    o=await one('SELECT status FROM personal_card_orders WHERE id=$1',[uid(10)]);assert.equal(o.status,'refunded');
    await reverse('pi_case10',null,'disputed');await reverse('pi_case10');
    assert.equal((await one("SELECT reason FROM payment_reversal_holds WHERE stripe_payment_intent_id='pi_case10'")).reason,'disputed');
  });
  await pass('Legacy free card requests cannot race a refund or regain printing; shipped history stays intact',async()=>{
    const legacy=(n,status='pending')=>db.query('INSERT INTO personal_card_requests(id,status,legacy_card_payment_intent_id,legacy_card_subscription_id) VALUES($1,$2,$3,$4)',[uid(n),status,`pi_legacy${n}`,`sub_legacy${n}`]);
    await reverse('pi_legacy15','sub_legacy15');await assert.rejects(()=>legacy(15),/requires review/);
    await legacy(16);await reverse('pi_legacy16','sub_legacy16', 'partial_refund');
    await db.query("UPDATE personal_card_requests SET status='shipped' WHERE id=$1",[uid(16)]);
    assert.equal((await one('SELECT status FROM personal_card_requests WHERE id=$1',[uid(16)])).status,'on_hold');
    await legacy(17,'shipped');await reverse('pi_legacy17','sub_legacy17');
    assert.equal((await one('SELECT status FROM personal_card_requests WHERE id=$1',[uid(17)])).status,'shipped');
    await reverse('pi_legacy18','sub_legacy18','refunded','test');await legacy(18);
    assert.equal((await one('SELECT status FROM personal_card_requests WHERE id=$1',[uid(18)])).status,'pending');
  });
  await pass('Targeted hub activation returns held when a reversal precedes subscription association',async()=>{
    await profile(uid(20),null);await db.query("UPDATE personal_profiles SET payment_state='payment_required' WHERE id=$1",[uid(20)]);
    await db.query('INSERT INTO hub_payment_requests(profile_id,request_version,stripe_checkout_session_id) VALUES($1,$2,$3)',[uid(20),uid(40020),'cs_live_hub20']);
    await reverse('pi_hub20','sub_hub20','partial_refund');
    const result=await one("SELECT fulfill_hub_payment($1,$2,'cs_live_hub20','sub_hub20','cus_hub20','buyer@example.invalid') result",[uid(20),uid(40020)]);
    assert.equal(result.result.activated,false);assert.equal(result.result.held,true);
    const held=await one('SELECT * FROM hub_payment_requests WHERE profile_id=$1',[uid(20)]);
    assert.ok(held.payment_hold_at);assert.equal(held.payment_hold_reason,'partial_refund');assert.equal(held.fulfilled_at,null);
    await db.query("UPDATE hub_payment_requests SET fulfilled_at=now(),payment_hold_at=NULL,welcome_email_started_at=now() WHERE profile_id=$1",[uid(20)]);
    const retry=await one('SELECT * FROM hub_payment_requests WHERE profile_id=$1',[uid(20)]);
    assert.ok(retry.payment_hold_at);assert.equal(retry.fulfilled_at,null);assert.equal(retry.welcome_email_started_at,null);
  });
  await pass('Targeted hub fulfilled before refund cannot be reactivated or falsely acknowledged',async()=>{
    await profile(uid(21),null);await db.query("UPDATE personal_profiles SET payment_state='payment_required' WHERE id=$1",[uid(21)]);
    await db.query('INSERT INTO hub_payment_requests(profile_id,request_version,stripe_checkout_session_id) VALUES($1,$2,$3)',[uid(21),uid(40021),'cs_live_hub21']);
    const complete=()=>one("SELECT fulfill_hub_payment($1,$2,'cs_live_hub21','sub_hub21','cus_hub21','buyer@example.invalid') result",[uid(21),uid(40021)]);
    assert.equal((await complete()).result.activated,true);assert.equal((await complete()).result.alreadyFulfilled,true);
    await reverse('pi_hub21','sub_hub21');
    assert.equal((await complete()).result.activated,false);
    const held=await one('SELECT * FROM hub_payment_requests WHERE profile_id=$1',[uid(21)]);
    assert.ok(held.fulfilled_at);assert.ok(held.payment_hold_at);assert.equal(held.payment_hold_reason,'refunded');
  });
  await pass('Mode isolation, unrelated gifts, strict input and subscription binding remain intact',async()=>{
    await reverse('pi_case11',null,'refunded','test');await order(11);
    assert.equal((await one('SELECT status FROM personal_card_orders WHERE id=$1',[uid(11)])).status,'paid');
    await profile(uid(12),null);assert.equal((await one('SELECT is_approved FROM personal_profiles WHERE id=$1',[uid(12)])).is_approved,true);
    await assert.rejects(()=>reverse('forged'),/Invalid payment reversal/);
    await reverse('pi_case12','sub_case12');await assert.rejects(()=>reverse('pi_case12','sub_different'),/subscription mismatch/);
  });
  await db.close();console.log(`${checks} payment reversal database checks passed`);
})().catch(error=>{console.error(error);process.exit(1);});
