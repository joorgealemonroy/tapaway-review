"""Nontransactional browser fixtures; every backend/write request is intercepted."""
import asyncio,json,re
from pathlib import Path
from playwright.async_api import async_playwright

BASE='http://localhost:8080'
TOKEN='a'*64
USER={'id':'22222222-2222-4222-8222-222222222222','email':'fixture@example.invalid','aud':'authenticated','role':'authenticated','app_metadata':{},'user_metadata':{}}
HUB={'id':'11111111-1111-4111-8111-111111111111','kind':'personal','name':'Fixture cafe','slug':'fixture-cafe','payment_state':'complimentary','subscription_status':'active','stripe_subscription_id':None,'is_approved':True,'created_at':'2026-01-01','views':4,'clicks':2,'photo_url':None}
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  for width,height in [(320,800),(360,800),(390,844),(1280,1800)]:
   context=await browser.new_context(viewport={'width':width,'height':height})
   page=await context.new_page(); errors=[];calls=[];state={'status':'not_paid','catalog_fail':False}
   page.on('pageerror',lambda e:errors.append(str(e)))
   async def handle(route):
    req=route.request;url=req.url
    if url.startswith(BASE):return await route.continue_()
    async def reply(data,status=200):await route.fulfill(status=status,content_type='application/json',body=json.dumps(data))
    if '/functions/v1/onboarding-plan-catalog' in url:
     if state['catalog_fail']:return await reply({'error':'unavailable'},503)
     return await reply({'catalog':[{'plan':plan,'interval':interval,'amount':amount,'currency':'usd','trialDays':14,'available':True} for plan,interval,amount in [('solo','month',2000),('solo','year',19900),('venue','month',3900),('venue','year',39000)]]})
    if '/functions/v1/subscription-invitation' in url:
     b=req.post_data_json;calls.append(b)
     if b['action']=='summary':return await reply({'name':'Fixture cafe','slug':'fixture-cafe','logo':None,'paid':False})
     if b['action']=='admin_info':return await reply({'email':'fixture@example.invalid','bound':False,'eligible':True})
     if b['action']=='mint':return await reply({'token':TOKEN,'expiresAt':'2026-11-05'})
     if b['action']=='status':return await reply({'status':state['status'],'emailSent':state['status']=='paid'})
     if b['action']=='checkout':return await reply({'error':'Injected unavailable checkout'},409)
     if b['action']=='access':return await reply({'error':'Access link expired or already used'},410)
     return await reply({'revoked':True})
    if '/auth/v1/user' in url:return await reply(USER)
    if '/rpc/is_admin' in url:return await reply(True)
    if '/rpc/admin_workspace_hubs' in url:return await reply([HUB,{**HUB,'id':'33333333-3333-4333-8333-333333333333','kind':'business','name':'Fixture restaurant','slug':'fixture-restaurant'}, {**HUB,'id':'44444444-4444-4444-8444-444444444444','name':'Paid fixture','stripe_subscription_id':'sub_existing','payment_state':'paying'}])
    if '/admin-billing-summary' in url:return await reply({'mrr_cents':0,'active_count':0,'trialing_count':0,'past_due_count':0,'excluded_count':0})
    if '/rpc/admin_workspace_insights' in url:return await reply({})
    if '/rest/v1/' in url:return await reply(None if 'vnd.pgrst.object' in req.headers.get('accept','') else [])
    if '/functions/v1/' in url:return await reply({'ok':True})
    return await route.abort()
   await context.route('**/*',handle)
   await page.goto(BASE+'/subscribe?invite='+TOKEN)
   await page.get_by_role('heading',name='Fixture cafe',exact=True).wait_for()
   assert not await page.get_by_role('checkbox').is_checked()
   assert await page.get_by_text('$20 due today',exact=True).is_visible()
   await page.locator('#plan-venue').click()
   await page.get_by_text('Yearly',exact=True).click()
   await page.get_by_role('checkbox').check()
   assert await page.get_by_text('$450 due today',exact=True).is_visible()
   await page.get_by_role('button',name='Continue to secure payment').click()
   await page.get_by_text('Checkout unavailable. Confirm this invitation with your admin.',exact=True).wait_for()
   assert calls[-1]['plan']=='venue' and calls[-1]['interval']=='year' and calls[-1]['cardClub'] is True
   assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
   Path('/tmp/browser/invitation').mkdir(parents=True,exist_ok=True)
   await page.screenshot(path=f'/tmp/browser/invitation/choices-{width}.png')
   for status,title in [('not_paid',None),('processing','Confirming your payment'),('paid','Payment confirmed'),('review','Payment needs confirmation')]:
    state['status']=status;await page.goto(BASE+'/subscribe?invite='+TOKEN+'&session_id=cs_fixture')
    if title:await page.get_by_role('heading',name=title,exact=True).wait_for()
    else:
     await page.get_by_role('button',name='Continue to secure payment').wait_for()
     assert await page.get_by_role('heading',name='Payment confirmed').count()==0
   await page.goto(BASE+'/subscribe/access#token='+TOKEN)
   await page.get_by_role('button',name='Verify email & open dashboard').click()
   await page.get_by_role('alert').wait_for()
   assert TOKEN not in page.url
   # Fixture session is written only to this app's origin, never across origins.
   await page.evaluate("u=>{const exp=Math.floor(Date.now()/1000)+3600;const h=Object.keys(localStorage).find(k=>k.startsWith('sb-'));if(h)localStorage.removeItem(h);}",USER)
   # Get the client's public storage key from its own served module, without any credential output.
   config=await page.request.get(BASE+'/src/integrations/supabase/client.ts')
   source=await config.text();match=re.search(r'https://([a-z0-9]+)\.supabase\.co',source)
   if match:
    await page.evaluate("([k,u])=>localStorage.setItem(k,JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:u}))",['sb-'+match.group(1)+'-auth-token',USER])
    await page.goto(BASE+'/admin?section=accounts')
    await page.get_by_role('button',name='Payment link',exact=True).first.wait_for()
    assert await page.get_by_role('button',name='Payment link',exact=True).count()==2
    await page.get_by_role('button',name='Payment link',exact=True).first.click()
    await page.get_by_label('Dashboard email',exact=True).fill('fixed@example.invalid')
    await page.get_by_role('button',name='Generate payment link').click()
    await page.get_by_role('button',name='Copy link',exact=True).wait_for()
    assert await page.get_by_role('dialog').locator('svg').count()>0
    await page.get_by_role('dialog').screenshot(path=f'/tmp/browser/invitation/admin-{width}.png')
    assert any(b.get('action')=='mint' and b.get('email')=='fixed@example.invalid' for b in calls)
   else:raise AssertionError('Admin fixture session key unavailable')
   assert not errors,errors
   print(f'PASS {width}x{height}: selection, checkout failure, status truth, one-use error, admin QR/email, no overflow')
   await context.close()
  await browser.close()
asyncio.run(main())