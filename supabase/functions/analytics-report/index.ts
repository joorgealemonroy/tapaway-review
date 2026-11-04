import { readLimitedText } from '../_shared/requestBody.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const authorization=req.headers.get('Authorization')??'';
 if(!authorization.startsWith('Bearer '))return json({error:'Unauthorized'},401);
 const client=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_ANON_KEY')??'',{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:user,error:authError}=await client.auth.getUser();
 if(authError||!user.user)return json({error:'Unauthorized'},401);
 try{
  const body=JSON.parse(await readLimitedText(req,16384));
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Invalid report'},400);
  const actions=['snapshot','overview','hub_table','hub_summary','hub_detail','hub_daily','hub_breakdowns'];
  if(!actions.includes(body.action))return json({error:'Unknown action'},400);
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(body.hubId!=null && (typeof body.hubId!=='string'||!uuid.test(body.hubId)))return json({error:'Invalid hub'},400);
  for(const field of ['since','until'])if(body[field]!=null && (typeof body[field]!=='string'||!Number.isFinite(Date.parse(body[field]))))return json({error:'Invalid bounds'},400);
  if(body.days!=null && ![7,30,90].includes(body.days))return json({error:'Invalid range'},400);
  let kind=body.kind??null;
  // Old issued client requests have no kind; require one unambiguous owner-scoped hub.
  if(body.hubId&&!kind){
   const [p,r]=await Promise.all([client.from('personal_profiles').select('id').eq('id',body.hubId).maybeSingle(),client.from('restaurants').select('id').eq('id',body.hubId).maybeSingle()]);
   if(p.error||r.error)return json({error:'Report unavailable'},500);
   if(!!p.data===!!r.data)return json({error:'Hub kind required or access denied'},403);
   kind=p.data?'solo':'business';
  }
  const {data,error}=await client.rpc('canonical_analytics_report',{_days:body.days??30,_kind:kind,_hub:body.hubId??null,_search:body.search??'',_since:body.since??null,_until:body.until??null,_cursor_at:body.cursor?.at??null,_cursor_id:body.cursor?.id??null,_page:body.page??0,_event:body.event??null});
  if(error)return json({error:error.code==='42501'?'Forbidden':error.code==='22023'?'Invalid report parameters':'Report unavailable'},error.code==='42501'?403:error.code==='22023'?400:500);
  if(!data)return json({error:'Report unavailable'},500);
  const report=data as Record<string,any>;
  if(body.action==='hub_summary')return json({meta:report.meta,events:report.events});
  if(body.action==='hub_daily')return json({meta:report.meta,daily:report.daily});
  if(body.action==='hub_detail')return json({meta:report.meta,events:report.events,sources:report.sources.map((s:any)=>({...s,events:s.views}))});
  if(body.action==='hub_breakdowns')return json({meta:report.meta,links:report.links,devices:report.devices.map((s:any)=>({...s,events:s.views}))});
  if(body.action==='hub_table')return json({meta:report.meta,hubs:report.hubs});
  if(body.action==='overview')return json({meta:report.meta,overview:report.totals});
  return json(report);
 }catch{return json({error:'Invalid or unavailable report'},400);}
});
