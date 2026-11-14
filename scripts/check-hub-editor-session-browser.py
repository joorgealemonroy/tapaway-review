"""Offline browser regressions: fake accounts only; all remote traffic intercepted."""
import asyncio, base64, io, json, os
from email import policy
from email.parser import BytesParser
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

BASE = os.environ.get('QA_BASE_URL', 'http://127.0.0.1:8081')
UID = '22222222-2222-4222-8222-222222222222'
PID = '11111111-1111-4111-8111-111111111111'
BID = '44444444-4444-4444-8444-444444444444'
KEY = 'sb-xfrvckdcrqvkqdwjzopt-auth-token'
USER = {'id': UID, 'email': 'fixture@example.invalid', 'aud': 'authenticated', 'role': 'authenticated', 'app_metadata': {}, 'user_metadata': {}}
PHOTO = 'https://fixture.invalid/orientation.png'
IMAGE = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQCAIAAAAP3aGbAAAFQklEQVR4nO3WwQ2AMAwEwZj+ew4t8ABFi2YquIe18uwF7xuHxQeu0wMAnhIsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsICMWWuf3sAP7T2nJ/BDPiwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjIEC8gQLCBDsIAMwQIyBAvIECwgQ7CADMECMgQLyBAsIEOwgAzBAjJuNzkIHLPKkmEAAAAASUVORK5CYII=')

async def quadrants(page, data):
    return await page.evaluate("""async (encoded) => {
      const img = new Image(); img.src = 'data:image/webp;base64,' + encoded;
      await img.decode(); const canvas=document.createElement('canvas');
      canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
      return [[.25,.25],[.75,.25],[.25,.75],[.75,.75]].map(([x,y])=>{
        const [r,g,b]=ctx.getImageData(Math.floor(x*img.width),Math.floor(y*img.height),1,1).data;
        return r>180&&g>180 ? 'yellow' : ['red','green','blue'][[r,g,b].indexOf(Math.max(r,g,b))];
      });
    }""", base64.b64encode(data).decode())

async def run(browser, width):
    context = await browser.new_context(viewport={'width':width,'height':900})
    state={'rep_error':False,'rep_active':True,'signed_in':True,'refreshes':0,'logouts':0}
    profile={'id':PID,'user_id':UID,'sales_rep_id':UID,'created_by_rep_id':UID,'username':'fixture-coffee','full_name':'Fixture Coffee','plan_type':'pro','subscription_status':'active','is_approved':False,'pipeline_status':'draft','background_color':'#ffffff','header_type':'color','show_username':True,'created_at':'2026-11-01T08:00:00Z'}
    block={'id':BID,'profile_id':PID,'block_type':'photo_collage','content':{'media':json.dumps([{'url':PHOTO,'type':'image'}]),'columns':'3'},'sort_order':0,'is_active':True,'alignment':'center'}
    links=[]; writes=[]; uploads={}; errors=[]
    async def handle(route):
        req=route.request; url=req.url
        if url.startswith(BASE): return await route.continue_()
        async def reply(data,status=200):
            await route.fulfill(status=status,content_type='application/json',body=json.dumps(data))
        single='vnd.pgrst.object' in req.headers.get('accept','')
        if url == PHOTO: return await route.fulfill(status=200,content_type='image/png',body=IMAGE,headers={'access-control-allow-origin':'*'})
        if '/storage/v1/object/public/personal-photos/' in url:
            key=url.split('/public/personal-photos/')[1]
            return await route.fulfill(status=200,body=uploads[key],content_type='image/webp',headers={'access-control-allow-origin':'*'})
        if '/storage/v1/object/personal-photos/' in url:
            key=url.split('/object/personal-photos/')[1]
            raw=req.post_data_buffer
            if 'multipart/form-data' in req.headers.get('content-type',''):
                msg=BytesParser(policy=policy.default).parsebytes(('Content-Type: '+req.headers['content-type']+'\r\n\r\n').encode()+raw)
                raw=next(part.get_payload(decode=True) for part in msg.walk() if part.get_filename() is not None)
            uploads[key]=raw
            return await reply({'Key':'personal-photos/'+key})
        if '/auth/v1/logout' in url:
            state['logouts']+=1;state['signed_in']=False;return await reply({})
        if '/auth/v1/token' in url:
            state['refreshes']+=1
            return await reply({'access_token':'fixture-refreshed','refresh_token':'fixture-refresh','expires_in':3600,'token_type':'bearer','user':USER})
        if '/auth/v1/user' in url: return await reply(USER if state['signed_in'] else {'message':'signed out'},200 if state['signed_in'] else 401)
        if '/rpc/is_admin' in url: return await reply(False)
        if '/rest/v1/sales_reps' in url:
            await asyncio.sleep(.35)
            if state['rep_error']: return await reply({'message':'Temporary connection failure'},503)
            rep={'id':UID,'name':'Fixture Rep','email':USER['email'],'is_active':True}
            return await reply((rep if single else [rep]) if state['rep_active'] else (None if single else []))
        if '/rest/v1/personal_profiles' in url:
            if req.method not in ['GET','HEAD']:
                writes.append(req.post_data_json);profile.update(req.post_data_json);return await reply(None)
            return await reply(profile if single else [profile])
        if '/rest/v1/personal_links' in url:
            if req.method == 'POST':
                row=req.post_data_json; row={**row,'id':'33333333-3333-4333-8333-333333333333'};links.append(row);writes.append(row);return await reply(None)
            return await reply(links)
        if '/rest/v1/personal_blocks' in url:
            if req.method == 'PATCH': block.update(req.post_data_json);writes.append(req.post_data_json);return await reply(None)
            return await reply([block])
        if '/rpc/get_public_personal_profile_status' in url or '/rpc/get_public_personal_profile' in url: return await reply([profile])
        if '/rpc/is_username_available' in url:return await reply(True)
        if '/rest/v1/' in url:return await reply(None if single else [])
        if '/functions/v1/' in url:return await reply({'ok':True})
        return await route.abort()
    await context.route('**/*',handle)
    await context.add_init_script("""(() => { if (localStorage.getItem('fixture-seeded')) return; localStorage.setItem('fixture-seeded','1'); localStorage.setItem(%s,JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:%s})); })();""" % (json.dumps(KEY),json.dumps(USER)))
    page=await context.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
    try:
        await page.goto(BASE+'/rep')
        await page.get_by_role('heading',name='Welcome back, Fixture').wait_for()
        await page.get_by_role('button',name='Businesses',exact=True).click()
        await page.get_by_role('button',name='Edit',exact=True).click()
        await page.get_by_role('button',name='Partner Portal',exact=True).wait_for()
        await page.go_back();await page.get_by_role('button',name='Edit',exact=True).wait_for()
        await page.go_forward();await page.get_by_role('button',name='Partner Portal',exact=True).wait_for()
        await page.reload();await page.get_by_role('button',name='Partner Portal',exact=True).wait_for()
        assert state['logouts']==0
        assert await page.evaluate('(key)=>!!localStorage.getItem(key)',KEY)
        # Login URL also restores the session without creating another login history entry.
        await page.goto(BASE+'/auth?redirect=%2Frep%2Frestaurants')
        await page.get_by_role('button',name='Edit',exact=True).wait_for()
        await page.goto(BASE+f'/rep/demo/{PID}')
        await page.get_by_role('button',name='Partner Portal',exact=True).wait_for()
        await page.go_back();await page.get_by_role('button',name='Edit',exact=True).wait_for()
        await page.goto(BASE+f'/dashboard?lite=1&profile_id={PID}&tab=links')
        await page.get_by_role('button',name='Add link',exact=True).click()
        await page.get_by_role('button',name='TikTok',exact=True).click()
        await page.get_by_placeholder('yourname',exact=True).fill('rebels.burgers.br')
        await page.get_by_text('→ https://tiktok.com/@rebels.burgers.br',exact=True).wait_for()
        assert not await page.get_by_text('Enter your page name',exact=False).count()
        await page.get_by_role('button',name='Add Link',exact=True).click()
        await page.wait_for_function("document.body.innerText.includes('Saved')")
        for _ in range(50):
            if links: break
            await asyncio.sleep(.1)
        assert links and links[-1]['url']=='https://tiktok.com/@rebels.burgers.br',links
        await page.goto(BASE+f'/dashboard?lite=1&profile_id={PID}&tab=design')
        await page.get_by_role('heading',name='Page background',exact=True).wait_for()
        assert await page.get_by_role('button',name='Background color ',exact=False).count()==24
        async with page.expect_response(lambda r:'/rest/v1/personal_profiles' in r.url and r.request.method=='PATCH'):
            await page.get_by_role('button',name='Background color Sage',exact=True).click()
        await page.reload()
        assert await page.get_by_role('button',name='Background color Sage',exact=True).get_attribute('aria-pressed')=='true'
        assert profile['background_color']=='#e2ecd8'
        # Adjust an already-uploaded photo, save its actual pixels, then reopen it.
        await page.goto(BASE+f'/dashboard?lite=1&profile_id={PID}&tab=links')
        await page.get_by_role('button',name='More actions for Block',exact=True).click()
        await page.get_by_role('menuitem',name='Edit',exact=True).click()
        await page.get_by_role('button',name='Adjust photo 1',exact=True).click()
        crop=page.get_by_role('dialog',name='Adjust collage photo',exact=True)
        await crop.get_by_role('button',name='Flip horizontal',exact=True).click()
        await crop.get_by_role('button',name='Save',exact=True).click()
        for _ in range(50):
            if uploads: break
            await asyncio.sleep(.1)
        assert await quadrants(page,list(uploads.values())[-1])==['green','red','yellow','blue']
        await page.locator('img[src*="/public/personal-photos/"]').first.wait_for()
        await page.get_by_role('button',name='Adjust photo 1',exact=True).click()
        await crop.get_by_role('button',name='Flip vertical',exact=True).click()
        await crop.get_by_role('button',name='Rotate 90°',exact=True).click()
        await crop.get_by_role('button',name='Save',exact=True).click()
        for _ in range(50):
            if len(uploads)>=2: break
            await asyncio.sleep(.1)
        assert await quadrants(page,list(uploads.values())[-1])==['green','yellow','red','blue'],'Vertical flip followed by clockwise rotation must match the preview'
        await page.get_by_role('button',name='Adjust photo 1',exact=True).click()
        await crop.get_by_role('button',name='Reset',exact=True).click()
        await crop.get_by_role('button',name='Save',exact=True).click()
        for _ in range(50):
            if len(uploads)>=3: break
            await asyncio.sleep(.1)
        assert await quadrants(page,list(uploads.values())[-1])==['green','yellow','red','blue'],'Reset must preserve the saved photo without re-flipping'
        await page.get_by_role('dialog',name='Edit block',exact=True).get_by_role('button',name='Save',exact=True).click()
        for _ in range(50):
            if PHOTO not in block['content']['media']:break
            await asyncio.sleep(.1)
        assert PHOTO not in block['content']['media']
        await page.reload()
        assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        # Backend role failures keep the session and provide a retry, not logout.
        state['rep_error']=True
        await page.goto(BASE+'/rep')
        await page.get_by_role('heading',name='We couldn’t load your workspace',exact=True).wait_for()
        assert state['logouts']==0 and await page.evaluate('(key)=>!!localStorage.getItem(key)',KEY)
        state['rep_error']=False
        await page.get_by_role('button',name='Try again',exact=True).click()
        await page.get_by_role('heading',name='Welcome back, Fixture').wait_for()
        # Expired sessions refresh using the persisted refresh token.
        await page.evaluate('(key)=>{const s=JSON.parse(localStorage.getItem(key));s.expires_at=1;localStorage.setItem(key,JSON.stringify(s));}',KEY)
        await page.reload();await page.get_by_role('heading',name='Welcome back, Fixture').wait_for()
        assert state['refreshes']>=1
        # A disabled rep still loses access, while an explicit logout remains final.
        state['rep_active']=False
        await page.reload();await page.wait_for_url(BASE+'/')
        state['rep_active']=True
        await page.goto(BASE+'/rep/profile')
        await page.get_by_role('button',name='Sign Out',exact=True).click()
        await page.get_by_role('heading',name='Welcome back',exact=True).wait_for()
        await page.go_back()
        await page.get_by_role('heading',name='Welcome back',exact=True).wait_for()
        assert not await page.evaluate('(key)=>!!localStorage.getItem(key)',KEY)
        assert state['logouts']==1 and not errors,errors
        print(f'PASS {width}px: TikTok save, color persistence, collage pixels/reset, Back/Forward/reload/login restore, role retry, refresh, revoked access and sign-out')
    except Exception:
        await page.screenshot(path=f'/tmp/hub-editor-failure-{width}.png',full_page=True)
        print('FAIL PAGE',page.url, (await page.locator('body').inner_text())[-7000:], 'ERRORS',errors)
        raise
    finally: await context.close()

async def main():
    async with async_playwright() as p:
        options={'headless':True}
        if os.environ.get('QA_CHROMIUM'):options['executable_path']=os.environ['QA_CHROMIUM']
        browser=await p.chromium.launch(**options)
        for width in [390,1280]:await run(browser,width)
        await browser.close()
if __name__=='__main__':asyncio.run(main())
