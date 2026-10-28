// Isolated real PostgreSQL compatibility and retry-state checks. No network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(path.join(process.env.QA_MODULES, '@electric-sql/pglite'));
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
let checks = 0;
const pass = async (name, run) => { await run(); checks++; console.log(`PASS ${name}`); };

(async () => {
  const journal = JSON.parse(read('drizzle/migrations/meta/_journal.json'));
  const entry = journal.entries.find(value => value.idx === 32);
  assert.ok(entry, 'Preparatory migration must remain registered at index 32');
  const prep = read(`drizzle/migrations/${entry.tag}.sql`);
  const twinTimestamp = new Date(entry.when).toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const retry = read('drizzle/migrations/0035_business_checkout_attempts.sql');
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE checkout_intents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,status text DEFAULT 'pending',stripe_subscription_id text);
    GRANT SELECT ON checkout_intents TO authenticated; GRANT ALL ON checkout_intents TO service_role;
    INSERT INTO checkout_intents(status,stripe_subscription_id) VALUES('associated','sub_fixture_existing');`);
  const original = (await db.query('SELECT * FROM checkout_intents')).rows;
  const permissions = () => db.query("SELECT grantee,privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='checkout_intents' ORDER BY grantee,privilege_type").then(result => result.rows);
  const originalPermissions = await permissions();

  await pass('Preparatory migration twins match and safely repeat without changing existing billing or permissions', async () => {
    assert.equal(prep, read(`supabase/migrations/${twinTimestamp}_business_checkout_preflight.sql`));
    assert.equal(entry.idx, 32);
    assert.ok(Number.isSafeInteger(entry.when));
    assert.ok(journal.entries[31].when < entry.when);
    await db.exec(prep); await db.exec(prep);
    assert.deepEqual((await db.query('SELECT id,user_id,status,stripe_subscription_id FROM checkout_intents')).rows, original);
    assert.deepEqual(await permissions(), originalPermissions);
    const fields = (await db.query("SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='checkout_intents' AND column_name NOT IN('id','user_id','status','stripe_subscription_id') ORDER BY column_name")).rows;
    assert.deepEqual(fields.map(field => field.column_name), ['checkout_attempt_hash','checkout_attempt_started_at','checkout_request_hash','checkout_return_origin','payment_hold_at','payment_hold_reason']);
    for (const field of fields) {
      assert.equal(field.is_nullable, 'YES'); assert.equal(field.column_default, null);
      assert.equal(field.data_type, field.column_name.endsWith('_at') ? 'timestamp with time zone' : 'text');
    }
    const row = (await db.query('SELECT * FROM checkout_intents')).rows[0];
    for (const field of fields) assert.equal(row[field.column_name], null);
  });

  await pass('Later retry migration stays repeatable after the additive preparation', async () => {
    assert.equal(retry, read('supabase/migrations/20261027120000_business_checkout_attempts.sql'));
    await db.exec(retry); await db.exec(retry);
    assert.deepEqual((await db.query('SELECT id,user_id,status,stripe_subscription_id FROM checkout_intents')).rows, original);
    assert.deepEqual(await permissions(), originalPermissions);
  });

  await pass('Duplicate attempts cannot create a second intent while legacy null attempts remain compatible', async () => {
    await db.exec("SET ROLE service_role; INSERT INTO checkout_intents(checkout_attempt_hash,checkout_request_hash) VALUES('fixture-retry','fixture-selection');");
    await assert.rejects(db.exec("INSERT INTO checkout_intents(checkout_attempt_hash) VALUES('fixture-retry')"), /unique|duplicate/i);
    await db.exec('INSERT INTO checkout_intents DEFAULT VALUES; INSERT INTO checkout_intents DEFAULT VALUES; RESET ROLE');
    assert.equal((await db.query('SELECT count(*)::int AS count FROM checkout_intents WHERE checkout_attempt_hash IS NULL')).rows[0].count, 3);
  });

  await pass('Browser roles cannot forge retry or payment-hold state or discover anonymous attempts', async () => {
    for (const role of ['authenticated', 'anon']) {
      await db.exec(`SET ROLE ${role}`);
      for (const changes of ["checkout_attempt_hash='forged'", "payment_hold_at=now()", "payment_hold_reason='refunded'"])
        await assert.rejects(db.exec(`UPDATE checkout_intents SET ${changes}`), /permission denied/i);
      await assert.rejects(db.exec("INSERT INTO checkout_intents(checkout_attempt_hash) VALUES('forged')"), /permission denied/i);
      if (role === 'anon') await assert.rejects(db.exec('SELECT checkout_attempt_hash FROM checkout_intents'), /permission denied/i);
      await db.exec('RESET ROLE');
    }
  });
  await db.close();
  console.log(`${checks} checkout retry database checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
