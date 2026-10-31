# Public real-hub regression; intercept analytics so no production writes occur.
import asyncio, json, hashlib, io
from pathlib import Path
from playwright.async_api import async_playwright
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SHOTS = Path('/tmp/browser/lasislas-pdf-regression')
SHOTS.mkdir(parents=True, exist_ok=True)
HASH = 'a34caea491a80b59791c0e9c06b1a6522e0c5a049d39217f04f2e8111b40317d'

async def main():
 async with async_playwright() as p:
  browser = await p.chromium.launch(headless=True)
  context = await browser.new_context(viewport={'width': 1280, 'height': 1800})
  page = await context.new_page()
  errors, events = [], []
  page.on('pageerror', lambda error: errors.append(str(error)))
  async def track(route):
   events.append(route.request.post_data_json)
   await route.fulfill(status=200, body='{}', content_type='application/json')
  await context.route('**/functions/v1/track-event', track)
  asset = json.loads((ROOT / 'src/assets/las-islas-menu-mar26.pdf.asset.json').read_text())
  response = await context.request.get('https://tapaway.co' + asset['url'])
  assert response.status == 200
  assert response.headers['content-type'].startswith('application/pdf')
  pdf = await response.body()
  assert len(pdf) == 4408628
  assert hashlib.sha256(pdf).hexdigest() == HASH
  reader = PdfReader(io.BytesIO(pdf))
  assert len(reader.pages) == 8
  assert all(float(x.mediabox.width) > 0 and float(x.mediabox.height) > 0 for x in reader.pages)
  assert 'sarandeado' in ''.join(x.extract_text() for x in reader.pages).lower()
  print('PASS original PDF HTTP200, MIME, exact bytes/hash, eight readable pages')
  # Local Vite lacks the CDN gateway; serve the exact verified bytes only for that asset.
  async def serve_pdf(route):
   await route.fulfill(status=200, body=pdf, headers={'Content-Type':'application/pdf','Content-Disposition':'inline'})
  await context.route('http://localhost:8080' + asset['url'], serve_pdf)
  for width, height in [(360,800), (390,844), (320,800), (1280,1800)]:
   await page.set_viewport_size({'width':width,'height':height})
   for slug in ['lasislasfontana','lasislasmarias']:
    await page.goto('http://localhost:8080/lasislas')
    await page.locator(f'a[href="/{slug}"]').click(timeout=30000)
    link = page.get_by_role('link', name='View Menu · Ver Menú', exact=True)
    await link.wait_for(timeout=30000)
    assert await link.count() == 1
    assert await page.locator(f'a[href="{asset["url"]}"]').count() == 1
    assert await link.get_attribute('href') == asset['url']
    assert await link.get_attribute('target') == '_blank'
    assert set((await link.get_attribute('rel')).split()) == {'noopener','noreferrer'}
    assert await page.get_by_role('dialog').count() == 0
    assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
    box = await link.bounding_box()
    assert box and box['height'] >= 44 and box['x'] >= 0 and box['x'] + box['width'] <= width + 1
    await page.screenshot(path=str(SHOTS / f'{slug}-{width}.png'))
    before = len(events)
    async with page.expect_popup() as opened:
     await link.click()
    popup = await opened.value
    await popup.wait_for_url('**' + asset['url'])
    await page.wait_for_timeout(300)
    assert any(e.get('event_type') == 'menu_view' for e in events[before:]), events[before:]
    await popup.close()
    await page.bring_to_front()
    assert page.url == 'http://localhost:8080/' + slug
    assert await link.is_visible()
    assert await page.evaluate('document.body.style.overflow') not in ['hidden','clip']
    await page.go_back()
    assert page.url.endswith('/lasislas')
    assert await page.get_by_text('Profile not found',exact=True).count() == 0
    print('PASS', slug, width, 'single anchor/new PDF tab/analytics/return/history/layout')
  await page.goto('http://localhost:8080/islas')
  await page.locator('a[href^="/islas"]').first.wait_for(timeout=30000)
  paths = await page.locator('a[href^="/islas"]').evaluate_all('(a)=>a.map(x=>x.getAttribute("href"))')
  assert len(set(paths)) >= 2
  for path in ['/islas'] + list(dict.fromkeys(paths)):
   await page.goto('http://localhost:8080' + path)
   await page.wait_for_timeout(1500)
   assert await page.locator(f'a[href="{asset["url"]}"]').count() == 0
   assert await page.get_by_text('Profile not found',exact=True).count() == 0
   if path != '/islas':
    menu = page.locator('a[href="#"]').filter(has_text='Menu')
    await menu.click()
    await page.get_by_text('Prices may change at any time.',exact=False).wait_for()
   print('PASS original Islas unchanged',path)
  assert not errors, errors
  await browser.close()

asyncio.run(main())
