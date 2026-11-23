// Isolated PostgreSQL behavior checks. No live records, network, or providers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
if (!process.env.QA_MODULES) throw new Error('Set QA_MODULES to the isolated test dependencies directory.');
const { PGlite } = require(path.join(process.env.QA_MODULES, '@electric-sql/pglite'));
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let checks = 0;
const pass = async (name, work) => { await work(); console.log('PASS ' + name); checks++; };

(async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role BYPASSRLS;
      CREATE ROLE outsider;
      CREATE TABLE public.personal_profiles (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL,
        subscription_status text DEFAULT 'active',
        is_approved boolean DEFAULT true,
        payment_state text DEFAULT 'paying',
        trial_ends_at timestamptz,
        created_at timestamptz DEFAULT now(),
        stripe_subscription_id text
      );
    `);
    // Run the actual access predicates so approved gifts and paused billing
    // exercise the same server gate as the public hub.
    for (const [file, name] of [
      ['supabase/migrations/20261021190000_hub_payment_requests.sql', 'hub_access_allowed'],
      ['supabase/migrations/20261021120000_launch_hardening.sql', 'personal_profile_is_active'],
    ]) {
      const source = read(file);
      const start = source.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
      assert.ok(start >= 0, `Missing real access function: ${name}`);
      await db.exec(source.slice(start, source.indexOf('$$;', start) + 3));
    }
    const migration = read('supabase/migrations/20261123050000_profile_reviews.sql');
    await db.exec(migration);

    const a = uid(10), b = uid(11), disabled = uid(12), unconfigured = uid(13);
    const inactive = uid(14), unapproved = uid(15), gift = uid(16), fast = uid(17), daily = uid(18), longFeed = uid(19);
    const owner = uid(1);
    for (const id of [a, b, disabled, unconfigured, inactive, unapproved, gift, fast, daily, longFeed]) {
      await db.query('INSERT INTO personal_profiles (id,user_id) VALUES ($1,$2)', [id, owner]);
      if (id !== unconfigured) await db.query('INSERT INTO profile_review_settings (profile_id,enabled) VALUES ($1,$2)', [id, id !== disabled]);
    }
    await db.query("UPDATE personal_profiles SET payment_state='payment_required' WHERE id=$1", [inactive]);
    await db.query('UPDATE personal_profiles SET is_approved=false WHERE id=$1', [unapproved]);
    await db.query("UPDATE personal_profiles SET subscription_status='canceled',payment_state='complimentary' WHERE id=$1", [gift]);

    const asRole = async (role, work) => {
      await db.exec(`SET ROLE ${role}`);
      try { return await work(); } finally { await db.exec('RESET ROLE'); }
    };
    const submit = (profile, rating, comment, visitor, key, role = 'anon') => asRole(role, () => db.query(
      'SELECT public.submit_profile_review($1,$2,$3,$4,$5) id', [profile, rating, comment, visitor, key],
    ).then(result => result.rows[0].id));
    const feed = (profile, limit = 5, offset = 0, role = 'anon') => asRole(role, () => db.query(
      'SELECT public.get_public_profile_reviews($1,$2,$3) data', [profile, limit, offset],
    ).then(result => result.rows[0].data));
    const denied = work => assert.rejects(work, /permission denied/);
    const invalid = (work, message) => assert.rejects(work, error => error.code === '22023' && message.test(error.message));
    const limited = (work, message) => assert.rejects(work, error => error.code === 'P0001' && message.test(error.message));
    const disabledFeed = { enabled: false, total: 0, average: null, reviews: [], has_more: false };

    await pass('Both migration paths match and enabling reviews requires an explicit configuration change', async () => {
      assert.equal(migration, read('drizzle/migrations/0052_profile_reviews.sql'));
      assert.equal(JSON.parse(read('drizzle/migrations/meta/_journal.json')).entries.find(entry => entry.idx === 52).tag, '0052_profile_reviews');
      assert.deepEqual(await feed(unconfigured), disabledFeed);
      assert.deepEqual(await feed(disabled), disabledFeed);
      assert.deepEqual(await feed(a), { enabled: true, total: 0, average: null, reviews: [], has_more: false });
    });

    await pass('Anonymous and authenticated users cannot read or mutate private storage or enable another hub', async () => {
      for (const role of ['anon', 'authenticated']) {
        await asRole(role, async () => {
          await db.query("SELECT set_config('request.jwt.claim.role','service_role',false)");
          for (const table of ['profile_reviews', 'profile_review_settings']) {
            await denied(() => db.query(`SELECT * FROM public.${table}`));
            await denied(() => db.query(`DELETE FROM public.${table}`));
          }
          await denied(() => db.query('INSERT INTO profile_review_settings (profile_id,enabled) VALUES ($1,true)', [unconfigured]));
          await denied(() => db.query('UPDATE profile_review_settings SET enabled=true WHERE profile_id=$1', [disabled]));
          await denied(() => db.query('INSERT INTO profile_reviews (profile_id,rating,visitor_id,submission_id) VALUES ($1,5,$2,$3)', [a, uid(101), uid(201)]));
          await denied(() => db.query('UPDATE profile_reviews SET rating=5'));
        });
      }
      await asRole('outsider', async () => {
        await denied(() => db.query('SELECT public.get_public_profile_reviews($1)', [a]));
        await denied(() => db.query('SELECT public.submit_profile_review($1,5,NULL,$2,$3)', [a, uid(101), uid(201)]));
      });
      const rows = (await db.query("SELECT relname,relrowsecurity FROM pg_class WHERE relname IN ('profile_review_settings','profile_reviews')")).rows;
      assert.equal(rows.length, 2);
      assert.ok(rows.every(row => row.relrowsecurity));
    });

    await pass('Active approved access is required for both RPCs, while an approved gift can receive reviews', async () => {
      for (const profile of [disabled, unconfigured, inactive, unapproved, uid(999)]) {
        assert.deepEqual(await feed(profile), disabledFeed);
        await invalid(() => submit(profile, 4, null, uid(100), uid(200)), /unavailable/);
      }
      const giftId = await submit(gift, 4, 'Thank you!', uid(100), uid(200));
      assert.equal((await feed(gift)).reviews[0].id, giftId);
      assert.equal((await feed(gift)).average, 4);
    });

    let originalId;
    await pass('All five scores persist without names or contact fields; written feedback is optional and public', async () => {
      const comments = [null, '', '  \n\t ', '  Helpful pickup team.  ', '🍲'.repeat(600)];
      for (let rating = 1; rating <= 5; rating++) {
        const id = await submit(a, rating, comments[rating - 1], uid(100 + rating), uid(200 + rating), rating === 4 ? 'authenticated' : 'anon');
        if (rating === 1) originalId = id;
      }
      const result = await feed(a);
      assert.equal(result.total, 5);
      assert.equal(result.average, 3);
      assert.equal(result.has_more, false);
      assert.deepEqual(result.reviews.map(review => review.rating).sort(), [1, 2, 3, 4, 5]);
      assert.equal(result.reviews.filter(review => review.comment === null).length, 3);
      assert.equal(result.reviews.find(review => review.rating === 4).comment, 'Helpful pickup team.');
      assert.equal(Array.from(result.reviews.find(review => review.rating === 5).comment).length, 600);
      for (const review of result.reviews) {
        assert.deepEqual(Object.keys(review).sort(), ['comment', 'created_at', 'id', 'rating']);
        assert.ok(Number.isFinite(Date.parse(review.created_at)));
      }
      assert.equal((await feed(b)).total, 0, 'Other hubs must not inherit reviews');
    });

    await pass('Server validation rejects invalid scores, missing identifiers, and oversized Unicode feedback', async () => {
      for (const rating of [null, 0, -1, 6, 100]) {
        await invalid(() => submit(a, rating, null, uid(110), uid(210)), /1 to 5/);
      }
      await assert.rejects(() => submit(a, 1.5, null, uid(110), uid(210)), /integer|syntax/);
      await invalid(() => submit(a, 5, '🍲'.repeat(601), uid(110), uid(210)), /600 characters/);
      await invalid(() => submit(a, 5, 'a'.repeat(601), uid(110), uid(210)), /600 characters/);
      await invalid(() => submit(a, 5, null, null, uid(210)), /Refresh/);
      await invalid(() => submit(a, 5, null, uid(110), null), /Refresh/);
      await invalid(() => submit(null, 5, null, uid(110), uid(210)), /Refresh/);
      assert.equal((await feed(a)).total, 5);
    });

    await pass('Retries are idempotent and cannot replace a published review or use another visitor’s key', async () => {
      assert.equal(await submit(a, 1, null, uid(101), uid(201)), originalId);
      assert.equal(await submit(a, 5, 'Changed after posting', uid(101), uid(201)), originalId);
      assert.deepEqual((await feed(a)).reviews.find(review => review.id === originalId).rating, 1);
      assert.equal((await feed(a)).total, 5);
      await invalid(() => submit(a, 5, null, uid(110), uid(201)), /Refresh/);
      await limited(() => submit(a, 5, null, uid(101), uid(299)), /24 hours/);
      await submit(b, 2, 'Another hub', uid(101), uid(201));
      assert.equal((await feed(b)).total, 1);
      assert.equal((await feed(b)).average, 2);
      assert.equal((await feed(a)).total, 5);
    });

    await pass('Cooldown expires after a day and disabling a hub hides stored reviews without deleting them', async () => {
      await db.query("UPDATE profile_reviews SET created_at=now()-interval '25 hours' WHERE id=$1", [originalId]);
      await submit(a, 4, 'New experience', uid(101), uid(299));
      assert.equal((await feed(a)).total, 6);
      assert.equal((await feed(a)).average, 3.2);
      await db.query('UPDATE profile_review_settings SET enabled=false WHERE profile_id=$1', [a]);
      assert.deepEqual(await feed(a), disabledFeed);
      await invalid(() => submit(a, 1, null, uid(101), uid(201)), /unavailable/);
      assert.equal((await db.query('SELECT count(*)::int n FROM profile_reviews WHERE profile_id=$1', [a])).rows[0].n, 6);
      await db.query('UPDATE profile_review_settings SET enabled=true WHERE profile_id=$1', [a]);
      await db.query("UPDATE personal_profiles SET payment_state='payment_required' WHERE id=$1", [a]);
      assert.deepEqual(await feed(a), disabledFeed);
      await invalid(() => submit(a, 4, null, uid(111), uid(211)), /unavailable/);
      await db.query("UPDATE personal_profiles SET payment_state='paying' WHERE id=$1", [a]);
      assert.equal((await feed(a)).total, 6);
    });

    await pass('Profile velocity caps bound rotating visitor IDs while valid retries stay successful', async () => {
      let first;
      for (let i = 0; i < 30; i++) {
        const id = await submit(fast, 3, null, uid(1000 + i), uid(2000 + i));
        if (i === 0) first = id;
      }
      await limited(() => submit(fast, 3, null, uid(1030), uid(2030)), /busy/);
      assert.equal(await submit(fast, 3, null, uid(1000), uid(2000)), first);
      assert.equal((await feed(fast)).total, 30);
      await db.query(`INSERT INTO profile_reviews (profile_id,rating,visitor_id,submission_id,created_at)
        SELECT $1,3,gen_random_uuid(),gen_random_uuid(),now()-interval '20 minutes' FROM generate_series(1,300)`, [daily]);
      await limited(() => submit(daily, 3, null, uid(1031), uid(2031)), /busy/);
      assert.equal((await feed(daily)).total, 300);
      await db.query("UPDATE profile_reviews SET created_at=now()-interval '25 hours' WHERE profile_id=$1", [daily]);
      await submit(daily, 3, null, uid(1031), uid(2031));
      assert.equal((await feed(daily)).total, 301);
    });

    await pass('Public pagination is bounded, stable, hub-scoped, and keeps full-feed aggregates', async () => {
      const first = await feed(a, 3, 0);
      const second = await feed(a, 3, 3);
      assert.equal(first.total, 6);
      assert.equal(second.total, 6);
      assert.equal(first.average, 3.2);
      assert.equal(second.average, 3.2);
      assert.equal(first.has_more, true);
      assert.equal(second.has_more, false);
      assert.equal(new Set([...first.reviews, ...second.reviews].map(review => review.id)).size, 6);
      assert.equal((await feed(a, 3, 6)).reviews.length, 0);
      assert.equal((await feed(a, 3, 6)).has_more, false);
      assert.equal((await feed(fast, 999, -10)).reviews.length, 20);
      assert.equal((await feed(fast, 999, 20)).reviews.length, 10);
      assert.equal((await feed(fast, 0, null)).reviews.length, 1);
      assert.equal((await feed(fast, null, null)).reviews.length, 5);
      assert.equal((await feed(fast, 5, 2147483647)).reviews.length, 0);
    });

    await pass('A long-lived hub can paginate beyond 10,000 reviews without repeating the same page', async () => {
      await db.query(`INSERT INTO profile_reviews (profile_id,rating,visitor_id,submission_id,created_at)
        SELECT $1,4,gen_random_uuid(),gen_random_uuid(),now()-interval '25 hours' FROM generate_series(1,10023)`, [longFeed]);
      const before = await feed(longFeed, 20, 9998);
      const after = await feed(longFeed, 20, 10018);
      assert.equal(before.total, 10023);
      assert.equal(before.reviews.length, 20);
      assert.equal(before.has_more, true);
      assert.equal(after.reviews.length, 5);
      assert.equal(after.has_more, false);
      assert.equal(new Set([...before.reviews, ...after.reviews].map(review => review.id)).size, 25);
      assert.equal((await feed(longFeed, 20, 10023)).has_more, false);
    });

    console.log(`${checks} profile-review database checks passed. No external traffic.`);
  } finally {
    await db.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
