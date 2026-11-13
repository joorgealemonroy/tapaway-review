// Actual migration behavior in isolated PostgreSQL; never touches live hubs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(path.join(process.env.QA_MODULES, '@electric-sql/pglite'));
const root = path.join(__dirname, '..');
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const owner = uid(1), rep = uid(2), admin = uid(99), hub = '2a19029b-7ed9-46e4-bd6f-6416b39bf9a5', restaurant = uid(20);
let checks = 0;
const pass = async (name, fn) => { await fn(); checks++; console.log('PASS ' + name); };
(async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('request.jwt.claim.role',true)$$;
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$SELECT auth.uid()='${admin}'::uuid$$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    CREATE TABLE personal_profiles(id uuid PRIMARY KEY,user_id uuid,username text UNIQUE NOT NULL,is_approved boolean DEFAULT false,sales_rep_id uuid,full_name text DEFAULT '',subscription_status text DEFAULT 'active',payment_state text DEFAULT 'complimentary',stripe_subscription_id text,plan_type text DEFAULT 'solo_pro');
    CREATE TABLE restaurants(id uuid PRIMARY KEY,owner_id uuid,custom_slug text UNIQUE,is_approved boolean DEFAULT false,restaurant_name text,subscription_status text DEFAULT 'active');
    CREATE TABLE nfc_cards(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_user_id uuid,destination_type text,destination_value text);
    CREATE TABLE admin_audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),admin_user_id uuid NOT NULL,action text,target_type text,target_id text,details jsonb);
    ALTER TABLE personal_profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_profile_access ON personal_profiles FOR ALL TO authenticated USING (user_id=auth.uid() OR sales_rep_id=auth.uid() OR is_admin()) WITH CHECK (user_id=auth.uid() OR sales_rep_id=auth.uid() OR is_admin());
    CREATE POLICY fixture_restaurant_access ON restaurants FOR ALL TO authenticated USING (owner_id=auth.uid() OR is_admin()) WITH CHECK (owner_id=auth.uid() OR is_admin());
    GRANT SELECT,INSERT,UPDATE ON personal_profiles,restaurants TO authenticated;
    GRANT ALL ON personal_profiles,restaurants,nfc_cards TO service_role;
  `);
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261113003000_admin_hub_slugs.sql'), 'utf8');
  await db.exec(migration);
  await db.exec(migration);
  await db.query("INSERT INTO personal_profiles(id,user_id,username,is_approved,sales_rep_id) VALUES($1,$2,'greensleevessteakhous',true,$3),($4,$2,'another-hub',true,NULL),($5,$2,'draft-hub',false,$3)", [hub, owner, rep, uid(11), uid(12)]);
  await db.query("INSERT INTO restaurants(id,owner_id,custom_slug,is_approved) VALUES($1,$2,'restaurant-hub',true)", [restaurant, owner]);
  await db.query("INSERT INTO nfc_cards(owner_user_id,destination_type,destination_value) VALUES($1,'profile','greensleevessteakhous'),($2,'profile','greensleevessteakhous'),($1,'url','greensleevessteakhous')", [owner, rep]);
  const asRole = async (role, user, fn) => {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)", [user || '', role]);
    await db.exec(`SET ROLE ${role}`);
    try { return await fn(); } finally { await db.exec('RESET ROLE'); await db.exec("SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claim.role','',false)"); }
  };
  const rename = (id, slug, user = admin, table = 'personal_profiles') => asRole('authenticated', user, () => db.query(`UPDATE ${table} SET ${table === 'personal_profiles' ? 'username' : 'custom_slug'}=$2 WHERE id=$1 RETURNING *`, [id, slug]));
  const row = () => db.query('SELECT * FROM personal_profiles WHERE id=$1', [hub]).then(r => r.rows[0]);
  const redirect = slug => asRole('anon', null, () => db.query('SELECT get_hub_slug_redirect($1) target', [slug]).then(r => r.rows[0].target));
  await pass('Approved slugs cannot be changed by owners or reps through direct table requests', async () => {
    for (const user of [owner, rep]) await assert.rejects(() => rename(hub, 'forbidden', user), /Only an administrator/);
    await assert.rejects(() => rename(restaurant, 'forbidden', owner, 'restaurants'), /Only an administrator/);
    await asRole('authenticated', owner, () => db.query("UPDATE personal_profiles SET full_name='' WHERE id=$1", [hub]));
    assert.equal((await row()).username, 'greensleevessteakhous');
  });
  await pass('Admin rename retains the exact hub, billing and approval; sync uses its owner rather than the admin', async () => {
    const before = await row();
    await rename(hub, ' Greensleeves ');
    assert.deepEqual(await row(), { ...before, username: 'greensleeves' });
    assert.equal(await redirect('greensleevessteakhous'), 'greensleeves');
    assert.equal((await db.query("SELECT count(*)::int n FROM nfc_cards WHERE destination_value='greensleeves'")).rows[0].n, 1);
    assert.equal((await db.query("SELECT count(*)::int n FROM nfc_cards WHERE destination_value='greensleevessteakhous'")).rows[0].n, 2);
    assert.deepEqual((await db.query("SELECT details FROM admin_audit_log WHERE action='change_hub_slug'")).rows[0].details, { previous_slug: 'greensleevessteakhous', slug: 'greensleeves' });
  });
  await pass('Collisions across both tables, old URLs, reserved routes and invalid slugs fail without partial writes', async () => {
    for (const slug of ['another-hub','restaurant-hub','admin','claim','cafes','','a'.repeat(81),'bad/path',null]) await assert.rejects(() => rename(hub, slug), /already in use|reserved|80 characters/);
    await assert.rejects(() => rename(uid(11), 'greensleevessteakhous'), /already in use/);
    await asRole('authenticated', owner, () => assert.rejects(() => db.query("INSERT INTO personal_profiles(id,user_id,username) VALUES($1,$2,'greensleevessteakhous')", [uid(13),owner]), /already in use/));
    assert.equal((await row()).username, 'greensleeves');
    assert.equal((await db.query('SELECT count(*)::int n FROM hub_slug_redirects')).rows[0].n, 1);
    await asRole('anon', null, async () => {
      for (const slug of ['greensleevessteakhous','greensleeves','restaurant-hub','admin']) assert.equal((await db.query('SELECT is_username_available($1) available', [slug])).rows[0].available, false);
      assert.equal((await db.query("SELECT is_username_available('available-hub') available")).rows[0].available, true);
      await assert.rejects(() => db.query('SELECT * FROM hub_slug_redirects'), /permission denied/);
    });
  });
  await pass('Repeated renames and reverting to an old URL produce direct, loop-free aliases', async () => {
    await rename(hub, 'greensleeves-new');
    assert.equal(await redirect('greensleevessteakhous'), 'greensleeves-new');
    assert.equal(await redirect('greensleeves'), 'greensleeves-new');
    await rename(hub, 'greensleeves');
    assert.equal(await redirect('greensleeves-new'), 'greensleeves');
    assert.equal(await redirect('greensleeves'), null);
    // Normalization alone must not write raw whitespace or create aliases.
    await rename(hub, ' GREENSLEEVES ');
    assert.equal((await row()).username, 'greensleeves');
  });
  await pass('Draft editing remains available to authorized reps; neither draft aliases nor private tables leak', async () => {
    await rename(uid(12), 'draft-renamed', rep);
    assert.equal(await redirect('draft-hub'), null);
    await asRole('authenticated', rep, () => assert.rejects(() => db.query("INSERT INTO hub_slug_redirects(slug,profile_id) VALUES('forged',$1)", [hub]), /permission denied/));
    await db.query('UPDATE personal_profiles SET is_approved=false WHERE id=$1', [hub]);
    assert.equal(await redirect('greensleevessteakhous'), null);
    await db.query('UPDATE personal_profiles SET is_approved=true WHERE id=$1', [hub]);
  });
  await pass('Existing server-generated long business slugs remain compatible', async () => {
    await db.query('INSERT INTO restaurants(id,owner_id,custom_slug) VALUES($1,$2,$3)', [uid(21),owner,'a'.repeat(50)+'-2']);
    assert.equal((await db.query('SELECT is_username_available($1) available',['b'.repeat(50)+'-2'])).rows[0].available,true);
  });
  await pass('Legacy restaurant hubs also support admin renaming with unchanged identity and retained URLs', async () => {
    await rename(restaurant, 'restaurant-new', admin, 'restaurants');
    assert.equal(await redirect('restaurant-hub'), 'restaurant-new');
    assert.equal((await db.query('SELECT owner_id FROM restaurants WHERE id=$1', [restaurant])).rows[0].owner_id, owner);
  });
  await pass('A card-update failure rolls back the slug and redirect in the same transaction', async () => {
    await db.exec("CREATE FUNCTION fixture_card_failure() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.destination_value='force-error' THEN RAISE EXCEPTION 'fixture card failure'; END IF; RETURN NEW; END$$; CREATE TRIGGER fixture_card_failure BEFORE UPDATE ON nfc_cards FOR EACH ROW EXECUTE FUNCTION fixture_card_failure()");
    await assert.rejects(() => rename(hub, 'force-error'), /fixture card failure/);
    assert.equal((await row()).username, 'greensleeves');
    assert.equal(await redirect('greensleeves'), null);
  });
  await pass('The exact Greensleeves operation checks its source and preserves every other field', async () => {
    await rename(hub, 'greensleevessteakhous');
    const operation = fs.readFileSync(path.join(root, 'scripts/ops/2026-11-13-greensleeves-slug.sql'), 'utf8');
    await db.exec(operation);
    assert.equal((await row()).username, 'greensleeves');
    assert.equal(await redirect('greensleevessteakhous'), 'greensleeves');
    await assert.rejects(() => db.exec(operation), /Expected exactly one/);
    await db.exec('ROLLBACK');
  });
  const reservedSource = fs.readFileSync(path.join(root, 'src/lib/reservedUsernames.ts'), 'utf8');
  await pass('Browser and database protect every static route and the same reserved names', async () => {
    const names = [...reservedSource.matchAll(/^\s*"([a-z-]+)"/gm)].map(m => m[1]);
    const routes = [...fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8').matchAll(/<Route path="\/([a-z-]+)(?:["/])/g)].map(m => m[1]);
    for (const name of new Set([...names, ...routes])) assert.equal((await db.query('SELECT hub_slug_is_reserved($1) reserved', [name])).rows[0].reserved, true, name);
  });
  await db.close();
  console.log(`${checks} admin slug database checks passed. No live records touched.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
