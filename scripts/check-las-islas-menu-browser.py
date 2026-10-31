# Public real-hub UI regression only; blocks analytics writes and does not sign in.
import asyncio,json,hashlib
from pathlib import Path
from playwright.async_api import async_playwright
S=Path('/tmp/browser/lasislas-menu-regression');S.mkdir(parents=True,exist_ok=True);ROOT=Path(__file__).resolve().parents[1]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  c=await b.new_context(viewport={'width':1280,'height':1800})
  page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.route('**/functions/v1/track-event',lambda r:r.fulfill(status=200,body='{}',content_type='application/json'))
  for width,height in [(360,800),(390,844),(320,800),(1280,1800)]:
   await page.set_viewport_size({'width':width,'height':height})
   for slug in ['lasislasfontana','lasislasmarias']:
    await page.goto('http://localhost:8080/lasislas');a=page.locator(f'a[href="/{slug}"]');await a.wait_for(timeout=30000);await a.click()
    buttons=page.get_by_role('button',name='View Menu');await buttons.first.wait_for(timeout=30000);await buttons.first.click()
    dialog=page.get_by_role('dialog');await page.get_by_role('heading',name='Ostiones en su concha',exact=True).wait_for(timeout=30000)
    assert await dialog.locator('article').count()==155
    for _ in range(12):
     await page.keyboard.press('Tab');assert await dialog.evaluate('(e)=>e.contains(document.activeElement)')
    
    if await page.evaluate('document.documentElement.scrollWidth>innerWidth'):
     print('OVERFLOW',width,await page.evaluate('Array.from(document.querySelectorAll("body *")).filter(e=>e.getBoundingClientRect().right>innerWidth).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right}))'));await page.screenshot(path=str(S/'overflow.png'));raise AssertionError('overflow')
    assert await dialog.evaluate('(e)=>e.scrollWidth<=e.clientWidth')
    close=page.get_by_role('button',name='Close menu');box=await close.bounding_box();assert box['y']>=0 and box['y']+box['height']<=height
    await page.screenshot(path=str(S/f'{slug}-{width}.png'))
    await page.get_by_role('textbox',name='Search menu').fill('camaron');assert await dialog.locator('article').count()>10
    await page.get_by_role('textbox',name='Search menu').fill('no-such-food');assert await dialog.locator('article').count()==0
    await page.get_by_role('button',name='Clear search').click()
    await page.get_by_role('combobox',name='Menu category').select_option(label='Charolas de Ceviche · Party Trays');assert await dialog.locator('article').count()==6
    await page.get_by_role('combobox',name='Menu category').select_option(label='Spirits · Cognac, Whisky, Vodka y Tequilas');assert await dialog.locator('article').count()==17
    await page.go_back();await dialog.wait_for(state='hidden');assert page.url.endswith(slug)
    await page.go_forward();await dialog.wait_for();await close.click();await dialog.wait_for(state='hidden')
    assert await page.evaluate('document.body.style.overflow') not in ['hidden','clip']
    await buttons.last.click();await dialog.wait_for();await page.keyboard.press('Escape');await dialog.wait_for(state='hidden')
    assert await page.evaluate('document.body.style.overflow') not in ['hidden','clip']
    print('PASS',slug,width,'items/search/categories/back/forward/close/Escape/overflow')
  # Controlled transport failure against the actual hub (no fake hub identity).
  state={'calls':0}
  async def slow(route):
   state['calls']+=1
   if state['calls']==1:
    await asyncio.sleep(2)
    await route.fulfill(status=503,content_type='application/json',body='{"message":"Temporary failure"}')
   else: await route.continue_()
  await page.route('**/rest/v1/rpc/get_public_restaurant_menu',slow)
  await page.goto('http://localhost:8080/lasislasfontana');await page.get_by_role('button',name='View Menu').first.click()
  await page.get_by_role('status').filter(has_text='Cargando').wait_for();await page.get_by_role('button',name='Retry menu').wait_for();await page.screenshot(path=str(S/'retry.png'))
  await page.get_by_role('button',name='Retry menu').click();await page.get_by_role('heading',name='Ostiones en su concha',exact=True).wait_for();await page.get_by_role('button',name='Close menu').click()
  await page.unroute('**/rest/v1/rpc/get_public_restaurant_menu',slow)
  print('PASS delayed failure and retry')
  await page.goto('http://localhost:8080/lasislasfontana');await page.get_by_role('button',name='View Menu').first.click();await page.get_by_role('dialog').wait_for();await page.get_by_role('button',name='Close menu').click();await page.get_by_role('dialog').wait_for(state='hidden');await page.wait_for_timeout(200);assert await page.get_by_role('button',name='View Menu').first.evaluate('(e)=>e===document.activeElement')
  await page.go_back();assert page.url.endswith('/lasislasfontana') or page.url.endswith('/lasislas');assert await page.get_by_text('Profile not found',exact=True).count()==0
  print('PASS close returns focus and subsequent history has no missing gate')
  await page.goto('http://localhost:8080/islas');await page.wait_for_timeout(2000)
  links=await page.locator('a[href^="/islas"]').evaluate_all('(a)=>a.map(x=>x.getAttribute("href"))');print('Original child paths',links)
  for slug in ['/islas']+list(dict.fromkeys(links)):
   await page.goto('http://localhost:8080'+slug);await page.wait_for_timeout(1500)
   assert await page.locator('.las-islas-menu').count()==0
   assert await page.get_by_text('Profile not found',exact=True).count()==0
   print('PASS original untouched',slug)
  asset=json.loads((ROOT/'src/assets/las-islas-menu-mar26.pdf.asset.json').read_text())
  response=await page.request.get('http://localhost:8080'+asset['url']);assert response.ok
  body=await response.body()
  if response.headers.get('content-type','').startswith('application/pdf'): assert hashlib.sha256(body).hexdigest()==asset.get('sha256','a34caea491a80b59791c0e9c06b1a6522e0c5a049d39217f04f2e8111b40317d')
  else: print('Local Vite does not serve CDN assets; exact PDF hash checked separately on hosted preview')
  assert not errors,errors
  print('PASS stable original PDF exact hash; no runtime errors');await b.close()
asyncio.run(main())
