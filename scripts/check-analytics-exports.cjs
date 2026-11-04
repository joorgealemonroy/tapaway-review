const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.join(__dirname,'..');let checks=0;
const hub={id:'hub-one',kind:'business',name:'Example business',slug:'example'};
const activity=n=>({key:String(n),at:'2026-11-01T09:30:00Z',hub,event:'link_click',label:'Menu',source:'Direct / unknown'});
const base={hub,meta:{since:'2026-10-28T06:00:00Z',until:'2026-11-04T06:00:00Z',asOf:'2026-11-04T06:00:00Z',timezone:'America/Los_Angeles',days:7,source:'filtered',coverage:'Recorded events only'},totals:{hub_views:10,clicks:3,saves:1,sessions:2},daily:[{day:'2026-11-01',events:{hub_view:10,link_click:3,contact_save:1}}],activity:[activity(1)],activityCount:3,nextCursor:{at:'2026-11-01T09:30:00Z',id:'1'}};
const calls=[];let replies=[];const db={marker:true,async rpc(name,args){assert.equal(this.marker,true);calls.push({name,args});return replies.shift();}};
const exp={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'src/lib/canonicalAnalytics.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exp,require:n=>{assert.equal(n,'@/integrations/supabase/client');return {supabase:db};},Intl,Date,Error},{filename:'canonicalAnalytics.ts'});
const pass=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
(async()=>{
 await pass('CSV preserves quoted cells and neutralizes whitespace/control-prefixed formulas',()=>{for(const value of ['=1+1','\t@SUM(A1)','\0\t+1','\r\n-1',' \u00a0=IMPORTXML(A1)']) assert.equal(exp.csvCell(value)[1],"'");assert.equal(exp.csvCell('Menu, "Drinks"'),'"Menu, ""Drinks"""');});
 await pass('Export loads every activity page using the original server snapshot and source',async()=>{replies=[{data:{...base,activity:[activity(2)],nextCursor:{at:'2026-11-01T09:30:00Z',id:'2'}},error:null},{data:{...base,activity:[activity(3)],nextCursor:null},error:null}];const rows=await exp.allReportActivity(base,{hubId:hub.id,kind:hub.kind,source:'historical'});assert.equal(rows.length,3);for(const c of calls){assert.equal(c.name,'historical_analytics_report');assert.equal(c.args._since,base.meta.since);assert.equal(c.args._until,base.meta.until);assert.equal(c.args._hub,hub.id);assert.equal(c.args._kind,hub.kind);}assert.match(exp.reportCsv(base,rows),/Example business/);});
 await pass('Exports fail closed on another hub, partial pages and report errors',async()=>{assert.throws(()=>exp.reportCsv(base,[{...activity(1),hub:{...hub,id:'other'}}]),/Single hub/);replies=[{data:{...base,activity:[],nextCursor:null},error:null}];await assert.rejects(()=>exp.allReportActivity(base,{hubId:hub.id,kind:hub.kind}),/Snapshot changed/);replies=[{data:null,error:new Error('Unavailable')}];await assert.rejects(()=>exp.fetchAnalyticsReport(),/Unavailable/);});
 await pass('Private report identity includes authenticated owner and parent snapshot',()=>{
  const output={};let user={id:'owner-one'};const jsx=(type,props)=>({type,props});
  const source=ts.transpileModule(fs.readFileSync(path.join(root,'src/components/analytics/CanonicalHubReport.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  // The actual wrapper remount key and actual query options are executed.
  const options=[];const hook=()=>({user});const req=n=>n==='react'?{useState:v=>[v,()=>{}]}:n==='react/jsx-runtime'?{jsx:(type,props,key)=>({type,props,key}),jsxs:jsx}:n==='@/hooks/useAuth'?{useAuth:hook}:n==='@tanstack/react-query'?{useQuery:o=>{options.push(o);return {isPending:true};}}:n==='@/lib/canonicalAnalytics'?exp:new Proxy({},{get:(_,key)=>String(key)});
  vm.runInNewContext(source,{exports:output,require:req},{filename:'CanonicalHubReport.tsx'});
  const render=until=>{const node=output.CanonicalHubReport({hubId:hub.id,kind:hub.kind,initialUntil:until});node.type(node.props);return node;};
  const a=render(base.meta.until),b=render('2026-11-04T06:01:00Z');assert.notEqual(a.key,b.key);user={id:'owner-two'};const c=render(base.meta.until);assert.notEqual(a.key,c.key);for(const o of options){assert.ok(o.queryKey.includes(user.id)||o.queryKey.includes('owner-one'));assert.equal(o.refetchOnWindowFocus,false);}user=null;render(base.meta.until);assert.equal(options.at(-2).enabled,false);
 });
 console.log(`PASS ${checks} analytics export and report-identity checks; no external traffic.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
