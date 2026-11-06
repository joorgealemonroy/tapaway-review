const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(path.join(process.env.QA_MODULES,'@electric-sql/pglite'));
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let checks=0;const pass=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
(async()=>{
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('qa.user',true),'')::uuid$$;
 CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$SELECT coalesce(current_setting('qa.admin',true),'false')='true'$$;
 CREATE TABLE personal_profiles(id uuid primary key,user_id uuid,full_name text,username text);
 CREATE TABLE restaurants(id uuid primary key,owner_id uuid,restaurant_name text,custom_slug text);
 CREATE TABLE personal_analytics(id uuid default gen_random_uuid(),profile_id uuid,event_type text,created_at timestamptz,visitor_info jsonb);
 CREATE TABLE analytics_events(id uuid default gen_random_uuid(),restaurant_id uuid,event_type text,created_at timestamptz,event_data jsonb);
 CREATE TABLE analytics_hits(id uuid default gen_random_uuid(),event_id text,hub_id uuid,hub_kind text,event_name text,session_id text,occurred_at timestamptz,created_at timestamptz,traffic_class text,is_validated boolean,props jsonb default '{}',referrer_host text,campaign_channel text,device_category text,path text);`);
 const file=fs.readdirSync(path.join(__dirname,'../drizzle/migrations')).find(f=>f.endsWith('_canonical_analytics_reports.sql'));
 await db.exec(fs.readFileSync(path.join(__dirname,'../drizzle/migrations',file),'utf8'));
 await db.query('SELECT set_config($1,$2,false)',['qa.user',id(1)]);await db.exec("SELECT set_config('qa.admin','true',false)");
 await db.query('INSERT INTO personal_profiles VALUES($1,$2,$3,$4)',[id(2),id(1),'Free personal','free']);
 await db.query('INSERT INTO restaurants VALUES($1,$2,$3,$4)',[id(2),id(3),'Free restaurant','restaurant']);
 await db.exec(`INSERT INTO analytics_hits(event_id,hub_id,hub_kind,event_name,session_id,occurred_at,created_at,traffic_class,is_validated,path)
 SELECT 'event-'||n,'${id(2)}','solo','hub_view','same-session','2026-11-01T08:30Z','2026-11-01T08:30Z','human',true,'/free' FROM generate_series(1,1205) n;
 INSERT INTO analytics_hits(event_id,hub_id,hub_kind,event_name,session_id,occurred_at,created_at,traffic_class,is_validated) VALUES
 ('click','${id(2)}','business','menu_view','business-session','2026-11-01T09:30Z','2026-11-01T09:30Z','human',true),
 ('excluded','${id(2)}','solo','hub_view','bot','2026-11-01T09:30Z','2026-11-01T09:30Z','bot',false),
 ('future','${id(2)}','solo','hub_view','future','2026-11-04T07:00Z','2026-11-04T07:00Z','human',true),
 ('upper','${id(2)}','solo','hub_view','upper','2026-11-04T06:00Z','2026-11-04T06:00Z','human',true),
 ('null','${id(2)}','solo','hub_view',null,NULL,'2026-11-01','human',true);`);
 const until='2026-11-04T06:00Z',since='2026-10-28T06:00Z';
 const report=async(kind=null,hub=null,cursor=null,page=0,event=null,search='')=>(await db.query('SELECT canonical_analytics_report(7,$1,$2,$3,$4,$5,$6,$7,$8,$9) AS r',[kind,hub,search,until,since,cursor?.at??null,cursor?.id??null,page,event])).rows[0].r;
 await pass('More than 1000 rows aggregate exactly; range sessions are distinct, not daily sums',async()=>{const r=await report();assert.equal(r.totals.hub_views,1205);assert.equal(r.totals.sessions,1);assert.equal(r.totals.excluded,1);assert.equal(r.totals.clicks,1);assert.equal(r.daily.reduce((n,d)=>n+(d.events.hub_view??0),0),1205);});
 await pass('Same UUID across kinds stays isolated; click-only free hub appears',async()=>{const r=await report();assert.equal(r.hubCount,2);assert.equal((await report('business',id(2))).totals.hub_views,0);assert.equal((await report('business',id(2))).totals.clicks,1);});
 await pass('LA first partial day and fall DST buckets retain all events',async()=>{const r=await report('solo',id(2));assert.equal(r.daily[0].day,'2026-10-27');assert.equal(r.daily.find(d=>d.day==='2026-11-01').events.hub_view,1205);assert.equal(r.meta.until,'2026-11-04T06:00:00+00:00');});
 await pass('Equal timestamp keyset pagination yields every event once',async()=>{let r=await report(),keys=[];while(true){keys.push(...r.activity.map(a=>a.key));if(!r.nextCursor)break;r=await report(null,null,r.nextCursor);}assert.equal(keys.length,1206);assert.equal(new Set(keys).size,1206);});
 await pass('Filters reset scope and totals; future/null events stay excluded',async()=>{assert.equal((await report(null,null,null,0,null,'restaurant')).totals.clicks,1);assert.equal((await report(null,null,null,0,'menu_view')).activityCount,1);assert.equal((await report(null,null,null,0,null,'missing')).hubCount,0);});
 await pass('Owner cannot read another kind with same ID or admin aggregate',async()=>{await db.exec("SELECT set_config('qa.admin','false',false);SET ROLE authenticated");assert.equal((await report('solo',id(2))).totals.hub_views,1205);await assert.rejects(()=>report('business',id(2)),/denied/);await assert.rejects(()=>report(),/Admin access/);await db.exec('RESET ROLE');});
 await pass('Anonymous and malformed ranges fail closed',async()=>{await db.exec('SET ROLE anon');await assert.rejects(()=>report(),/permission denied/);await db.exec('RESET ROLE');await assert.rejects(()=>db.query('SELECT canonical_analytics_report(8)'),/Invalid reporting/);});
 await db.exec(fs.readFileSync(path.join(__dirname,'../drizzle/migrations/0041_analytics_atomic_action_guard.sql'),'utf8'));
 await pass('Atomic action guard preserves distinct links/hubs and rejects repeated action',async()=>{const add=(event,link,hub=id(2))=>db.query("INSERT INTO analytics_hits(event_id,hub_id,hub_kind,event_name,session_id,occurred_at,created_at,traffic_class,is_validated,path,props) VALUES($1,$2,'solo','link_click','new-session','2026-11-03','2026-11-03','human',true,'/free',$3)",[event,hub,{link_id:link}]);await add('a','link-a');await add('b','link-b');await add('c','link-a');await add('d','link-a',id(5));assert.equal((await db.query("SELECT count(*) AS n FROM analytics_hits WHERE session_id='new-session'")).rows[0].n,3);});
 await db.exec(fs.readFileSync(path.join(__dirname,'../drizzle/migrations/0042_historical_analytics_reports.sql'),'utf8'));
 await db.exec("SELECT set_config('qa.admin','true',false)");
 await db.exec(`INSERT INTO analytics_events(restaurant_id,event_type,created_at) SELECT '${id(2)}','tap','2026-11-01T08:30Z' FROM generate_series(1,1205);
 INSERT INTO personal_analytics(profile_id,event_type,created_at) VALUES('${id(2)}','contact_save','2026-11-01T09:30Z');`);
 const history=async(kind=null,hub=null,cursor=null)=>(await db.query('SELECT historical_analytics_report(7,$1,$2,$3,$4,$5,$6,$7,0,NULL) AS r',[kind,hub,'',until,since,cursor?.at??null,cursor?.id??null])).rows[0].r;
 await pass('Historical business and personal activity stays separate, exact and without invented sessions',async()=>{const h=await history();assert.equal(h.meta.source,'historical');assert.equal(h.totals.hub_views,1205);assert.equal(h.totals.saves,1);assert.equal(h.totals.sessions,null);assert.equal(h.hubCount,2);assert.equal((await report()).totals.hub_views,1205);assert.equal((await report()).meta.source,'filtered');assert.match(h.meta.coverage,/never add these totals/);});
 await pass('Historical equal-time pagination includes every record once beyond row caps',async()=>{let h=await history(),keys=[];while(true){keys.push(...h.activity.map(a=>a.key));if(!h.nextCursor)break;h=await history(null,null,h.nextCursor);}assert.equal(keys.length,1206);assert.equal(new Set(keys).size,1206);});
 await pass('Historical-only business hub stays inspectable without adding records to validated totals',async()=>{
  await db.query('INSERT INTO restaurants VALUES($1,$2,$3,$4)',[id(6),id(1),'Historical only','historical-only']);
  await db.query("INSERT INTO analytics_events(restaurant_id,event_type,created_at) VALUES($1,'google_click','2026-11-01T10:30Z'),($1,'tap','2026-11-01T10:30Z')",[id(6)]);
  const h=await history('business',id(6)),v=await report('business',id(6));
  assert.equal(h.totals.events,2);assert.equal(h.totals.hub_views,1);assert.equal(h.totals.clicks,1);assert.equal(h.hubCount,1);assert.equal(h.activityCount,2);
  assert.equal(v.totals.events,0);assert.equal(v.hubCount,0);assert.equal((await history()).totals.events,1208);
 });
 await pass('Historical ownership and kind boundaries match filtered reports',async()=>{await db.exec("SELECT set_config('qa.admin','false',false);SET ROLE authenticated");assert.equal((await history('solo',id(2))).totals.saves,1);await assert.rejects(()=>history('business',id(2)),/denied/);await assert.rejects(()=>history(),/Admin access/);await db.exec('RESET ROLE;SET ROLE anon');await assert.rejects(()=>history(),/permission denied/);await db.exec('RESET ROLE');});
 await db.close();console.log(`PASS ${checks} canonical analytics SQL checks; isolated only.`);
})().catch(e=>{console.error(e);process.exit(1);});
