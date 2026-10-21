// Isolated PostgreSQL checks. No provider requests or production mutations.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(path.join(process.env.QA_MODULES, '@electric-sql/pglite'));
const root = path.join(__dirname, '..');
let checks = 0;
const pass = async (name, run) => { await run(); checks++; console.log(`PASS ${name}`); };
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

(async () => {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT current_user::text$$;
    CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql AS $$SELECT coalesce(current_setting('qa.admin',true),'')='yes'$$;
    CREATE FUNCTION cleanup_expired_archives() RETURNS void LANGUAGE sql AS $$SELECT$$;
    CREATE FUNCTION recompute_closer_pool(uuid,text) RETURNS void LANGUAGE sql AS $$SELECT$$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;`);
  await db.exec(fs.readFileSync(path.join(__dirname, 'fixtures/launch-schema.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/20261021120000_launch_hardening.sql'), 'utf8'));
  await db.exec(`CREATE TABLE user_roles(user_id uuid,role text);
    CREATE TABLE personal_links(id uuid PRIMARY KEY,profile_id uuid,link_type text,url text);
    CREATE TABLE personal_analytics(profile_id uuid,event_type text,visitor_info jsonb,created_at timestamptz);
    CREATE TABLE analytics_hits(hub_id uuid,event_name text,occurred_at timestamptz,is_validated boolean,traffic_class text,props jsonb);
    CREATE TABLE creator_availability(creator_id uuid,day_of_week int);
    ALTER TABLE personal_profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE personal_links ENABLE ROW LEVEL SECURITY;
    ALTER TABLE personal_analytics ENABLE ROW LEVEL SECURITY;
    ALTER TABLE creator_availability ENABLE ROW LEVEL SECURITY;
    CREATE POLICY owner_profile ON personal_profiles TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
    CREATE POLICY public_links ON personal_links FOR SELECT TO anon,authenticated USING(personal_profile_is_active(profile_id));
    GRANT SELECT,UPDATE ON personal_profiles TO authenticated; GRANT SELECT ON personal_profiles,personal_links,creator_availability TO anon;
    GRANT SELECT ON personal_links,creator_availability TO authenticated; GRANT INSERT ON personal_analytics TO anon,authenticated;`);
  await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/20261021150000_private_profile_records.sql'), 'utf8'));

  const profile = uid(1), owner = uid(2), admin = uid(3), gift = uid(4), active = uid(5), linked = uid(6), explicitGift = uid(7), unapproved = uid(8), consumer = uid(9);
  await db.query('INSERT INTO user_roles VALUES($1,\'admin\')', [admin]);
  for (const [id, slug, status, payment, approved, sub, plan] of [
    [profile, 'test-business', 'trialing', 'unknown_manual', true, null, 'solo_pro'],
    [gift, 'existing-gift', 'trialing', 'unknown_manual', true, null, 'solo_pro'],
    [active, 'paid-business', 'active', 'paying', true, 'sub_existing', 'solo_pro'],
    [linked, 'linked-business', 'canceled', 'canceled', true, 'sub_linked', 'solo_pro'],
    [explicitGift, 'explicit-gift', 'trialing', 'complimentary', true, null, 'solo_pro'],
    [unapproved, 'draft-business', 'trialing', 'unknown_manual', false, null, 'solo_pro'],
    [consumer, 'consumer-card', 'trialing', 'unknown_manual', true, null, 'personal'],
  ]) await db.query(`INSERT INTO personal_profiles(id,user_id,username,full_name,email,contact_company,plan_type,subscription_status,payment_state,is_approved,stripe_subscription_id,created_at)
    VALUES($1,$2,$3,'','private@example.invalid','Test Business',$4,$5,$6,$7,$8,'2026-08-01')`, [id, owner, slug, plan, status, payment, approved, sub]);
  await db.query("INSERT INTO personal_links VALUES($1,$2,'google_review','https://search.google.com/local/writereview?placeid=example'),($3,$2,'yelp','https://www.yelp.com/biz/example'),($4,$2,'instagram','https://instagram.com/example'),($5,$2,'directions','https://google.com/maps/place/example')", [uid(20), profile, uid(21), uid(22), uid(23)]);
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261021190000_hub_payment_requests.sql'), 'utf8');
  await pass('Deployed migration chain produces the canonical offer function', async () => {
    // Applied migrations are immutable. Capture the intended definition in a
    // rolled-back transaction, then exercise the actual deployment history.
    const definitionSql = "SELECT pg_get_functiondef('public.get_hub_payment_offer(text)'::regprocedure) definition";
    let expected;
    await db.exec('BEGIN');
    try {
      await db.exec(migration);
      expected = (await db.query(definitionSql)).rows[0].definition;
    } finally {
      await db.exec('ROLLBACK');
    }
    for (const file of ['0029_hub_payment_requests.sql', '0030_fix_hub_payment_offer_filter.sql']) {
      await db.exec(fs.readFileSync(path.join(root, 'drizzle/migrations', file), 'utf8'));
    }
    assert.equal((await db.query(definitionSql)).rows[0].definition, expected);
  });
  await pass('Installing the gate does not change existing accounts', async () => {
    assert.equal((await db.query('SELECT count(*) n FROM hub_payment_requests')).rows[0].n, 0);
    assert.equal((await db.query('SELECT personal_profile_is_active($1) allowed', [profile])).rows[0].allowed, true);
  });
  await pass('Anonymous and customer roles cannot read requests or run billing RPCs', async () => {
    for (const role of ['anon','authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(() => db.query('SELECT * FROM hub_payment_requests'), /permission denied/);
      await assert.rejects(() => db.query('SELECT require_hub_payment($1,$2)', [profile,admin]), /permission denied/);
      await assert.rejects(() => db.query("SELECT get_hub_payment_offer('test-business')"), /permission denied/);
      await assert.rejects(() => db.query("SELECT fulfill_hub_payment($1,$2,'cs_test_example','sub_example','cus_example','owner@example.invalid')", [profile,uid(30)]), /permission denied/);
      await assert.rejects(() => db.query("SELECT hold_hub_payment_by_subscription('sub_example','refunded','evt_fixture')"), /permission denied/);
      await db.exec('RESET ROLE');
    }
  });
  await pass('The server must identify a real admin and eligible unpaid business', async () => {
    await assert.rejects(() => db.query('SELECT require_hub_payment($1,$2)', [profile,owner]), /verified admin/);
    for (const id of [active,linked,explicitGift,unapproved,consumer]) await assert.rejects(() => db.query('SELECT require_hub_payment($1,$2)', [id,admin]), /cannot be paused|approved business/);
    assert.equal((await db.query('SELECT count(*) n FROM hub_payment_requests')).rows[0].n, 0);
  });
  const version = (await db.query('SELECT require_hub_payment($1,$2) version', [profile,admin])).rows[0].version;
  await pass('Requiring payment pauses only the selected hub and preserves its content and owner', async () => {
    const p = (await db.query('SELECT * FROM personal_profiles WHERE id=$1',[profile])).rows[0];
    assert.equal(p.payment_state,'payment_required'); assert.equal(p.user_id,owner); assert.equal(p.subscription_status,'trialing'); assert.equal(p.email,'private@example.invalid'); assert.equal(p.plan_type,'solo_pro'); assert.equal(p.is_approved,true);
    assert.equal((await db.query('SELECT personal_profile_is_active($1) allowed',[gift])).rows[0].allowed,true);
    assert.equal((await db.query('SELECT personal_profile_is_active($1) allowed',[explicitGift])).rows[0].allowed,true);
  });
  await pass('A repeated admin action reuses the request and checkout attempt', async () => {
    const before = (await db.query('SELECT * FROM hub_payment_requests')).rows[0];
    assert.equal((await db.query('SELECT require_hub_payment($1,$2) version',[profile,admin])).rows[0].version,version);
    const after = (await db.query('SELECT * FROM hub_payment_requests')).rows[0];
    assert.equal(after.checkout_attempt_id,before.checkout_attempt_id); assert.deepEqual(after.requested_at,before.requested_at);
  });
  await pass('Public hub content, links and booking availability are blocked by the gate', async () => {
    await db.query('INSERT INTO creator_availability VALUES($1,1)',[profile]);
    await db.query("UPDATE personal_profiles SET subscription_status='active' WHERE id=$1",[profile]);
    await db.exec('SET ROLE anon');
    assert.equal((await db.query("SELECT * FROM get_public_personal_profile('test-business')")).rows.length,0);
    assert.equal((await db.query('SELECT * FROM personal_links WHERE profile_id=$1',[profile])).rows.length,0);
    assert.equal((await db.query('SELECT * FROM creator_availability WHERE creator_id=$1',[profile])).rows.length,0);
    await assert.rejects(() => db.query("INSERT INTO personal_analytics(profile_id,event_type) VALUES($1,'profile_visit')",[profile]), /row-level security/);
    await db.exec('RESET ROLE');
    await db.query("UPDATE personal_profiles SET subscription_status='trialing' WHERE id=$1",[profile]);
  });
  await pass('Owner content edits cannot remove the gate or self-activate billing', async () => {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[owner]); await db.exec('SET ROLE authenticated');
    await db.query("UPDATE personal_profiles SET full_name='Test Business' WHERE id=$1",[profile]);
    for (const change of ["payment_state='unknown_manual'","subscription_status='active'","stripe_subscription_id='sub_fake'"]) await assert.rejects(() => db.query(`UPDATE personal_profiles SET ${change} WHERE id=$1`,[profile]),/managed by TapAway/);
    await db.exec('RESET ROLE');
  });
  const event = async (name, cls, validated, linkId=null, url=null) => db.query("INSERT INTO analytics_hits VALUES($1,$2,'2026-09-01',$3,$4,$5)",[profile,name,validated,cls,{link_id:linkId,link_url:url}]);
  await event('hub_view','human',true); await event('hub_view','human',true);
  for (const cls of ['bot','preview','internal','dev']) await event('hub_view',cls,true);
  await event('hub_view','human',false);
  for (const id of [uid(20),uid(21),uid(22),uid(23)]) await event('link_click','human',true,id);
  await event('link_click','bot',false,uid(20)); await event('contact_save','human',true);
  await db.query("INSERT INTO personal_analytics VALUES($1,'profile_visit',$2,'2026-08-01'),($1,'profile_visit',$3,'2026-08-01'),($1,'profile_visit',$2,'2026-09-02')",[profile,{userAgent:'Mozilla/5.0 Safari/605.1.15',referrer:''},{userAgent:'Googlebot',referrer:''}]);
  await pass('Offer metrics use validated human traffic and keep old historical views separate', async () => {
    const offer = (await db.query("SELECT get_hub_payment_offer('TEST-BUSINESS') offer")).rows[0].offer;
    assert.equal(offer.displayName,'Test Business'); assert.equal(offer.requestVersion,version); assert.equal(offer.amount,2000); assert.equal(offer.cardQuantity,4);
    assert.deepEqual([offer.metrics.views,offer.metrics.linkClicks,offer.metrics.googleClicks,offer.metrics.yelpClicks,offer.metrics.instagramClicks,offer.metrics.directionsClicks,offer.metrics.contactSaves,offer.metrics.historicalViews],[2,4,1,1,1,1,1,1]);
    const serialized=JSON.stringify(offer); assert.ok(!serialized.includes('private@example.invalid')); assert.ok(!serialized.includes(owner)); assert.ok(!serialized.includes('Mozilla')); assert.ok(!serialized.includes('session_id'));
    assert.equal((await db.query("SELECT get_hub_payment_offer('existing-gift') offer")).rows[0].offer,null);
  });
  await db.query("UPDATE hub_payment_requests SET stripe_checkout_session_id='cs_test_example' WHERE profile_id=$1",[profile]);
  const fulfill = (v=version,session='cs_test_example',sub='sub_example') => db.query('SELECT fulfill_hub_payment($1,$2,$3,$4,$5,$6) result',[profile,v,session,sub,'cus_example','buyer@example.invalid']);
  await pass('Unbound, stale and malformed payment proofs cannot activate a hub', async () => {
    await assert.rejects(() => fulfill(uid(44)),/does not match/); await assert.rejects(() => fulfill(version,'cs_test_other'),/does not match/);
    await assert.rejects(() => fulfill(version,'cs_test_example','not-subscription'),/Invalid verified payment/);
    assert.equal((await db.query('SELECT personal_profile_is_active($1) allowed',[profile])).rows[0].allowed,false);
  });
  await pass('An admin approval change is respected even when a checkout later pays', async () => {
    await db.query('UPDATE personal_profiles SET is_approved=false WHERE id=$1',[profile]); await assert.rejects(() => fulfill(),/admin review/);
    assert.equal((await db.query('SELECT fulfilled_at FROM hub_payment_requests')).rows[0].fulfilled_at,null);
    await db.query('UPDATE personal_profiles SET is_approved=true WHERE id=$1',[profile]);
  });
  await pass('Bound payment restores the same hub without changing ownership or legacy plan', async () => {
    assert.deepEqual((await fulfill()).rows[0].result,{activated:true,alreadyFulfilled:false});
    const p=(await db.query('SELECT * FROM personal_profiles WHERE id=$1',[profile])).rows[0];
    assert.equal(p.payment_state,'paying'); assert.equal(p.subscription_status,'active'); assert.equal(p.stripe_subscription_id,'sub_example'); assert.equal(p.stripe_billing_email,'buyer@example.invalid'); assert.equal(p.email,'private@example.invalid'); assert.equal(p.user_id,owner); assert.equal(p.plan_type,'solo_pro');
    assert.equal((await db.query('SELECT personal_profile_is_active($1) allowed',[profile])).rows[0].allowed,true);
    assert.equal((await db.query("SELECT get_hub_payment_offer('test-business') offer")).rows[0].offer,null);
  });
  await pass('Webhook retries are idempotent and cannot replace the paid subscription', async () => {
    const paidAt=(await db.query('SELECT fulfilled_at FROM hub_payment_requests')).rows[0].fulfilled_at;
    assert.deepEqual((await fulfill()).rows[0].result,{activated:true,alreadyFulfilled:true});
    assert.deepEqual((await db.query('SELECT fulfilled_at FROM hub_payment_requests')).rows[0].fulfilled_at,paidAt);
    await assert.rejects(() => fulfill(version,'cs_test_example','sub_other'),/another subscription/);
    await assert.rejects(() => db.query('SELECT require_hub_payment($1,$2)',[profile,admin]),/cannot be paused/);
  });
  await pass('An old paid replay cannot reactivate a later canceled account', async () => {
    await db.query("UPDATE personal_profiles SET subscription_status='canceled',payment_state='canceled' WHERE id=$1",[profile]);
    await fulfill();
    assert.equal((await db.query('SELECT personal_profile_is_active($1) allowed',[profile])).rows[0].allowed,false);
    assert.equal((await db.query('SELECT subscription_status FROM personal_profiles WHERE id=$1',[profile])).rows[0].subscription_status,'canceled');
  });
  await pass('A verified hold affects only the matching fulfilled subscription', async () => {
    assert.equal((await db.query("SELECT hold_hub_payment_by_subscription('sub_other','refunded','evt_other') held")).rows[0].held,false);
    await assert.rejects(() => db.query("SELECT hold_hub_payment_by_subscription('sub_example','other','evt_bad')"),/Invalid verified/);
    assert.equal((await db.query("SELECT hold_hub_payment_by_subscription('sub_example','refunded','evt_refund') held")).rows[0].held,true);
    const r=(await db.query('SELECT * FROM hub_payment_requests')).rows[0];
    assert.ok(r.payment_hold_at); assert.equal(r.payment_hold_reason,'refunded'); assert.equal(r.payment_hold_event_id,'evt_refund');
    assert.equal((await db.query('SELECT personal_profile_is_active($1) allowed',[gift])).rows[0].allowed,true);
    assert.equal((await db.query('SELECT payment_state FROM personal_profiles WHERE id=$1',[profile])).rows[0].payment_state,'payment_required');
  });
  await pass('Held payments cannot replay fulfillment, expose checkout offers or reopen the public hub', async () => {
    await assert.rejects(() => fulfill(),/requires admin review/);
    await db.query("UPDATE personal_profiles SET subscription_status='active' WHERE id=$1",[profile]);
    assert.equal((await db.query('SELECT personal_profile_is_active($1) allowed',[profile])).rows[0].allowed,false);
    assert.equal((await db.query("SELECT get_hub_payment_offer('test-business') offer")).rows[0].offer,null);
    const before=(await db.query('SELECT payment_hold_at FROM hub_payment_requests')).rows[0].payment_hold_at;
    assert.equal((await db.query("SELECT hold_hub_payment_by_subscription('sub_example','disputed','evt_dispute') held")).rows[0].held,true);
    assert.deepEqual((await db.query('SELECT payment_hold_at FROM hub_payment_requests')).rows[0].payment_hold_at,before);
  });
  await db.close(); console.log(`${checks} hub payment database checks passed.`);
})().catch(e => { console.error(e); process.exitCode=1; });
