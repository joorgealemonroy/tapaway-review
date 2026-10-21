/* Nontransactional browser checks: all external requests are fulfilled or blocked.
 * Install Playwright in a separate tooling directory, then set PLAYWRIGHT_MODULE.
 * Or set PLAYWRIGHT_MODULE to an installed Playwright package path.
 * Optional: BROWSER_EXECUTABLE, BROWSER_ARGS (JSON array), QA_SCREENSHOTS.
 */
const assert = require('node:assert/strict');
const { mkdirSync, readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { expect } = require((process.env.PLAYWRIGHT_MODULE || 'playwright') + '/test');
const root = path.resolve(__dirname, '..');
const catalog = ['solo', 'venue'].flatMap(plan => ['month', 'year'].map(interval => ({
  plan, interval, amount: plan === 'solo' ? (interval === 'month' ? 2000 : 19900) : (interval === 'month' ? 3900 : 39000),
  currency: 'usd', trialDays: 14, available: true, checkoutVersion:2,
})));
const fakeUser = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'shopper@example.invalid', app_metadata: {provider:'email'}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
let browser, server, base, backendHost;
let passed = 0;
const cases = [];
const test = (name, run) => cases.push({ name, run });

async function scenario(options = {}) {
  const context = await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  const state = { catalog: structuredClone(catalog), checkout: [], support: [], chat: [], personalOrders: [], aiCount: 0, notifications: 0, errors: [], resources: [], external: [], documents: [], welcome:'sign_in', setup:{step:'business',business_name:null,business_address:null,shipping_address:null,logo_url:null}, setupWrites:[], setupReads:[], clubRequests:[], billingRequests:[], profileWrites:[], nfcWrites:[], ...options };
  await context.addInitScript(({saved,authenticated,backendHost,fakeUser}) => {
    // No consent seed: checks exercise a genuine first visit.
    if(saved) localStorage.setItem('tapaway_onboarding_data',JSON.stringify(saved));
    if(authenticated) {
      const exp=Math.floor(Date.now()/1000)+3600;
      const token=[{alg:'HS256',typ:'JWT'},{sub:fakeUser.id,exp,role:'authenticated'},'fixture'].map((v,i)=>i<2?btoa(JSON.stringify(v)).replaceAll('=',''):v).join('.');
      localStorage.setItem(`sb-${backendHost.split('.')[0]}-auth-token`,JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:exp,expires_in:3600,token_type:'bearer',user:fakeUser}));
    }
  },{saved:options.saved,authenticated:options.authenticated,backendHost,fakeUser});
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const reply = (data,status=200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    if(url.origin===base) {
      if(request.resourceType()==='document')state.documents.push(url.pathname);
      if(state.chunkDelay&&/src\/pages\/(Support|Onboarding)\.tsx/.test(url.pathname))await new Promise(resolve=>setTimeout(resolve,700));
      if(url.pathname.startsWith('/__l5e/assets-v1/')) { const photo=path.join(process.env.QA_ASSETS||'/nonexistent',url.pathname.split('/').pop()); if(existsSync(photo))return route.fulfill({contentType:'image/jpeg',body:readFileSync(photo)}); }
      if(url.pathname==='/qa-checkout')return route.fulfill({contentType:'text/html',body:'<h1>Fixture checkout reached</h1>'});
      return route.continue();
    }
    state.external.push(url.href);
    // Nothing may escape this fixture boundary, including analytics and email.
    if(url.hostname==='tapaway.co')return route.fulfill({contentType:'text/html',body:'<html><body style="font-family:Arial;padding:70px 20px"><h1>Customer hub fixture</h1><p>External hub traffic is blocked in automated checks.</p></body></html>'});
    if(url.hostname!==backendHost)return route.abort();
    if(url.pathname.endsWith('/onboarding-plan-catalog'))return state.catalogFailure ? reply({error:'Fixture unavailable'},503) : reply({catalog:state.catalog});
    if(url.pathname.endsWith('/personal-card-catalog'))return reply({available:!state.personalUnavailable,hubAvailable:!state.hubUnavailable,amount:3900,hubAmount:500,currency:'usd',designerVersion:state.oldPersonalCatalog?1:2});
    if(url.pathname.endsWith('/personal-card-order')) { const data=request.postDataJSON(); if(data.action==='status')return reply({orderId:'11111111-1111-4111-8111-111111111111',paid:!state.personalPending,hosted:true,productionStatus:'needs_review',status:state.personalPending?'checkout_started':'paid'});state.personalOrders.push(data); return reply({url:base+'/qa-checkout'}); }
    if(url.pathname.endsWith('/storefront-support')) { const data=request.postDataJSON(); state.chat.push(data); if(data.mode==='team')return reply({sent:true});state.aiCount++;return state.aiCount>5 ? reply({error:'Five questions used',remaining:0},429) : reply({answer:'Personal cards are $39 for two, with optional hosting at $5/month.',remaining:5-state.aiCount}); }
    if(url.pathname.endsWith('/app_settings'))return reply({paywall_enabled:true,onboarding_default_billing:'year'});
    if(url.pathname.endsWith('/lookup-place-id'))return state.placeFailure?reply({error:'Search unavailable'},503):reply({results:[{placeId:'ChIJ_fixture',name:'QA Pizza',formattedAddress:'123 Main St, Claremont, CA 91711, USA',city:'Claremont',state:'CA',postalCode:'91711',website:'https://example.com',lat:34.1,lng:-117.7}]});
    if(url.pathname.endsWith('/payment-first-checkout')) {
      state.checkout.push(request.postDataJSON());
      return state.checkoutFailure ? reply({error:'Checkout is temporarily unavailable. Please try again.'},503) : reply({url:base+'/qa-checkout'});
    }
    if(url.pathname.endsWith('/payment-first-welcome')) {
      if(state.welcome==='network_error')return route.abort();
      const data=request.postDataJSON();
      if(data.action==='send_link')return state.sendLinkFailure ? reply({error:'Fixture unavailable'},503) : reply({ok:true});
      return reply({status:state.welcome,emailHint:'s***@example.invalid'});
    }
    if(url.pathname.endsWith('/payment-first-onboarding')) {
      const data=request.postDataJSON();
      if(data.action!=='state')state.setupWrites.push(data);
      else state.setupReads.push(data);
      if(state.setupFailure)return reply({error:"We couldn't save that. Please try again."},503);
      if(data.action==='business')Object.assign(state.setup,{business_name:data.businessName,step:'logo'});
      if(data.action==='logo')Object.assign(state.setup,{logo_url:data.logoUrl||null,step:'shipping'});
      if(data.action==='shipping')Object.assign(state.setup,{shipping_address:data.address,step:'done'});
      return reply({session:state.setup,...state.membership});
    }
    if(url.pathname.endsWith('/card-club-request')) { state.clubRequests.push(request.postDataJSON()); return reply({ok:true}); }
    if(url.pathname.endsWith('/manage-personal-subscription')) { state.billingRequests.push(request.postDataJSON()); return reply({url:base+'/qa-checkout'}); }
    if(url.pathname.endsWith('/support_requests')) {
      state.support.push(request.postDataJSON());
      return state.supportFailure ? reply({message:'Fixture unavailable'},503) : reply(null,201);
    }
    if(url.pathname.endsWith('/support-notification')) { state.notifications++;return reply({ok:true}); }
    if(url.pathname.endsWith('/request-dashboard-access'))return state.sendLinkFailure ? reply({error:'Fixture unavailable'},503) : reply({ok:true});
    if(url.pathname.endsWith('/auth/v1/user'))return reply(fakeUser);
    if(url.pathname.endsWith('/rpc/is_username_available'))return reply(request.postDataJSON().check_username!=='taken');
    if(url.pathname.endsWith('/nfc_cards')&&request.method()==='PATCH'){state.nfcWrites.push(request.postDataJSON());return reply(null);}
    if(url.pathname.endsWith('/personal_profiles')&&request.method()==='PATCH'){state.profileWrites.push(request.postDataJSON());Object.assign(state.profile,request.postDataJSON());return reply(null);}
    if(url.pathname.endsWith('/rpc/is_admin'))return reply(false);
    if(url.pathname.endsWith('/personal_profiles') && state.profile) return reply(request.headers()['accept']?.includes('vnd.pgrst.object') ? state.profile : [state.profile]);
    if(url.pathname.includes('/rest/v1/')) {
      return reply(request.headers()['accept']?.includes('vnd.pgrst.object') ? null : []);
    }
    if(url.pathname.endsWith('/track'))return reply({ok:true});
    return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',e=>{state.errors.push(e.message);console.error('Browser error:',e.message);});
  const go=async url=>page.goto(base+url,{waitUntil:'networkidle'});
  const close=async()=>{assert.deepEqual(state.errors,[],'No uncaught browser errors');await context.close();};
  return {page,state,go,close};
}
async function screenshot(page,name,fullPage=false){if(process.env.QA_SCREENSHOTS){mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});if(fullPage)await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,name+'.png'),fullPage});}}

for(const plan of ['solo','venue'])for(const interval of ['year','month']) test(`${plan}/${interval}: pricing selection reaches checkout with exact offer`,async()=>{
  const {page,state,go,close}=await scenario();
  await go('/?utm_source=qa&utm_campaign=storefront');
  const price=page.locator('#pricing');
  await price.getByRole('button',{name:interval==='year'?/^Yearly/:/^Monthly$/}).click();
  await price.getByRole('button',{name:`Get my ${plan==='solo'?4:15} cards`,exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your business order',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:interval==='year'?/^Yearly/:/^Monthly$/})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{name:new RegExp(`^${plan==='solo'?4:15} cards`)})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  const item=catalog.find(i=>i.plan===plan&&i.interval===interval);
  await expect(page.getByRole('complementary')).toContainText(`$${item.amount/100}/${interval==='year'?'year':'month'}`);
  if(await page.getByRole('button',{name:'Business name, city, and state',exact:true}).isVisible())await page.getByRole('button',{name:'Business name, city, and state',exact:true}).click();
  await page.getByRole('textbox',{name:'Business name',exact:true}).fill('QA Pizza');
  await page.getByRole('textbox',{name:'City & state',exact:true}).fill('Claremont, CA');
  await page.getByRole('button',{name:'Start my business trial'}).click();
  await expect(page.getByRole('heading',{name:'Fixture checkout reached'})).toBeVisible();
  assert.equal(state.checkout.length,1);assert.equal(state.checkout[0].plan,plan);assert.equal(state.checkout[0].interval,interval);assert.equal(state.checkout[0].cardClub,false);assert.equal(state.checkout[0].attribution.utm_source,'qa');
  await close();
});

test('Canceled checkout restores Stripe cycle, quantity and chosen Card Club; errors allow retry',async()=>{
  const {page,state,go,close}=await scenario({saved:{billingInterval:'year',cardClubSelected:true},checkoutFailure:true});
  await go('/onboarding?plan=venue&cycle=month&canceled=1');
  await expect(page.getByRole('button',{name:'Monthly',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('checkbox')).toBeChecked();
  await expect(page.getByRole('complementary')).toContainText('Then $44/month, including Card Club');
  if(await page.getByRole('button',{name:'Business name, city, and state',exact:true}).isVisible())await page.getByRole('button',{name:'Business name, city, and state',exact:true}).click();
  await page.getByRole('textbox',{name:'Business name',exact:true}).fill('QA Pizza');
  await page.getByRole('textbox',{name:'City & state',exact:true}).fill('Claremont, CA');
  await page.getByRole('button',{name:'Start my business trial'}).click();
  await expect(page.getByRole('alert')).toContainText('Checkout is temporarily unavailable');
  assert.equal(state.checkout[0].cardClub,true);
  state.checkoutFailure=false;
  if(await page.getByRole('button',{name:'Business name, city, and state',exact:true}).isVisible())await page.getByRole('button',{name:'Business name, city, and state',exact:true}).click();
  await page.getByRole('textbox',{name:'Business name',exact:true}).fill('QA Pizza');
  await page.getByRole('textbox',{name:'City & state',exact:true}).fill('Claremont, CA');
  await page.getByRole('button',{name:'Start my business trial'}).click();
  await expect(page.getByRole('heading',{name:'Fixture checkout reached'})).toBeVisible();
  await close();
});

test('Catalog failure pauses both storefront and checkout; retry recovers',async()=>{
  const {page,state,go,close}=await scenario({catalogFailure:true});
  await go('/');
  await expect(page.getByRole('button',{name:'Get my 4 cards',exact:true})).toBeDisabled();
  await go('/onboarding?plan=solo&billing=year');
  await expect(page.getByRole('button',{name:'Start my business trial'})).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText("We couldn't load prices");
  state.catalogFailure=false;
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.getByRole('button',{name:'Start my business trial'})).toBeEnabled();
  assert.equal(state.checkout.length,0);
  await close();
});

test('Missing/unavailable prices cannot enable checkout; a valid interval can',async()=>{
  const {page,go,close}=await scenario({catalog:catalog.filter(i=>!(i.plan==='venue'&&i.interval==='year')).map(i=>({...i,available:i.interval==='month'}))});
  await go('/onboarding?plan=solo&billing=year');
  await expect(page.getByRole('button',{name:'Start my business trial'})).toBeDisabled();
  await go('/onboarding?plan=venue&billing=year');
  await expect(page.getByRole('button',{name:'Start my business trial'})).toBeDisabled();
  await page.getByRole('button',{name:'Monthly',exact:true}).click();
  await expect(page.getByRole('button',{name:'Start my business trial'})).toBeEnabled();
  await close();
});

test('Personal offer is a two-card one-time purchase with optional hosting',async()=>{
  const {page,go,close}=await scenario(); await go('/personal');
  await expect(page.locator('#pricing')).toContainText('$39');
  await expect(page.locator('#pricing')).toContainText('No required subscription.');
  await expect(page.getByRole('link',{name:'Design my two cards · $39'})).toHaveAttribute('href','/personal/design');
  await screenshot(page,'personal-desktop'); await close();
});
test('An old backend catalog cannot start the new combined business checkout',async()=>{
  const {page,state,go,close}=await scenario({catalog:catalog.map(({checkoutVersion,...item})=>item)});
  await go('/start?plan=solo&billing=month');
  await expect(page.getByText(/This checkout is being updated/)).toBeVisible();
  await expect(page.getByRole('button',{name:'Start my business trial'})).toBeDisabled();assert.equal(state.checkout.length,0);await close();
});
test('Business dashboard uses the included yearly membership and scopes replacement requests',async()=>{
  const profile={id:'22222222-2222-4222-8222-222222222222',user_id:fakeUser.id,username:'qa',full_name:'QA Business',email:fakeUser.email,plan_type:'yearly',subscription_status:'active',onboarding_source:'payment_first_v1',stripe_customer_id:'cus_fixture',stripe_subscription_id:'sub_fixture',is_approved:true,created_at:'2025-01-01T00:00:00Z'};
  const {page,state,go,close}=await scenario({authenticated:true,profile,setup:{step:'done',setup_status:'shipped'},membership:{club:{id:'club_fixture',status:'active',billingInterval:'year',billingWithPlan:true},entitlement:{eligible:true,quantity:4,next_eligible_at:null},intent:{card_quantity:4}}});
  await go('/dashboard?type=lite');await page.getByRole('tab',{name:'Cards',exact:true}).click();
  await expect(page.getByText('Active · $60/year')).toBeVisible();await expect(page.getByText(/Included in your business subscription/)).toBeVisible();
  assert.equal(state.setupReads.at(-1).profileId,profile.id);await page.getByRole('button',{name:'Request Fresh Cards',exact:true}).click();await page.getByRole('button',{name:'Request My Cards',exact:true}).click();await expect(page.getByText("Request received. We'll print and ship your fresh cards.")).toBeVisible();assert.equal(state.clubRequests.at(-1).membershipId,'club_fixture');
  await page.getByRole('tab',{name:'Plan',exact:true}).click();await expect(page.getByText('Your business subscription',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Manage Subscription',exact:true}).click();await expect(page.getByRole('heading',{name:'Fixture checkout reached'})).toBeVisible();assert.equal(state.billingRequests.at(-1).profileId,profile.id);await close();
});
test('Personal hub dashboard keeps cards one-time and billing at $5/month',async()=>{
  const profile={id:'22222222-2222-4222-8222-222222222222',user_id:fakeUser.id,username:'qa',full_name:'QA Personal',email:fakeUser.email,plan_type:'personal_hosted',subscription_status:'active',onboarding_source:'personal_cards_v1',stripe_customer_id:'cus_fixture',stripe_subscription_id:'sub_fixture',is_approved:true,created_at:'2025-01-01T00:00:00Z'};
  const {page,state,go,close}=await scenario({authenticated:true,profile});await go('/dashboard?type=lite');await expect(page.getByRole('region',{name:'Personal hub setup guide'})).toBeVisible();await page.getByRole('button',{name:/Name & content/}).click();await expect(page.getByText('Your name & tapaway.co address',{exact:true})).toBeVisible();await page.getByLabel('Your TapAway address',{exact:true}).fill('taken');await expect(page.getByText('This username is already taken',{exact:true})).toBeVisible();assert.ok(state.profileWrites.every(x=>!x.username));await page.getByLabel('Your TapAway address',{exact:true}).fill('my-new-page'.replaceAll('-',''));await expect.poll(()=>state.profileWrites.some(x=>x.username==='mynewpage'),{timeout:10000}).toBe(true);assert.equal(state.nfcWrites.length,0);await page.getByRole('tab',{name:'Cards',exact:true}).click();
  await expect(page.getByRole('link',{name:'Design two more cards · $39'})).toBeVisible();await expect(page.getByRole('button',{name:/subscribe/i})).toHaveCount(0);assert.equal(state.setupReads.length,0);
  await page.getByRole('tab',{name:'Plan',exact:true}).click();await expect(page.getByRole('tabpanel')).toContainText('$5');await expect(page.getByRole('tabpanel')).toContainText('/month');await close();
});
test('Monthly default, real hubs, testimonial images, and responsive pages',async()=>{
  const {page,go,close}=await scenario({saved:{billingInterval:'year'}}); await go('/');
  await expect(page.locator('#pricing').getByRole('button',{name:'Monthly',exact:true})).toHaveAttribute('aria-pressed','true');
  for(const [name,slug] of [['Restaurant','tuttimangiaitalianchophouse'],['Cakery & coffee','sugarbloomcakery'],['Barber studio','spacestudios'],['Car wraps','rebornwraps'],['Julian','julian'],['Denzel','denzel']]) {
    await page.getByRole('button',{name,exact:true}).click(); await expect(page.locator('.sf-iphone iframe')).toHaveAttribute('src','https://tapaway.co/'+slug);
  }
  await expect(page.locator('.sf-customer-photo')).toHaveCount(3);
  for(const width of [1440,1024,768,430,390,360,320]) {
    await page.setViewportSize({width,height:900});
    for(const route of ['/','/personal','/personal/design','/onboarding?plan=solo&billing=month','/support']) {
      await go(route); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${route} overflows at ${width}`);
      if(route==='/') {
        await page.locator('.sf-products').scrollIntoViewIfNeeded();
        await expect.poll(()=>page.locator('.sf-product-photo img').evaluateAll(imgs=>imgs.length===2&&imgs.every(img=>img.complete&&img.naturalWidth>0))).toBe(true);
        for(const product of ['business','personal']) {
          const photo=page.locator(`.sf-product.${product} img`);await photo.scrollIntoViewIfNeeded();await photo.evaluate(img=>img.decode());
          if(process.env.QA_SCREENSHOTS)await page.locator(`.sf-product.${product}`).screenshot({path:path.join(process.env.QA_SCREENSHOTS,`${product}-photo-${width}.png`),style:'header, .sf-help {visibility:hidden!important}'});
        }
        if(process.env.QA_SCREENSHOTS)await page.locator('.sf-products').screenshot({path:path.join(process.env.QA_SCREENSHOTS,`product-photos-${width}.png`)});
      }
      if(width===1440&&route==='/')await screenshot(page,'home-desktop',true);
      if(width===390)await screenshot(page,route.replaceAll('/','-')+'-mobile',true);
    }
  }
  await go('/'); await page.getByRole('button',{name:'Open menu'}).click(); await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toHaveCount(0); await close();
});
test('Business intake is required before checkout; yearly Club is one total',async()=>{
  const {page,state,go,close}=await scenario(); await go('/start?plan=solo&billing=year');
  await page.getByRole('button',{name:'Start my business trial'}).click(); assert.equal(state.checkout.length,0);
  if(await page.getByRole('button',{name:'Business name, city, and state',exact:true}).isVisible())await page.getByRole('button',{name:'Business name, city, and state',exact:true}).click();
  await page.getByRole('textbox',{name:'Business name',exact:true}).fill('QA Pizza'); await page.getByRole('textbox',{name:'City & state'}).fill('Claremont, CA');
  await page.getByRole('checkbox').check(); await expect(page.getByRole('complementary')).toContainText('Then $259/year, including Card Club');
  await page.getByRole('button',{name:'Start my business trial'}).click(); await expect(page.getByRole('heading',{name:'Fixture checkout reached'})).toBeVisible();
  assert.equal(state.checkout[0].business.name,'QA Pizza'); assert.equal(state.checkout[0].cardClub,true); await close();
});
test('Google business selection captures the full listing; edits require a new selection and manual fallback works',async()=>{
  const {page,state,go,close}=await scenario(); await go('/start?plan=solo&billing=month');
  await expect(page.getByRole('textbox',{name:'Business name',exact:true})).toHaveCount(0);
  await page.getByLabel('Find your business on Google').fill('QA Pizza'); await page.getByRole('button',{name:/QA Pizza 123 Main St/}).click();
  await expect(page.locator('.co-selected-place')).toContainText('123 Main St, Claremont, CA');
  await page.getByLabel('Find your business on Google').fill('Another business'); await page.getByRole('button',{name:'Start my business trial'}).click(); assert.equal(state.checkout.length,0);
  await page.getByLabel('Find your business on Google').fill('QA Pizza'); await page.getByRole('button',{name:/QA Pizza 123 Main St/}).click();
  await page.getByRole('button',{name:'Start my business trial'}).click(); await expect(page.getByRole('heading',{name:'Fixture checkout reached'})).toBeVisible();
  assert.equal(state.checkout[0].business.googlePlaceId,'ChIJ_fixture');assert.equal(state.checkout[0].business.postalCode,'91711');assert.equal(state.checkout[0].business.city,'Claremont');assert.equal(state.checkout[0].business.address,'123 Main St, Claremont, CA 91711, USA');await close();
});
test('All template orientations fit print boundaries; portrait QR and editing controls work',async()=>{
  const {page,go,close}=await scenario();await go('/personal/design');
  const issues=await page.evaluate(async()=>{const api=await import('/src/lib/cardDesign.ts');const failures=[];for(const template of api.DESIGN_TEMPLATES)for(const orientation of ['landscape','portrait']){const d=api.newDraft(template.id);d.hosted=true;d.cards=[api.templateCard(template.id,orientation),api.templateCard(template.id,orientation)];const errors=api.checkDesign(d).filter(x=>x.level==='error');if(errors.length)failures.push({template:template.id,orientation,errors});}return failures;});assert.deepEqual(issues,[]);
  for(const name of ['Memes','Good energy','Halloween','Thanksgiving','Christmas','Networking']){await page.getByRole('button',{name,exact:true}).click();assert.ok(await page.locator('.cd-template-list button').count()>0);}
  await page.getByRole('button',{name:'Standing up',exact:true}).click();await expect(page.locator('.cd-canvas-wrap svg.cd-card')).toHaveAttribute('data-orientation','portrait');
  await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:'Place QR bottom center'}).click();await page.getByRole('button',{name:'Larger',exact:true}).click();
  await expect(page.getByLabel('QR size (mm)',{exact:true})).not.toBeVisible();
  const qr=page.locator('.cd-canvas-wrap [aria-label="Move QR code"]');const before=Number(await qr.locator('rect').first().getAttribute('y'));const box=await qr.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2-38,{steps:8});await page.mouse.up();assert.ok(Number(await qr.locator('rect').first().getAttribute('y'))<before);
  const corner=page.getByRole('button',{name:'Resize QR code'});const handle=await corner.boundingBox();const widthBefore=Number(await qr.locator('rect').first().getAttribute('width'));await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x-12,handle.y-12,{steps:8});await page.mouse.up();assert.ok(Number(await qr.locator('rect').first().getAttribute('width'))<widthBefore);
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert.ok(Math.abs(Number(await qr.locator('rect').first().getAttribute('width'))-widthBefore)<.01);
  await page.getByRole('button',{name:'Front',exact:true}).click();await page.getByRole('button',{name:'Add text',exact:true}).click();await screenshot(page,'designer-after-add-text',true);await page.getByLabel('Your words',{exact:true}).fill('Hello there.');await page.getByRole('button',{name:'Center across',exact:true}).click();
  await screenshot(page,'designer-portrait',true);await page.setViewportSize({width:390,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await screenshot(page,'designer-portrait-mobile',true);await close();
});
test('Old personal backend version keeps purchase disabled',async()=>{
  const {page,go,close}=await scenario({oldPersonalCatalog:true});await go('/personal/design');await page.getByRole('radio',{name:/Create my own TapAway hub/}).click();await page.getByRole('button',{name:'Review my cards'}).click();await page.getByRole('checkbox').check();await expect(page.getByRole('button',{name:'Buy my two cards'})).toBeDisabled();await close();
});
test('Designer exports four pages and checks out two cards without a subscription',async()=>{
  const {page,state,go,close}=await scenario(); await go('/personal/design');
  await page.getByRole('button',{name:'Standing up',exact:true}).click();
  await page.getByLabel('Card 1 destination',{exact:true}).fill('https://example.com/work'); await page.getByLabel('Card 2 destination',{exact:true}).fill('https://example.com/social');
  await page.getByRole('button',{name:'Review my cards'}).click(); await expect(page.getByRole('heading',{name:'One last look.'})).toBeVisible();
  const download=page.waitForEvent('download'); await page.getByRole('button',{name:'Download print PDF'}).click(); const file=await download;
  if(process.env.QA_SCREENSHOTS)await file.saveAs(path.join(process.env.QA_SCREENSHOTS,'two-cards-print.pdf'));
  await expect(page.getByRole('button',{name:'Buy my two cards'})).toBeDisabled(); await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Buy my two cards'}).click(); await expect(page.getByRole('heading',{name:'Fixture checkout reached'})).toBeVisible();
  assert.equal(state.personalOrders.length,1); assert.equal(state.personalOrders[0].draft.hosted,false); assert.equal(state.personalOrders[0].draft.cards.length,2); assert.ok(state.personalOrders[0].pdf.startsWith('JVBER')); await close();
});
test('Optional hub is explicit, uses a stable link, and adds $5 in the same personal order',async()=>{
  const {page,state,go,close}=await scenario(); await go('/personal/design'); await page.getByRole('radio',{name:/Create my own TapAway hub/}).click();
  await expect(page.getByText('tapaway.co/yourname',{exact:true})).toBeVisible(); await expect(page.getByLabel('Name on your hub')).toHaveCount(0); await expect(page.getByLabel(/Links to include/)).toHaveCount(0); await expect(page.getByLabel('Card 1 destination')).toHaveCount(0);
  await page.getByRole('button',{name:'Review my cards'}).click(); await expect(page.locator('.cd-checkout')).toContainText('$44'); await expect(page.locator('.cd-checkout')).toContainText('Then $5/month until canceled');
  await page.getByRole('checkbox').check(); await page.getByRole('button',{name:'Buy my two cards'}).click(); await expect(page.getByRole('heading',{name:'Fixture checkout reached'})).toBeVisible();
  assert.equal(state.personalOrders[0].draft.hosted,true); assert.equal(state.personalOrders[0].draft.hubName,''); assert.equal(state.personalOrders[0].draft.hubLinks,''); await close();
});
test('Low-resolution images block printing; an unavailable catalog blocks purchase only',async()=>{
  const {page,go,close}=await scenario({personalUnavailable:true}); await go('/personal/design');
  await page.getByLabel('Card 1 destination',{exact:true}).fill('example.com/a'); await page.getByLabel('Card 2 destination',{exact:true}).fill('example.com/b');
  const tiny=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=20;const x=c.getContext('2d');x.fillStyle='red';x.fillRect(0,0,20,20);return c.toDataURL('image/png').split(',')[1];});
  await page.locator('input[type=file]').setInputFiles({name:'tiny.png',mimeType:'image/png',buffer:Buffer.from(tiny,'base64')});
  await expect(page.locator('.cd-preflight')).toContainText('Make it smaller or upload a larger image'); await page.getByRole('button',{name:'Review my cards'}).click();
  await expect(page.getByRole('button',{name:'Download print PDF'})).toBeDisabled(); await expect(page.getByRole('button',{name:'Buy my two cards'})).toBeDisabled(); await expect(page.locator('.cd-checkout')).toContainText('Checkout is temporarily unavailable'); await close();
});
test('Five-question AI cap and direct human handoff retain the conversation',async()=>{
  const {page,state,go,close}=await scenario(); await go('/'); await page.getByRole('button',{name:'Have a question?'}).click();
  for(let i=0;i<5;i++) { await page.getByLabel('Your question',{exact:true}).fill('How do the cards work?'); await page.getByRole('button',{name:'Ask AI',exact:true}).click(); await expect(page.getByText(`${4-i} of 5 AI questions available today. AI can make mistakes.`)).toBeVisible(); }
  await expect(page.getByRole('button',{name:'Ask AI',exact:true})).toBeDisabled(); await page.getByRole('button',{name:'Talk to our team',exact:true}).click();
  await page.getByLabel('Your name',{exact:true}).fill('QA Shopper'); await page.getByLabel('Email for our reply').fill('shopper@example.invalid'); await page.getByLabel('How can we help?').fill('Can you help me with artwork?'); await page.getByRole('button',{name:'Send to our team',exact:true}).click();
  await expect(page.getByText("Message received. We'll reply to shopper@example.invalid.")).toBeVisible(); assert.equal(state.chat.at(-1).history.length,10); assert.equal(state.chat.at(-1).mode,'team'); await close();
});
test('Personal confirmation distinguishes pending payment from confirmed purchase',async()=>{
  const {page,state,go,close}=await scenario({personalPending:true}); await go('/personal/order?session_id=cs_test_fixture');
  await expect(page.getByText(/Payment confirmation is still pending/)).toBeVisible(); await expect(page.getByRole('heading',{name:'Your cards are in the works.'})).toHaveCount(0);
  state.personalPending=false; await page.getByRole('button',{name:'Check again'}).click(); await expect(page.getByRole('heading',{name:'Your cards are in the works.'})).toBeVisible(); assert.equal(state.personalOrders.length,0); await close();
});

test('Public question form saves one request and recovers from a failed save',async()=>{
  const {page,state,go,close}=await scenario({supportFailure:true});
  await go('/support?topic=personal#question');
  await expect(page.getByLabel('Message',{exact:true})).toHaveValue(/personal card design/);
  await page.getByLabel('Your name',{exact:true}).fill('QA Shopper');
  await page.getByLabel('Email',{exact:true}).fill('shopper@example.invalid');
  await page.getByLabel('Message',{exact:true}).fill('Can I use my existing artwork?');
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await expect(page.getByText("Something went wrong. Email us at tap@tapaway.co and we'll sort it out.")).toBeVisible();
  assert.equal(state.notifications,0);
  await expect(page.getByLabel('Message',{exact:true})).toHaveValue('Can I use my existing artwork?');
  state.supportFailure=false;
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await expect(page.getByText("Thanks for writing in. We'll reply by email.")).toBeVisible();
  assert.equal(state.notifications,1);assert.equal(state.support.at(-1)[0].description,'Can I use my existing artwork?');
  await close();
});

test('Dashboard access email errors stay retryable',async()=>{
  const {page,state,go,close}=await scenario({sendLinkFailure:true});
  await go('/support');
  await page.getByPlaceholder('The email you signed up with').fill('shopper@example.invalid');
  await page.getByRole('button',{name:'Send me access'}).click();
  await expect(page.getByText("We couldn't send the link. Try again or email tap@tapaway.co for help.")).toBeVisible();
  await expect(page.getByRole('button',{name:'Send me access'})).toBeEnabled();
  state.sendLinkFailure=false;
  await page.getByRole('button',{name:'Send me access'}).click();
  await expect(page.getByText('If your email matches an account, a secure link is on its way. Check your inbox and spam folder.')).toBeVisible();
  await close();
});

test('Welcome connection failure offers recovery without a second purchase',async()=>{
  const {page,state,go,close}=await scenario({welcome:'network_error'});
  await go('/welcome?session_id=fixture');
  await expect(page.getByRole('heading',{name:"Let's reconnect to your order."})).toBeVisible();
  await expect(page.getByText(/don't pay again/)).toBeVisible();
  state.welcome='verify_email';
  await page.getByRole('button',{name:'Check my order again'}).click();
  await expect(page.getByRole('heading',{name:'Check your email to continue'})).toBeVisible();
  assert.equal(state.checkout.length,0);
  await close();
});

test('Failed setup sign-in link stays retryable and does not claim success',async()=>{
  const {page,state,go,close}=await scenario({sendLinkFailure:true});
  await go('/welcome');
  await page.getByLabel('Email',{exact:true}).fill('shopper@example.invalid');
  await page.getByRole('button',{name:'Email me a sign-in link'}).click();
  await expect(page.getByRole('alert')).toContainText('We couldn’t send the link');
  state.sendLinkFailure=false;
  await page.getByRole('button',{name:'Email me a sign-in link'}).click();
  await expect(page.getByText("If there's an order for that email, a sign-in link is on its way.")).toBeVisible();
  await close();
});

test('Personal post-checkout setup collects name, optional artwork and shipping with save recovery',async()=>{
  const {page,state,go,close}=await scenario({authenticated:true,saved:{audience:'personal'},setupFailure:true});
  // Initial state failure is recoverable too.
  await go('/welcome');
  await expect(page.getByRole('heading',{name:"Let's reconnect to your order."})).toBeVisible();
  state.setupFailure=false;
  await page.getByRole('button',{name:'Check my order again'}).click();
  await expect(page.getByRole('heading',{name:'Tell us about you.'})).toBeVisible();
  await page.getByLabel('Your name or business name').fill('QA Studio');
  await page.getByLabel('City',{exact:true}).fill('San Diego');
  await page.getByLabel('Website or Instagram (optional)').fill('https://example.invalid');
  state.setupFailure=true;
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText("We couldn't save that");
  await expect(page.getByLabel('Your name or business name')).toHaveValue('QA Studio');
  state.setupFailure=false;
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Have a logo or profile image?'})).toBeVisible();
  await page.getByRole('button',{name:"Skip for now, I'll send it later"}).click();
  await expect(page.getByRole('heading',{name:'Shipping to'})).toBeVisible();
  for(const [label,value] of [['Name','QA Shopper'],['Address','123 Fixture St'],['City','San Diego'],['State','CA'],['ZIP code','92101']])await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole('button',{name:'Save address'}).click();
  await expect(page.getByRole('button',{name:/dashboard/i})).toBeVisible();
  assert.equal(state.setupWrites.at(-1).address.postal_code,'92101');
  assert.equal(state.setup.step,'done');
  await screenshot(page,'setup-complete');
  await close();
});


test('Real personal hero is eager, correctly sized, and replaces the pink/yellow placeholders',async()=>{
  const {page,go,close}=await scenario();await page.setViewportSize({width:390,height:844});await go('/personal');
  const img=page.locator('.sf-card-gallery img');await expect(img).toHaveAttribute('loading','eager');await expect(img).toHaveAttribute('fetchpriority','high');
  await expect.poll(()=>img.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
  assert.match(await img.getAttribute('src'),/personal-networking-and-meme-cards/);assert.equal(await page.locator('.sf-personal-stage, .sf-mini-card').count(),0);
  const dimensions=await img.boundingBox();assert.ok(Math.abs(dimensions.height/dimensions.width-1.5)<0.01);
  await expect(page.locator('.sf-skip')).toHaveCSS('clip-path','inset(50%)');await page.keyboard.press('Tab');await expect(page.locator('.sf-skip')).toBeFocused();await expect(page.locator('.sf-skip')).toHaveCSS('clip-path','none');await close();
});
test('First and returning visits have no advertising popup, SDK requests, or persistent analytics IDs',async()=>{
  const {page,state,go,close}=await scenario();
  await page.addInitScript(()=>{localStorage.setItem('tapaway_tracking_consent_v2',JSON.stringify({state:'accepted'}));localStorage.setItem('ta_vid','old');localStorage.setItem('ta_sid','old');localStorage.setItem('_trybe','old');document.cookie='_fbp=old; path=/';});
  await go('/');await page.locator('.sf-nav-links').getByRole('link',{name:'Personal',exact:true}).click();await expect(page.locator('.sf-card-gallery img')).toBeVisible();
  assert.ok(!state.external.some(u=>/connect.facebook|facebook.com\/tr|trybe|track.tapaway/.test(u)));
  const saved=await page.evaluate(()=>({keys:Object.keys(localStorage),cookies:document.cookie,scripts:[...document.scripts].map(x=>x.src)}));
  assert.ok(!saved.keys.some(k=>/^ta_(sid|vid|sid_ts)$|trybe|tapaway_tracking/.test(k)));assert.ok(!/_fbp=/.test(saved.cookies));
  assert.ok(!saved.scripts.some(u=>/facebook|trybe/.test(u)));assert.equal(await page.getByRole('button',{name:/accept.*tracking|cookie settings|decline.*tracking/i}).count(),0);
  await close();
});
test('Help and business checkout navigate without document reload or a dark loading surface',async()=>{
  const {page,state,go,close}=await scenario({chunkDelay:true});await go('/');
  await page.evaluate(()=>{window.__darkFrames=[];window.__sample=true;const check=()=>{if(!window.__sample)return;const bg=getComputedStyle(document.body).backgroundColor;const loader=document.querySelector('[role="status"].sf-route-loading');if(bg!=='rgb(255, 255, 255)')window.__darkFrames.push(bg);if(loader&&getComputedStyle(loader).backgroundColor!=='rgb(255, 255, 255)')window.__darkFrames.push('loader');requestAnimationFrame(check);};requestAnimationFrame(check);});
  await page.locator('.sf-nav-links').getByRole('link',{name:'Help',exact:true}).click();await expect(page.getByRole('heading',{name:'Support & Help'})).toBeVisible();
  await page.locator('.sf-nav-links').getByRole('link',{name:'Pricing',exact:true}).click();await expect(page.locator('#pricing')).toBeInViewport();
  await expect(page.locator('.sf-personal-pricing-callout')).toContainText('$39 once');await page.getByRole('button',{name:'Get my 4 cards',exact:true}).click();await expect(page.getByRole('heading',{name:'Your business order',exact:true})).toBeVisible();
  assert.deepEqual(state.documents,['/']);const dark=await page.evaluate(()=>{window.__sample=false;return window.__darkFrames;});assert.deepEqual(dark,[]);await close();
});
test('Mobile menu is a focused side panel with clear product paths and closes on navigation',async()=>{
  const {page,go,close}=await scenario();await page.setViewportSize({width:390,height:844});await go('/');await page.getByRole('button',{name:'Open menu'}).click();
  const menu=page.getByRole('navigation',{name:'Mobile navigation'});await expect(menu).toBeVisible();await expect(menu).toContainText('2 custom cards · $39 once');
  await expect.poll(async()=>{const b=await page.locator('.sf-mobile-sheet').boundingBox();return b.x>=0&&b.x+b.width<=391;}).toBe(true);await screenshot(page,'mobile-navigation');
  await page.keyboard.press('Escape');await expect(menu).toHaveCount(0);await expect(page.getByRole('button',{name:'Open menu'})).toBeFocused();
  await page.getByRole('button',{name:'Open menu'}).click();await menu.getByRole('link',{name:'Personal',exact:true}).click();await expect(menu).toHaveCount(0);await expect(page.locator('.sf-card-gallery')).toBeVisible();await close();
});
test('Halloween notice dismisses across routes; the fixed countdown expires without restarting',async()=>{
  const {page,go,close}=await scenario();await page.clock.install({time:new Date('2026-10-31T20:00:00Z')});await go('/');
  await expect(page.getByRole('complementary',{name:'Halloween offer'})).toBeVisible();await expect(page.locator('.sf-sale-countdown time')).toContainText('0d');
  await page.getByRole('button',{name:'Dismiss Halloween offer'}).click();await page.locator('.sf-nav-links').getByRole('link',{name:'Personal',exact:true}).click();await expect(page.locator('.sf-card-gallery')).toBeVisible();await expect(page.getByRole('complementary',{name:'Halloween offer'})).toHaveCount(0);
  await page.clock.setSystemTime(new Date('2026-11-01T06:59:59Z'));await page.clock.runFor(1000);await expect(page.locator('.sf-sale-countdown')).toHaveCount(0);
  await expect(page.locator('#pricing')).toContainText('$39');await close();
});
test('Support page offers the same assistant, question ideas, human contact and email',async()=>{
  const {page,state,go,close}=await scenario();await page.setViewportSize({width:390,height:844});await go('/support');
  await page.getByRole('button',{name:'Ask the AI helper'}).click();await page.getByRole('button',{name:'What is an NFC card?',exact:true}).click();await expect(page.getByLabel('Your question',{exact:true})).toHaveValue('What is an NFC card?');
  await page.getByRole('button',{name:'Ask AI',exact:true}).click();await expect(page.getByRole('log')).toContainText('$39 for two');assert.equal(state.chat[0].message,'What is an NFC card?');
  await page.getByRole('button',{name:'Talk to our team',exact:true}).click();await expect(page.getByLabel('Email for our reply')).toBeVisible();await expect(page.getByText('A real person will reply by email.',{exact:false})).toBeVisible();assert.equal(state.notifications,0);
  await page.getByRole('button',{name:'Close help'}).click();await expect(page.getByRole('link',{name:'Email our team',exact:true})).toHaveAttribute('href','mailto:tap@tapaway.co');await close();
});

(async()=>{
  process.chdir(root);
  const {createServer,loadEnv}=await import('vite');
  backendHost=new URL(loadEnv('production',root,'VITE_').VITE_SUPABASE_URL).hostname;
  server=await createServer({root,mode:'production',cacheDir:path.join(process.env.QA_SCREENSHOTS||root,'.vite-fixture'),optimizeDeps:{force:true},server:{host:'127.0.0.1',port:4173,strictPort:true}});
  await server.listen();base='http://127.0.0.1:4173';
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:JSON.parse(process.env.BROWSER_ARGS||'[]')});
  const selected=process.env.QA_FILTER?cases.filter(c=>new RegExp(process.env.QA_FILTER).test(c.name)):cases;
  for(const {name,run} of selected){await run();passed++;console.log(`PASS ${name}`);}
  console.log(`${passed}/${selected.length} storefront checks passed. All external network activity was mocked or blocked.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();await server?.close();});
