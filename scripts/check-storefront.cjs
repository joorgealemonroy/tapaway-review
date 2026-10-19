/* Nontransactional browser checks: all external requests are fulfilled or blocked.
 * Install Playwright in a separate tooling directory, then set PLAYWRIGHT_MODULE.
 * Or set PLAYWRIGHT_MODULE to an installed Playwright package path.
 * Optional: BROWSER_EXECUTABLE, BROWSER_ARGS (JSON array), QA_SCREENSHOTS.
 */
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { expect } = require((process.env.PLAYWRIGHT_MODULE || 'playwright') + '/test');
const root = path.resolve(__dirname, '..');
const catalog = ['solo', 'venue'].flatMap(plan => ['month', 'year'].map(interval => ({
  plan, interval, amount: plan === 'solo' ? (interval === 'month' ? 2000 : 19900) : (interval === 'month' ? 3900 : 39000),
  currency: 'usd', trialDays: 14, available: true,
})));
const fakeUser = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'shopper@example.invalid', app_metadata: {provider:'email'}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
let browser, server, base, backendHost;
let passed = 0;
const cases = [];
const test = (name, run) => cases.push({ name, run });

async function scenario(options = {}) {
  const context = await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  const state = { catalog: structuredClone(catalog), checkout: [], support: [], notifications: 0, errors: [], welcome:'sign_in', setup:{step:'business',business_name:null,business_address:null,shipping_address:null,logo_url:null}, setupWrites:[], ...options };
  await context.addInitScript(({saved,authenticated,backendHost,fakeUser}) => {
    localStorage.setItem('tapaway_tracking_consent_v2',JSON.stringify({state:'declined',visitor:'qa',at:new Date().toISOString(),noticeVersion:'2026-10-14'}));
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
      if(url.pathname==='/qa-checkout')return route.fulfill({contentType:'text/html',body:'<h1>Fixture checkout reached</h1>'});
      return route.continue();
    }
    // Nothing may escape this fixture boundary, including analytics and email.
    if(url.hostname!==backendHost)return route.abort();
    if(url.pathname.endsWith('/onboarding-plan-catalog'))return state.catalogFailure ? reply({error:'Fixture unavailable'},503) : reply({catalog:state.catalog});
    if(url.pathname.endsWith('/app_settings'))return reply({paywall_enabled:true,onboarding_default_billing:'year'});
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
      if(state.setupFailure)return reply({error:"We couldn't save that. Please try again."},503);
      if(data.action==='business')Object.assign(state.setup,{business_name:data.businessName,step:'logo'});
      if(data.action==='logo')Object.assign(state.setup,{logo_url:data.logoUrl||null,step:'shipping'});
      if(data.action==='shipping')Object.assign(state.setup,{shipping_address:data.address,step:'done'});
      return reply({session:state.setup});
    }
    if(url.pathname.endsWith('/support_requests')) {
      state.support.push(request.postDataJSON());
      return state.supportFailure ? reply({message:'Fixture unavailable'},503) : reply(null,201);
    }
    if(url.pathname.endsWith('/support-notification')) { state.notifications++;return reply({ok:true}); }
    if(url.pathname.endsWith('/request-dashboard-access'))return state.sendLinkFailure ? reply({error:'Fixture unavailable'},503) : reply({ok:true});
    if(url.pathname.endsWith('/auth/v1/user'))return reply(fakeUser);
    if(url.pathname.includes('/rest/v1/')) {
      return reply(request.headers()['accept']?.includes('vnd.pgrst.object') ? null : []);
    }
    if(url.pathname.endsWith('/track'))return reply({ok:true});
    return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',e=>state.errors.push(e.message));
  const go=async url=>page.goto(base+url,{waitUntil:'networkidle'});
  const close=async()=>{assert.deepEqual(state.errors,[],'No uncaught browser errors');await context.close();};
  return {page,state,go,close};
}
async function screenshot(page,name,fullPage=false){if(process.env.QA_SCREENSHOTS){mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,name+'.png'),fullPage});}}

for(const plan of ['solo','venue'])for(const interval of ['year','month']) test(`${plan}/${interval}: pricing selection reaches checkout with exact offer`,async()=>{
  const {page,state,go,close}=await scenario();
  await go('/?utm_source=qa&utm_campaign=storefront');
  const price=page.locator('#pricing');
  await price.getByRole('button',{name:interval==='year'?'Yearly':'Monthly',exact:true}).click();
  await price.getByRole('button',{name:`Get my ${plan==='solo'?4:15} cards`,exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your order',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:interval==='year'?'Yearly':'Monthly',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{name:new RegExp(`^${plan==='solo'?4:15} cards`)})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  const item=catalog.find(i=>i.plan===plan&&i.interval===interval);
  await expect(page.getByRole('complementary')).toContainText(`$${item.amount/100}/${interval==='year'?'year':'month'}`);
  await page.getByRole('button',{name:'Continue to secure checkout'}).click();
  await expect(page.getByRole('heading',{name:'Fixture checkout reached'})).toBeVisible();
  assert.equal(state.checkout.length,1);assert.equal(state.checkout[0].plan,plan);assert.equal(state.checkout[0].interval,interval);assert.equal(state.checkout[0].cardClub,false);assert.equal(state.checkout[0].attribution.utm_source,'qa');
  await close();
});

test('Canceled checkout restores Stripe cycle, quantity and chosen Card Club; errors allow retry',async()=>{
  const {page,state,go,close}=await scenario({saved:{billingInterval:'year',cardClubSelected:true},checkoutFailure:true});
  await go('/onboarding?plan=venue&cycle=month&canceled=1');
  await expect(page.getByRole('button',{name:'Monthly',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('checkbox')).toBeChecked();
  await expect(page.getByRole('complementary')).toContainText('With Card Club: $44.00/month');
  await page.getByRole('button',{name:'Continue to secure checkout'}).click();
  await expect(page.getByRole('alert')).toContainText('Checkout is temporarily unavailable');
  assert.equal(state.checkout[0].cardClub,true);
  state.checkoutFailure=false;
  await page.getByRole('button',{name:'Continue to secure checkout'}).click();
  await expect(page.getByRole('heading',{name:'Fixture checkout reached'})).toBeVisible();
  await close();
});

test('Catalog failure pauses both storefront and checkout; retry recovers',async()=>{
  const {page,state,go,close}=await scenario({catalogFailure:true});
  await go('/');
  await expect(page.getByRole('button',{name:'Get my 4 cards',exact:true})).toBeDisabled();
  await go('/onboarding?plan=solo&billing=year');
  await expect(page.getByRole('button',{name:'Continue to secure checkout'})).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText("We couldn't load prices");
  state.catalogFailure=false;
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.getByRole('button',{name:'Continue to secure checkout'})).toBeEnabled();
  assert.equal(state.checkout.length,0);
  await close();
});

test('Missing/unavailable prices cannot enable checkout; a valid interval can',async()=>{
  const {page,go,close}=await scenario({catalog:catalog.filter(i=>!(i.plan==='venue'&&i.interval==='year')).map(i=>({...i,available:i.interval==='month'}))});
  await go('/onboarding?plan=solo&billing=year');
  await expect(page.getByRole('button',{name:'Continue to secure checkout'})).toBeDisabled();
  await go('/onboarding?plan=venue&billing=year');
  await expect(page.getByRole('button',{name:'Continue to secure checkout'})).toBeDisabled();
  await page.getByRole('button',{name:'Monthly',exact:true}).click();
  await expect(page.getByRole('button',{name:'Continue to secure checkout'})).toBeEnabled();
  await close();
});

test('Personal route keeps its audience and subscription disclosure',async()=>{
  const {page,go,close}=await scenario();
  await go('/personal');
  await expect(page.locator('#pricing')).toContainText('This is a subscription plan.');
  await expect(page.getByRole('button',{name:'Get my 15 cards'})).toHaveCount(0);
  await screenshot(page,'personal-desktop');
  await page.getByRole('button',{name:'Get my 4 cards',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your order',exact:true})).toBeVisible();
  assert.equal(new URL(page.url()).searchParams.get('audience'),'personal');
  await expect(page.getByRole('link',{name:'Back to plans'})).toHaveAttribute('href','/personal#pricing');
  await close();
});

test('Interactive demo, mobile menu, and responsive pages work without overflow',async()=>{
  const {page,go,close}=await scenario();
  await go('/');
  await page.getByRole('button',{name:'Barber',exact:true}).click();
  await expect(page.getByRole('button',{name:'Book your next cut'})).toBeVisible();
  await page.getByRole('button',{name:'Visit website',exact:true}).click();
  await expect(page.getByRole('heading',{name:'One hub. The links you choose.'})).toBeVisible();
  for(const width of [1440,768,390,360]) {
    await page.setViewportSize({width,height:900});
    for(const route of ['/','/personal','/onboarding?plan=solo&billing=year','/support','/examples','/faq']){
      await go(route);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${route} overflows at ${width}`);
      if(width===1440&&route==='/')await screenshot(page,'home-desktop');
      if(width===390&&route==='/')await screenshot(page,'home-mobile');
      if(width===390&&route.startsWith('/onboarding'))await screenshot(page,'order-mobile',true);
    }
  }
  await go('/');
  await page.getByRole('button',{name:'Open menu'}).click();
  await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toHaveCount(0);
  await close();
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

(async()=>{
  process.chdir(root);
  const {createServer,loadEnv}=await import('vite');
  backendHost=new URL(loadEnv('production',root,'VITE_').VITE_SUPABASE_URL).hostname;
  server=await createServer({root,mode:'production',server:{host:'127.0.0.1',port:4173,strictPort:true}});
  await server.listen();base='http://127.0.0.1:4173';
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:JSON.parse(process.env.BROWSER_ARGS||'[]')});
  for(const {name,run} of cases){await run();passed++;console.log(`PASS ${name}`);}
  console.log(`${passed}/${cases.length} storefront checks passed. All external network activity was mocked or blocked.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();await server?.close();});
