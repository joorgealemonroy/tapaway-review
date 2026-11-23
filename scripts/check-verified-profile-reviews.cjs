// Actual review edge handler plus isolated PostgreSQL; all SMS traffic is mocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { PGlite } = require(path.join(process.env.QA_MODULES, '@electric-sql/pglite'));
const { environment, load, request } = require('./check-personal-commerce.cjs');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const uid = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const hash = value => createHash('sha256').update(value).digest('hex');
let checks = 0;
const pass = async (name, work) => { await work(); console.log('PASS ' + name); checks++; };

(async () => {
  const pg = new PGlite();
  try {
    await pg.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
      CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
      CREATE TABLE personal_profiles(id uuid PRIMARY KEY,user_id uuid NOT NULL,subscription_status text DEFAULT 'active',is_approved boolean DEFAULT true,payment_state text DEFAULT 'paying',trial_ends_at timestamptz,created_at timestamptz DEFAULT now(),stripe_subscription_id text);
      CREATE TABLE personal_email_captures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid NOT NULL REFERENCES personal_profiles(id),name text,phone text,email text,message text,created_at timestamptz DEFAULT now(),sms_opt_in boolean DEFAULT false,sms_opt_in_at timestamptz,sms_marketing_opt_in boolean DEFAULT false,sms_marketing_opt_in_at timestamptz,sms_transactional_opt_in boolean DEFAULT false,sms_transactional_opt_in_at timestamptz);
      CREATE TABLE sms_campaigns(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid NOT NULL REFERENCES personal_profiles(id),message text,recipient_count integer DEFAULT 0,success_count integer DEFAULT 0,failure_count integer DEFAULT 0,created_at timestamptz DEFAULT now());
      CREATE TABLE restaurant_sms_subscribers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),phone text,sms_opt_in boolean DEFAULT false,sms_opt_in_at timestamptz);
    `);
    for (const [file, name] of [
      ['supabase/migrations/20261021190000_hub_payment_requests.sql', 'hub_access_allowed'],
      ['supabase/migrations/20261021120000_launch_hardening.sql', 'personal_profile_is_active'],
      ['supabase/migrations/20261028031359_public_access_and_reservations.sql', 'guard_public_intake_authority'],
      ['supabase/migrations/20260920130000_intake_velocity_throttles.sql', 'throttle_public_intake'],
    ]) {
      const source = read(file), start = source.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
      assert.ok(start >= 0); await pg.exec(source.slice(start, source.indexOf('$$;', start) + 3));
      if (name.startsWith('guard_') || name.startsWith('throttle_')) await pg.exec(`CREATE TRIGGER fixture_${name} BEFORE INSERT ON personal_email_captures FOR EACH ROW EXECUTE FUNCTION ${name}()`);
    }
    for (const file of ['20261112060000_profile_locations_and_sms.sql', '20261123050000_profile_reviews.sql', '20261123060000_verified_profile_reviews.sql']) await pg.exec(read('supabase/migrations/' + file));
    assert.equal(read('supabase/migrations/20261123060000_verified_profile_reviews.sql'), read('drizzle/migrations/0053_verified_profile_reviews.sql'));
    const a = uid(10), b = uid(11), off = uid(12), noSms = uid(13), owner = uid(1);
    for (const id of [a, b, off, noSms]) {
      await pg.query('INSERT INTO personal_profiles(id,user_id) VALUES($1,$2)', [id, owner]);
      await pg.query('INSERT INTO profile_review_settings(profile_id,enabled) VALUES($1,$2)', [id, id !== off]);
      if (id !== noSms) await pg.query("INSERT INTO profile_sms_programs(profile_id,brand_name,frequency_text,terms_url,privacy_url) VALUES($1,'A.V. Meal Preps','Message frequency varies.','https://example.invalid/terms','https://example.invalid/privacy')", [id]);
    }

    const parameters = {
      get_profile_review_config: ['p_profile_id'],
      create_profile_review_challenge: ['p_profile_id','p_phone','p_challenge_id','p_code_hash','p_otp_consent','p_otp_consent_version','p_user_agent'],
      mark_profile_review_code_sent: ['p_profile_id','p_challenge_id'],
      profile_review_otp_allowed: ['p_phone'], suppress_profile_review_otp: ['p_phone'],
      verify_profile_review_challenge: ['p_profile_id','p_challenge_id','p_code_hash','p_verification_id','p_token_hash'],
      get_profile_review_session: ['p_profile_id','p_token_hash'],
      save_verified_profile_review: ['p_profile_id','p_token_hash','p_rating','p_comment','p_submission_id','p_request_hash','p_marketing_consent','p_consent_version','p_user_agent'],
    };
    async function makeState() {
      const s = environment();
      Object.assign(s.env, { SUPABASE_URL:'https://database.invalid', TWILIO_API_KEY:'fixture', TWILIO_FROM_NUMBER:'+12025550180', REVIEW_OTP_ENABLED:'true' });
      const original = s.db.rpc.bind(s.db);
      s.db.rpc = async (name, args) => {
        if (!parameters[name]) return original(name, args);
        try {
          const values = parameters[name].map(key => args[key]);
          const data = (await pg.query(`SELECT public.${name}(${values.map((_, i) => '$' + (i+1)).join(',')}) data`, values)).rows[0].data;
          return { data, error:null };
        } catch (error) { return { data:null, error:{ code:error.code, message:error.message } }; }
      };
      s.messages = [];
      s.context.fetch = async (url, init) => {
        assert.equal(url, 'https://connector-gateway.lovable.dev/twilio/Messages.json');
        const form = new URLSearchParams(init.body); s.messages.push(form);
        if (s.providerStop) return new Response(JSON.stringify({code:21610}), {status:400});
        if (s.providerFailure) return new Response('{}', {status:503});
        return new Response(JSON.stringify({sid:'SM00000000000000000000000000000001'}), {status:201});
      };
      const handler = await load('supabase/functions/profile-review/index.ts', s);
      s.call = async body => { const response = await handler(request(body)); return {status:response.status, body:await response.json()}; };
      return s;
    }
    const s = await makeState();
    let phoneCounter = 1000;
    const nextPhone = () => '+1661555' + String(phoneCounter++);
    const ask = (state, phone, profileId = a) => state.call({action:'request_code',profileId,phone,otpConsent:true,otpConsentVersion:1});
    const codeFor = (state, phone) => state.messages.filter(m => m.get('To') === phone).at(-1).get('Body').match(/\b\d{6}\b/)[0];
    const verify = (state, sent, phone, profileId = a, verificationId = randomUUID(), code = codeFor(state, phone)) => state.call({action:'verify_code',profileId,challengeId:sent.body.challengeId,code,verificationId});
    async function identity(state = s, profileId = a) { const phone = nextPhone(); const sent = await ask(state,phone,profileId); assert.equal(sent.status,200); const verified = await verify(state,sent,phone,profileId); assert.equal(verified.status,200); return {phone,sent,...verified.body}; }
    const save = (reviewer, extra = {}, profileId = a, state = s) => state.call({action:'save',profileId,token:reviewer.token,rating:4,comment:'Helpful feedback',submissionId:randomUUID(),marketingConsent:false,...extra});
    const feed = profile => pg.query('SELECT get_public_profile_reviews($1,20,0) data',[profile]).then(r=>r.rows[0].data);
    const count = async table => (await pg.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n;

    await pass('New schema locks private phone proofs and disables the old anonymous submission path', async () => {
      for (const role of ['anon','authenticated']) {
        await pg.exec(`SET ROLE ${role}`);
        try {
          for (const table of ['profile_review_identities','profile_review_challenges','profile_review_sessions','profile_review_writes','profile_review_otp_suppressions']) await assert.rejects(()=>pg.query(`SELECT * FROM ${table}`),/permission denied/);
          await assert.rejects(()=>pg.query('SELECT submit_profile_review($1,5,NULL,$2,$3)',[a,uid(30),uid(31)]),/permission denied/);
          await assert.rejects(()=>pg.query('SELECT get_profile_review_session($1,$2)',[a,'a'.repeat(64)]),/permission denied/);
        } finally { await pg.exec('RESET ROLE'); }
      }
      await assert.rejects(()=>pg.query('SELECT submit_profile_review($1,5,NULL,$2,$3)',[a,uid(30),uid(31)]),/Verify your phone/);
    });

    await pass('Read-only config and disabled OTP sender never send texts or create accounts', async () => {
      const cfg = await s.call({action:'config',profileId:a});
      assert.equal(cfg.status,200); assert.equal(cfg.body.verificationAvailable,true); assert.match(cfg.body.sms.consentText,/offers/); assert.match(cfg.body.sms.consentText,/HELP/);
      assert.match(cfg.body.otpConsentText,/Standard message and data rates/);
      s.env.REVIEW_OTP_ENABLED='false';
      assert.equal((await s.call({action:'config',profileId:a})).body.verificationAvailable,false);
      assert.equal((await ask(s,nextPhone())).status,503); assert.equal(s.messages.length,0); assert.equal(s.db.users.size,0);
      s.env.REVIEW_OTP_ENABLED='true';
      assert.equal((await s.call({action:'request_code',profileId:a,phone:nextPhone(),otpConsent:false,otpConsentVersion:1})).status,400);
      assert.equal((await ask(s,nextPhone(),off)).status,404); assert.equal(s.messages.length,0);
    });

    let reviewer;
    await pass('Verified phone access stores consent evidence and private hashes without enrolling anyone in marketing', async () => {
      reviewer = await identity();
      assert.match(reviewer.token,/^[a-f0-9]{64}$/); assert.equal(reviewer.review,null);
      const message = s.messages.at(-1); assert.equal(message.get('From'),s.env.TWILIO_FROM_NUMBER); assert.match(message.get('Body'),/^TapAway:/); assert.match(message.get('Body'),/Reply STOP/);
      const challenge = (await pg.query('SELECT * FROM profile_review_challenges WHERE id=$1',[reviewer.sent.body.challengeId])).rows[0];
      const cfg = (await s.call({action:'config',profileId:a})).body;
      assert.equal(challenge.otp_consent_text,cfg.otpConsentText); assert.equal(challenge.otp_consent_version,1); assert.ok(challenge.otp_consented_at); assert.ok(challenge.sent_at); assert.ok(challenge.consumed_at);
      assert.equal(challenge.code_hash.includes(codeFor(s,reviewer.phone)),false);
      assert.equal(challenge.session_hash,hash(reviewer.token)); assert.notEqual(challenge.session_hash,reviewer.token);
      assert.equal(await count('personal_email_captures'),0); assert.equal(await count('profile_sms_consent_events'),0); assert.equal(s.db.users.size,0);
    });

    await pass('One verified phone owns one review; session edits persist and public projections never contain its phone', async () => {
      const first = await save(reviewer,{rating:1,comment:null}); assert.equal(first.status,200); assert.equal(first.body.smsStatus,'not_requested'); assert.equal(first.body.review.phone_verified,true);
      const edited = await save(reviewer,{rating:5,comment:'🍲'.repeat(600)}); assert.equal(edited.status,200); assert.equal(edited.body.review.id,first.body.review.id);
      const publicFeed = await feed(a); assert.equal(publicFeed.total,1); assert.equal(publicFeed.average,5); assert.equal(publicFeed.reviews[0].phone_verified,true);
      assert.ok(!JSON.stringify(publicFeed).includes(reviewer.phone)); assert.ok(!JSON.stringify(publicFeed).includes(reviewer.token));
      assert.deepEqual(Object.keys(publicFeed.reviews[0]).sort(),['comment','created_at','id','phone_verified','rating','updated_at']);
      const own = await s.call({action:'session',profileId:a,token:reviewer.token}); assert.equal(own.status,200); assert.equal(own.body.review.id,first.body.review.id);
      assert.equal((await s.call({action:'session',profileId:b,token:reviewer.token})).status,401);
      assert.equal((await save(reviewer,{},b)).status,401);
      assert.equal((await save({...reviewer,token:'f'.repeat(64)})).status,401);
      assert.equal((await save(reviewer,{rating:6})).status,400);
      assert.equal((await save(reviewer,{comment:'🍲'.repeat(601)})).status,400);
    });

    await pass('Idempotent saves do not duplicate consent or replay an older edit over a newer one', async () => {
      const submissionId=randomUUID();
      const first=await save(reviewer,{submissionId,rating:2,comment:'First edit'});
      const second=await save(reviewer,{rating:4,comment:'Latest edit'}); assert.equal(second.status,200);
      const retry=await save(reviewer,{submissionId,rating:2,comment:'First edit'}); assert.equal(retry.status,200); assert.equal(retry.body.review.rating,4); assert.equal(retry.body.review.comment,'Latest edit');
      assert.equal((await save(reviewer,{submissionId,rating:3,comment:'Changed request'})).status,400); assert.equal((await feed(a)).total,1);
      assert.equal(first.body.review.id,retry.body.review.id);
    });

    await pass('Fresh OTP recovers the same review and revokes old tokens; verification retries reuse only their original request', async () => {
      await pg.query("UPDATE profile_review_challenges SET created_at=now()-interval '61 seconds' WHERE phone=$1",[reviewer.phone]);
      const sent=await ask(s,reviewer.phone); assert.equal(sent.status,200);
      const verificationId=randomUUID();
      const fresh=await verify(s,sent,reviewer.phone,a,verificationId); assert.equal(fresh.status,200); assert.equal(fresh.body.review.comment,'Latest edit');
      const retry=await verify(s,sent,reviewer.phone,a,verificationId); assert.equal(retry.status,200); assert.equal(retry.body.token,fresh.body.token);
      assert.equal((await verify(s,sent,reviewer.phone,a,randomUUID())).status,400);
      assert.equal((await s.call({action:'session',profileId:a,token:reviewer.token})).status,401);
      reviewer.token=fresh.body.token;
      await pg.query("UPDATE profile_review_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[hash(reviewer.token)]);
      assert.equal((await save(reviewer)).status,401);
    });

    await pass('Wrong codes persist a five-attempt lock, expiry prevents reuse, and unconfirmed provider sends cannot verify', async () => {
      const state=await makeState(), phone=nextPhone(), sent=await ask(state,phone); assert.equal(sent.status,200);
      for(let i=0;i<5;i++)assert.equal((await verify(state,sent,phone,a,randomUUID(),'000000')).status,400);
      assert.equal((await verify(state,sent,phone)).status,400);
      assert.equal((await pg.query('SELECT attempts FROM profile_review_challenges WHERE id=$1',[sent.body.challengeId])).rows[0].attempts,5);
      const phone2=nextPhone(), sent2=await ask(state,phone2);
      await pg.query("UPDATE profile_review_challenges SET expires_at=now()-interval '1 second' WHERE id=$1",[sent2.body.challengeId]);
      assert.equal((await verify(state,sent2,phone2)).status,400);
      state.providerFailure=true; const phone3=nextPhone(); assert.equal((await ask(state,phone3)).status,503);
      assert.equal((await pg.query('SELECT sent_at FROM profile_review_challenges WHERE phone=$1',[phone3])).rows[0].sent_at,null);
    });

    await pass('OTP limits survive a new worker and rotating challenges; recorded global STOP and provider STOP prevent resend', async () => {
      const state=await makeState(), phone=nextPhone(); assert.equal((await ask(state,phone)).status,200);
      const replacement=await makeState(); assert.equal((await ask(replacement,phone)).status,429); assert.equal(replacement.messages.length,0);
      const stopped=nextPhone(); await pg.query('SELECT suppress_profile_review_otp($1)',[stopped]);
      assert.equal((await ask(state,stopped)).status,400);
      const legacy=nextPhone(); await pg.query('INSERT INTO personal_email_captures(profile_id,phone,sms_opt_in,sms_opt_in_at) VALUES($1,$2,false,now())',[noSms,legacy]);
      assert.equal((await ask(state,legacy)).status,400);
      const carrier=nextPhone(); state.providerStop=true; assert.equal((await ask(state,carrier)).status,503);
      assert.equal((await pg.query('SELECT profile_review_otp_allowed($1) ok',[carrier])).rows[0].ok,false);
    });

    await pass('Optional offers signup is a separate auditable grant and works while merchant sending is pending', async () => {
      reviewer=await identity(); const initial=await save(reviewer,{marketingConsent:false}); assert.equal(initial.status,200);
      const before=await count('profile_sms_consent_events'); const messages=s.messages.length;
      const opted=await save(reviewer,{marketingConsent:true,consentVersion:1}); assert.equal(opted.status,200); assert.equal(opted.body.smsStatus,'subscribed');
      assert.equal(s.messages.length,messages,'A review opt-in must never send a promotion');
      const contact=(await pg.query('SELECT * FROM profile_sms_contacts WHERE profile_id=$1 AND phone=$2',[a,reviewer.phone])).rows[0];
      assert.equal(contact.offers_opt_in,true); assert.equal(contact.ordering_opt_in,false); assert.equal(contact.offers_consent_version,1);
      const event=(await pg.query("SELECT * FROM profile_sms_consent_events WHERE contact_id=$1 AND topic='offers'",[contact.id])).rows[0];
      assert.equal(event.consent_text,(await s.call({action:'config',profileId:a})).body.sms.consentText); assert.equal(event.consent_terms_url,'https://example.invalid/terms'); assert.equal(event.consent_privacy_url,'https://example.invalid/privacy');
      assert.match(event.source,/^verified-review:/); assert.equal(await count('profile_sms_consent_events'),before+1);
      assert.equal((await pg.query("SELECT count(*)::int n FROM get_profile_location_sms_recipients($1,'offers',NULL)",[a])).rows[0].n,1);
      assert.equal((await pg.query("SELECT count(*)::int n FROM get_profile_location_sms_recipients($1,'ordering',NULL)",[a])).rows[0].n,0);
      assert.equal((await pg.query("SELECT profile_location_sms_recipient_allowed($1,$2,'offers',NULL,'+16615550999') ok",[a,reviewer.phone])).rows[0].ok,false,'Pending merchant sender cannot send');
      const same=await save(reviewer,{marketingConsent:true,consentVersion:1}); assert.equal(same.body.smsStatus,'already_subscribed');
      assert.equal(await count('profile_sms_consent_events'),before+1);
    });

    await pass('Optional signup failure or stale consent cannot block the review and STOP is never silently undone', async () => {
      const noProgram=await identity(s,noSms); const absent=await save(noProgram,{marketingConsent:true,consentVersion:1},noSms); assert.equal(absent.status,200); assert.equal(absent.body.smsStatus,'unavailable');
      const stale=await save(reviewer,{marketingConsent:true,consentVersion:999}); assert.equal(stale.status,200); assert.equal(stale.body.smsStatus,'consent_changed');
      await pg.query("UPDATE profile_sms_programs SET sender_number='+16615550999' WHERE profile_id=$1",[a]);
      await pg.query('SELECT revoke_profile_location_sms($1,$2)',['+16615550999',reviewer.phone]);
      const stopped=await save(reviewer,{rating:3,marketingConsent:true,consentVersion:1}); assert.equal(stopped.status,200); assert.equal(stopped.body.smsStatus,'suppressed');
      const contact=(await pg.query('SELECT * FROM profile_sms_contacts WHERE profile_id=$1 AND phone=$2',[a,reviewer.phone])).rows[0]; assert.ok(contact.opted_out_at); assert.equal(contact.offers_opt_in,false);
      assert.equal((await pg.query("SELECT count(*)::int n FROM get_profile_location_sms_recipients($1,'offers',NULL)",[a])).rows[0].n,0);
      assert.equal((await pg.query('SELECT profile_review_otp_allowed($1) ok',[reviewer.phone])).rows[0].ok,true,'Dedicated merchant STOP does not revoke a distinct TapAway OTP sender');
      const unchanged=await save(reviewer,{marketingConsent:false}); assert.equal(unchanged.status,200); assert.equal(unchanged.body.smsStatus,'not_requested');
      assert.ok((await pg.query('SELECT opted_out_at FROM profile_sms_contacts WHERE id=$1',[contact.id])).rows[0].opted_out_at);
    });

    await pass('Durable hourly, daily, and whole-hub OTP budgets reject rotating requests before any provider send', async () => {
      const hourly=nextPhone(), daily=nextPhone();
      const seed=async(phone,profile,age)=>pg.query(`INSERT INTO profile_review_challenges
        (id,profile_id,phone,code_hash,expires_at,otp_consent_version,otp_consent_text,created_at)
        VALUES($1,$2,$3,$4,now()+interval '5 minutes',1,'Fixture consent',now()-$5::interval)`,[randomUUID(),profile,phone,'c'.repeat(64),age]);
      for(let i=0;i<5;i++)await seed(hourly,a,'2 minutes');
      for(let i=0;i<10;i++)await seed(daily,a,'2 hours');
      const issue=(phone,profile)=>pg.query('SELECT create_profile_review_challenge($1,$2,$3,$4,true,1,NULL)',[profile,phone,randomUUID(),'d'.repeat(64)]);
      await assert.rejects(()=>issue(hourly,a),error=>error.code==='P0001');
      await assert.rejects(()=>issue(daily,a),error=>error.code==='P0001');
      for(let i=0;i<100;i++)await seed(nextPhone(),b,'2 minutes');
      await assert.rejects(()=>issue(nextPhone(),b),error=>error.code==='P0001');
    });
    console.log(`${checks} verified-review checks passed. No real messages or network access.`);
  } finally { await pg.close(); }
})().catch(error=>{ console.error(error); process.exitCode=1; });
