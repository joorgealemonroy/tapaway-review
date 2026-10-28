import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin } from "../_shared/paymentFirst.ts";
const EXPECTED = [{"id": "personal-photos", "public": true, "file_size_limit": 20971520, "allowed_mime_types": ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "video/mp4", "video/webm", "video/quicktime"]}, {"id": "personal-link-images", "public": true, "file_size_limit": 20971520, "allowed_mime_types": ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]}, {"id": "card-print-files", "public": false, "file_size_limit": 20971520, "allowed_mime_types": ["application/pdf", "image/jpeg", "image/png", "image/webp"]}];
const DEADLINE = "2026-10-28T03:32:02.813423+00:00";
const TOKEN_DIGEST = "66e0f72ef18d1c190f71fe6dee693bfeacf66b58f328ad673452905606ccd2fe";
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
let used=false;
serve(async req=>{
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 if(Date.now()>Date.parse(DEADLINE))return json({error:"expired"},410);
 const token=req.headers.get("x-launch-token")||"";
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,"0")).join("");
 let difference=0;for(let i=0;i<TOKEN_DIGEST.length;i++)difference|=digest.charCodeAt(i)^TOKEN_DIGEST.charCodeAt(i);
 if(difference!==0)return json({error:"unauthorized"},401);
 if(used)return json({error:"already_used"},409);
 used=true;
 try{
 const db=admin();const results=[];
 for(const bucket of EXPECTED){
  const before=await db.storage.getBucket(bucket.id);
  if(before.error||before.data?.public!==bucket.public)return json({error:"bucket_identity_or_privacy_mismatch"},409);
 }
 for(const bucket of EXPECTED){
  const update=await db.storage.updateBucket(bucket.id,{public:bucket.public,fileSizeLimit:bucket.file_size_limit,allowedMimeTypes:bucket.allowed_mime_types});
  if(update.error)return json({error:"storage_update_failed"},500);
  const after=await db.storage.getBucket(bucket.id);
  const match=!after.error&&after.data?.public===bucket.public&&after.data?.file_size_limit===bucket.file_size_limit&&JSON.stringify(after.data?.allowed_mime_types)===JSON.stringify(bucket.allowed_mime_types);
  results.push({bucket:bucket.id,equal:match});if(!match)return json({error:"storage_readback_mismatch",results},409);
 }
 return json({configured:true,results});
 }catch{return json({error:"storage_configuration_failed"},500);}
});
