"""Intercepted owner-scoped dashboard targeting; no backend writes."""
import asyncio,json,re
from playwright.async_api import async_playwright
BASE='http://localhost:8080';OWNER='22222222-2222-4222-8222-222222222222'
USER={'id':OWNER,'email':'owner@example.invalid','aud':'authenticated','role':'authenticated','app_metadata':{},'user_metadata':{}}
R=[{'id':f'{n}'*8+'-1111-4111-8111-111111111111','owner_id':OWNER,'restaurant_name':name,'custom_slug':name.lower(),'onboarding_completed':True,'subscription_status':'active','payment_state':'paying','plan_type':'solo_pro'} for n,name in [(1,'First restaurant'),(2,'Invited restaurant')]]
P=[{'id':f'{n}'*8+'-3333-4333-8333-333333333333','user_id':OWNER,'full_name':name,'username':name.lower().replace(' ','-'),'subscription_status':'active','is_approved':True,'created_at':f'2026-01-0{n}'} for n,name in [(3,'First profile'),(4,'Invited profile')]]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);ctx=await b.new_context(viewport={'width':390,'height':844});page=await ctx.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  async def handle(route):
   req=route.request;url=req.url
   if url.startswith(BASE):return await route.continue_()
   async def reply(d):await route.fulfill(status=200,content_type='application/json',body=json.dumps(d))
   if req.method not in ('GET','HEAD','OPTIONS') and '/functions/v1/' not in url and '/rpc/' not in url:return await route.abort()
   if '/auth/v1/user' in url:return await reply(USER)
   if '/rpc/' in url:return await reply(False)
   one='vnd.pgrst.object' in req.headers.get('accept','')
   if '/rest/v1/restaurants' in url:return await reply(R[0] if one else R)
   if '/rest/v1/personal_profiles' in url:return await reply(P[0] if one else P)
   if '/rest/v1/' in url:return await reply(None if one else [])
   if '/functions/v1/' in url:return await reply({})
   return await route.abort()
  await ctx.route('**/*',handle);await page.goto(BASE)
  src=await (await page.request.get(BASE+'/src/integrations/supabase/client.ts')).text();ref=re.search(r'https://([a-z0-9]+)\.supabase\.co',src).group(1)
  await page.evaluate("([k,u])=>localStorage.setItem(k,JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:u}))",['sb-'+ref+'-auth-token',USER])
  for path,text in [(f'/dashboard?type=restaurant&restaurant_id={R[1]["id"]}','Invited restaurant'),(f'/dashboard?type=lite&profile_id={P[1]["id"]}','Invited profile')]:
   await page.goto(BASE+path);await page.get_by_text(text).first.wait_for(timeout=15000);print('PASS exact target',text)
  for path in [f'/dashboard?type=restaurant&restaurant_id=99999999-9999-4999-8999-999999999999',f'/dashboard?type=lite&profile_id=99999999-9999-4999-8999-999999999999']:
   await page.goto(BASE+path);await page.get_by_text('This hub is unavailable for your account.').first.wait_for(timeout=15000)
   assert await page.get_by_text('First restaurant').count()==0 and await page.get_by_text('First profile').count()==0;print('PASS foreign ID is not replaced by another hub')
  await page.screenshot(path='/tmp/browser/invitation/foreign-target.png');assert not errors,errors
  await b.close()
asyncio.run(main())
