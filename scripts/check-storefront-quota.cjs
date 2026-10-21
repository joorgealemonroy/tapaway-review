/* Actual PostgreSQL limiter + actual edge/helper code. Provider and Auth
 * boundaries remain isolated; no network, email, SMS or live writes occur. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const ts = require('typescript');
const { PGlite } = require(path.join(process.env.QA_MODULES, '@electric-sql/pglite'));
const { environment, load, request } = require('./check-personal-commerce.cjs');
const root = path.join(__dirname, '..');
const digest = value => createHash('sha256').update(value).digest('hex');
let checks = 0;
const pass = async (name, run) => { await run(); checks++; console.log(`PASS ${name}`); };
const sqlFile = name => fs.readFileSync(path.join(root, name), 'utf8');

function configuredLimits() {
  const values = new Set();
  const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? walk(path.join(directory, entry.name)) : entry.name.endsWith('.ts') ? [path.join(directory, entry.name)] : []);
  function numbers(node) {
    if (ts.isNumericLiteral(node)) return [Number(node.text)];
    if (ts.isConditionalExpression(node)) return [...numbers(node.whenTrue), ...numbers(node.whenFalse)];
    return [];
  }
  for (const file of walk(path.join(root, 'supabase/functions'))) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = node => {
      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(source);
        if (name === 'takeQuota' || name === 'quota' && file.endsWith('/hub-payment-request/index.ts')) {
          const limit = node.arguments[2], found = numbers(limit);
          if (!found.length) assert.equal(limit.getText(source), 'limit', `Unreviewed dynamic quota in ${file}`);
          found.forEach(value => values.add(value));
        }
        if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'rpc'
            && node.arguments[0]?.text === 'storefront_take_quota') {
          for (const property of node.arguments[1]?.properties || []) {
            if (property.name?.getText(source) === '_limit' && property.initializer) numbers(property.initializer).forEach(value => values.add(value));
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return [...values].sort((a,b) => a-b);
}

(async () => {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT current_user::text$$;
    CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(bucket_id text);
    CREATE TABLE user_roles(user_id uuid,role text);
    CREATE TABLE personal_links(id uuid,profile_id uuid,link_type text,url text);
    CREATE TABLE personal_analytics(profile_id uuid,event_type text,visitor_info jsonb,created_at timestamptz);
    CREATE TABLE analytics_hits(hub_id uuid,event_name text,occurred_at timestamptz,is_validated boolean,traffic_class text,props jsonb);
    GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;`);
  await db.exec(sqlFile('scripts/fixtures/launch-schema.sql'));
  // Apply the entire existing storefront table migration, not a hand-written
  // imitation of its function. This reproduces the deployed limit mismatch.
  await db.exec(sqlFile('supabase/migrations/20261020090000_storefront_orders.sql'));
  await db.exec(sqlFile('drizzle/migrations/0029_hub_payment_requests.sql'));
  await db.exec(sqlFile('drizzle/migrations/0030_fix_hub_payment_offer_filter.sql'));
  const rpcCalls = [];
  function state() {
    const s = environment(); s.context.__mode='live'; s.context.Deno.serve = h => s.context.__handler = h;
    // RPCs execute the real stored PostgreSQL functions. No JavaScript counter
    // or stubbed quota result is used by the edge handler under test.
    s.db.rpc = async (name,args) => {
      rpcCalls.push({ name,args });
      try {
        if (name==='storefront_take_quota') return { data:(await db.query('SELECT public.storefront_take_quota($1,$2) value',[args._key,args._limit])).rows[0].value,error:null };
        if (name==='get_hub_payment_offer') return { data:(await db.query('SELECT public.get_hub_payment_offer($1) value',[args._slug])).rows[0].value,error:null };
        throw new Error(`Unexpected RPC ${name}`);
      } catch (error) { return { data:null,error }; }
    };
    return s;
  }
  const s=state(), handler=await load('supabase/functions/hub-payment-request/index.ts',s);
  await db.exec('SET ROLE service_role');
  await pass('Actual old PostgreSQL function reproduces the public hub summary 503', async () => {
    const result=await handler(request({action:'summary',slug:'no-offer'}));
    assert.equal(result.status,503);
    assert.ok(rpcCalls.some(c => c.name==='storefront_take_quota' && c.args._limit===300));
  });
  await db.exec('RESET ROLE');
  const preserved=digest('preserved-before-upgrade');
  await db.query('INSERT INTO storefront_quotas(quota_key,uses) VALUES($1,2)',[preserved]);
  const migration=sqlFile('supabase/migrations/20261021200000_storefront_quota_limits.sql');
  await pass('Correction matches the deployment copy and preserves existing quota counters', async () => {
    assert.equal(migration,sqlFile('drizzle/migrations/0031_storefront_quota_limits.sql'));
    await db.exec(migration);
    assert.equal((await db.query('SELECT uses FROM storefront_quotas WHERE quota_key=$1',[preserved])).rows[0].uses,2);
  });
  await pass('Only the server role can consume quotas or access their table', async () => {
    for (const role of ['anon','authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(() => db.query('SELECT storefront_take_quota($1,1)',[digest(role)]),/permission denied/);
      await assert.rejects(() => db.query('SELECT * FROM storefront_quotas'),/permission denied/);
      await assert.rejects(() => db.query('INSERT INTO storefront_quotas(quota_key,uses) VALUES($1,0)',[digest(role)]),/permission denied/);
      await db.exec('RESET ROLE');
    }
    const fn=(await db.query("SELECT prosecdef,proconfig FROM pg_proc WHERE oid='public.storefront_take_quota(text,integer)'::regprocedure")).rows[0];
    assert.equal(fn.prosecdef,true); assert.deepEqual(fn.proconfig,['search_path=public']);
    await db.exec('SET ROLE service_role');
    assert.equal((await db.query('SELECT storefront_take_quota($1,3) n',[preserved])).rows[0].n,3);
  });
  await pass('Null, malformed, noncanonical and out-of-range inputs fail closed', async () => {
    for (const [key,limit] of [[null,5],['',5],['a'.repeat(63),5],['g'.repeat(64),5],['A'.repeat(64),5],[digest('bad'),null],[digest('bad'),0],[digest('bad'),-1],[digest('bad'),20001]]) {
      await assert.rejects(() => db.query('SELECT storefront_take_quota($1,$2)',[key,limit]),/Invalid quota/);
    }
  });
  const limits=configuredLimits();
  await pass('Every configured edge quota fits the real SQL range, including all global budgets', async () => {
    assert.ok(limits.includes(150) && limits.includes(500) && limits.includes(1000) && limits.includes(2000) && limits.includes(10000) && limits.includes(20000));
    assert.equal(Math.max(...limits),20000);
    for (const limit of limits) {
      assert.ok(limit>=1 && limit<=20000);
      assert.equal((await db.query('SELECT storefront_take_quota($1,$2) n',[digest(`configured:${limit}`),limit])).rows[0].n,1);
    }
  });
  await pass('Concurrent consumes stop at the exact cap and rejected attempts cannot increment it', async () => {
    const key=digest('concurrent'),results=await Promise.all(Array.from({length:40},() => db.query('SELECT storefront_take_quota($1,7) n',[key])));
    const values=results.map(r => r.rows[0].n);
    assert.deepEqual(values.filter(v => v>0).sort((a,b)=>a-b),[1,2,3,4,5,6,7]);
    assert.equal(values.filter(v => v===-1).length,33);
    for(let i=0;i<5;i++)assert.equal((await db.query('SELECT storefront_take_quota($1,7) n',[key])).rows[0].n,-1);
    assert.equal((await db.query('SELECT uses FROM storefront_quotas WHERE quota_key=$1',[key])).rows[0].uses,7);
  });
  await pass('Daily cleanup retains current counters and the existing two-day retention window', async () => {
    const old=digest('old-window'),recent=digest('recent-window');
    await db.query('INSERT INTO storefront_quotas VALUES($1,current_date-3,10),($2,current_date-2,10)',[old,recent]);
    await db.query('SELECT storefront_take_quota($1,3)',[digest('cleanup-trigger')]);
    assert.equal((await db.query('SELECT count(*) n FROM storefront_quotas WHERE quota_key=$1',[old])).rows[0].n,0);
    assert.equal((await db.query('SELECT uses FROM storefront_quotas WHERE quota_key=$1',[recent])).rows[0].uses,10);
    assert.equal((await db.query('SELECT uses FROM storefront_quotas WHERE quota_key=$1',[preserved])).rows[0].uses,3);
  });
  await pass('Actual hub summary succeeds against SQL quotas and the real no-offer function', async () => {
    const result=await handler(request({action:'summary',slug:'no-offer'}));
    assert.equal(result.status,200); assert.deepEqual(await result.json(),{offer:null});
    assert.ok(rpcCalls.some(c => c.name==='storefront_take_quota' && c.args._limit===20000));
    assert.equal(s.db.quota.size,0); assert.equal(s.calls.checkout.length,0);
  });
  await pass('Actual checkout for an unknown offer returns 409 without contacting Stripe', async () => {
    assert.equal((await handler(request({action:'checkout',slug:'no-offer'}))).status,409);
    assert.equal(s.calls.checkout.length,0);
  });
  delete s.context.__handler;
  const access=await load('supabase/functions/_shared/accountAccess.ts',s);
  const quotaKey=(scope,identity) => digest(`${s.env.SUPABASE_SERVICE_ROLE_KEY}:${new Date().toISOString().slice(0,10)}:${scope}:${identity}`);
  await pass('Actual account-access email helper can consume its real 1,000-send global budget', async () => {
    assert.equal(await access.allowAccessEmail(request({},'192.0.2.40'),'quota-one@example.invalid'),true);
    const key=quotaKey('access-mail-budget','all');
    assert.equal((await db.query('SELECT uses FROM storefront_quotas WHERE quota_key=$1',[key])).rows[0].uses,1);
    await db.query('UPDATE storefront_quotas SET uses=1000 WHERE quota_key=$1',[key]);
    assert.equal(await access.allowAccessEmail(request({},'192.0.2.41'),'quota-two@example.invalid'),false);
    assert.equal((await db.query('SELECT uses FROM storefront_quotas WHERE quota_key=$1',[key])).rows[0].uses,1000);
    assert.equal(s.calls.emails.length,0);
  });
  await pass('Actual account verification consumes its 10,000-check budget and rejects exhaustion', async () => {
    assert.equal(await access.allowAccessVerification(request({},'192.0.2.42'),'verify-one@example.invalid'),true);
    const key=quotaKey('access-verify-budget','all');
    await db.query('UPDATE storefront_quotas SET uses=10000 WHERE quota_key=$1',[key]);
    assert.equal(await access.allowAccessVerification(request({},'192.0.2.43'),'verify-two@example.invalid'),false);
    assert.equal((await db.query('SELECT uses FROM storefront_quotas WHERE quota_key=$1',[key])).rows[0].uses,10000);
  });
  await pass('Actual hub handler returns 429, not a new allowance, when its durable quota is exhausted', async () => {
    const key=quotaKey('hub-payment:summary','192.0.2.1');
    await db.query('UPDATE storefront_quotas SET uses=300 WHERE quota_key=$1',[key]);
    assert.equal((await handler(request({action:'summary',slug:'no-offer'}))).status,429);
    assert.equal((await db.query('SELECT uses FROM storefront_quotas WHERE quota_key=$1',[key])).rows[0].uses,300);
  });
  await db.exec('RESET ROLE');
  await db.close();
  console.log(`${checks} PostgreSQL quota integration checks passed. Configured limits: ${limits.join(', ')}. No external services contacted.`);
})().catch(error => { console.error(error); process.exitCode=1; });
