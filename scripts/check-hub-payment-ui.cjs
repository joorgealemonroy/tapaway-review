/* Browser regressions for the existing-card payment gate.
 * All external requests are mocked or blocked. No customer mutations or payments.
 * Uses the same PLAYWRIGHT_MODULE / BROWSER_EXECUTABLE / BROWSER_ARGS as check-storefront.cjs.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { mkdirSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { expect } = require((process.env.PLAYWRIGHT_MODULE || 'playwright') + '/test');
const root = path.resolve(__dirname, '..');
const id = '22222222-2222-4222-8222-222222222222';
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const offer = { profileId: id, slug: 'qa-burger', name: 'QA Burger Co.', photoUrl: null, headerUrl: null, amount: 2000, currency: 'usd', interval: 'month', cardCount: 4, visits: 177, googleClicks: 31, yelpClicks: 19, instagramClicks: 8, totalClicks: 78, directionsClicks: 20, contactSaves: 0, historicalViews: 12, since: '2026-10-01T00:00:00Z', lastActivityAt: '2026-10-21T00:00:00Z' };
const preview = { id, username: offer.slug, full_name: offer.name, profile_photo_url: null, header_image_url: null, subscription_status: 'trialing', is_approved: true };
const hubs = [
  { id, kind: 'personal', name: offer.name, slug: offer.slug, payment_state: 'unknown_manual', subscription_status: 'trialing', stripe_subscription_id: null, is_approved: true, created_at: '2026-01-01T00:00:00Z', views: 177, clicks: 78, photo_url: null },
  { id: '33333333-3333-4333-8333-333333333333', kind: 'personal', name: 'Gift fixture', slug: 'gift-fixture', payment_state: 'complimentary', subscription_status: 'trialing', stripe_subscription_id: null, is_approved: true, views: 2, clicks: 1, photo_url: null },
  { id: '44444444-4444-4444-8444-444444444444', kind: 'personal', name: 'Paid fixture', slug: 'paid-fixture', payment_state: 'paying', subscription_status: 'active', stripe_subscription_id: 'sub_fixture', is_approved: true, views: 3, clicks: 1, photo_url: null },
];
let browser, server, base, backendHost;
const cases = [];
const test = (name, run) => cases.push({ name, run });

async function scenario(options = {}) {
  const state = { admin: false, authenticated: false, available: true, summaryFails: false, checkoutFails: false, requireFails: false, payment: { paid: false, active: false }, requests: [], privateReads: 0, errors: [], hubs: structuredClone(hubs), ...options };
  const context = await browser.newContext({ viewport: { width: options.width || 390, height: 900 }, serviceWorkers: 'block' });
  if (state.authenticated) await context.addInitScript(({ host, user }) => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = [{ alg: 'HS256', typ: 'JWT' }, { sub: user.id, exp, role: 'authenticated' }, 'fixture'].map((v, i) => i < 2 ? btoa(JSON.stringify(v)).replaceAll('=', '') : v).join('.');
    localStorage.setItem(`sb-${host.split('.')[0]}-auth-token`, JSON.stringify({ access_token: token, refresh_token: 'fixture', expires_at: exp, expires_in: 3600, token_type: 'bearer', user }));
  }, { host: backendHost, user });
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.origin === base) return route.continue();
    if (url.hostname === 'checkout.stripe.com') return route.fulfill({ contentType: 'text/html', body: '<h1>Mock secure checkout</h1>' });
    if (url.hostname !== backendHost) return route.abort();
    if (url.pathname.endsWith('/auth/v1/user')) return reply(user);
    if (url.pathname.endsWith('/rpc/is_admin')) return reply(state.admin);
    if (url.pathname.endsWith('/rpc/get_public_personal_profile')) return reply([]);
    if (url.pathname.endsWith('/rpc/get_public_personal_profile_status')) return reply([preview]);
    if (url.pathname.endsWith('/rpc/get_public_restaurant_hub') || url.pathname.endsWith('/rpc/get_public_restaurant_hub_status')) return reply([]);
    if (url.pathname.endsWith('/personal_profiles')) { state.privateReads++; return reply({ ...preview, user_id: user.id, payment_state: 'payment_required' }); }
    if (url.pathname.endsWith('/rpc/admin_workspace_hubs')) return reply(state.hubs);
    if (url.pathname.endsWith('/admin-billing-summary')) return reply({ mrr_cents: 100000, active_count: 50, trialing_count: 0, past_due_count: 0, excluded_count: 0, updated_at: new Date().toISOString(), methodology: 'Fixture' });
    if (url.pathname.endsWith('/rpc/admin_workspace_insights')) return reply({ site_views: 0, hub_views: 0, visit_sessions: 0, link_clicks: 0, excluded: 0, raw_events: 0 });
    if (url.pathname.endsWith('/hub-payment-request')) {
      const body = req.postDataJSON(); state.requests.push(body);
      if (body.action === 'summary') return state.summaryFails ? reply({ error: 'Unavailable' }, 503) : reply({ offer: state.noOffer ? null : offer, checkoutAvailable: state.available });
      if (body.action === 'checkout') return state.checkoutFails ? reply({ error: 'Unavailable' }, 503) : reply({ url: 'https://checkout.stripe.com/c/pay/cs_test_fixture' });
      if (body.action === 'status') return state.statusFails ? reply({ error: 'Unavailable' }, 503) : reply(state.payment);
      if (body.action === 'require') {
        if (state.requireFails) return reply({ error: 'This hub has existing billing. Check the account before making changes.' }, 409);
        state.hubs[0].payment_state = 'payment_required'; return reply({ ok: true });
      }
    }
    if (url.pathname.endsWith('/track')) return reply({ ok: true });
    if (url.pathname.includes('/rest/v1/')) return reply(req.headers()['accept']?.includes('vnd.pgrst.object') ? null : []);
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => state.errors.push(error.message));
  const go = url => page.goto(base + url, { waitUntil: 'networkidle' });
  const close = async () => { assert.deepEqual(state.errors, []); await context.close(); };
  return { page, state, go, close };
}
async function noOverflow(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Page must fit viewport'); }
async function shot(page, name, fullPage = true) { if (process.env.QA_SCREENSHOTS) { mkdirSync(process.env.QA_SCREENSHOTS, { recursive: true }); await page.screenshot({ path: path.join(process.env.QA_SCREENSHOTS, name + '.png'), fullPage }); } }

for (const width of [320, 390, 1440]) test(`Paused visitor and owner offer fit ${width}px`, async () => {
  const { page, state, go, close } = await scenario({ width });
  await go('/qa-burger');
  await expect(page.getByRole('heading', { name: 'This TapAway page is paused.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activate for $20/month' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Do you own this business?' }).click();
  await expect(page.getByText('177', { exact: true })).toBeVisible();
  await expect(page.getByText('31', { exact: true })).toBeVisible();
  await expect(page.getByText('19', { exact: true })).toBeVisible();
  await expect(page.getByText('8', { exact: true })).toBeVisible();
  await expect(page.getByText(/not confirmed reviews or unique customers/)).toBeVisible();
  await expect(page.getByText(/\$20 charged today, then monthly until canceled/)).toBeVisible();
  assert.equal(state.privateReads, 0);
  await expect(page.getByText('Directions clicks', { exact: true })).toBeVisible();
  await expect(page.getByText('Contact saves', { exact: true })).toHaveCount(0);
  const sticky = page.getByRole('button', { name: 'Activate', exact: true });
  if (width < 640) {
    await expect(sticky).toBeVisible();
    const bounds = await sticky.boundingBox();
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 900 && bounds.x >= 0 && bounds.x + bounds.width <= width, 'Activation remains fully within the mobile viewport');
  } else await expect(sticky).toBeHidden();
  await noOverflow(page); await shot(page, `payment-offer-${width}`);
  if (width < 640) await shot(page, `payment-offer-viewport-${width}`, false);
  if (width === 390) {
    // Both controls share one in-flight lock, even within the same event turn.
    await page.evaluate(() => {
      document.querySelector('button[aria-label="Activate"]').click();
      [...document.querySelectorAll('button')].find(button => button.textContent.includes('Activate for $20/month')).click();
    });
  } else if (width < 640) await sticky.click();
  else await page.getByRole('button', { name: 'Activate for $20/month' }).click();
  await expect(page.getByRole('heading', { name: 'Mock secure checkout' })).toBeVisible();
  assert.deepEqual(state.requests.filter(x => x.action === 'checkout'), [{ action: 'checkout', slug: 'qa-burger' }]);
  await close();
});

test('Unverified success query never displays paid or active and cannot create another checkout', async () => {
  const { page, state, go, close } = await scenario();
  await go('/qa-burger?activation=success&session_id=cs_test_fixture');
  await expect(page.getByText(/Payment hasn’t been confirmed yet/)).toBeVisible();
  await expect(page.getByText('Payment confirmed. Your page is active.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Activate for $20/month' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Activate', exact: true })).toHaveCount(0);
  assert.equal(state.requests.filter(x => x.action === 'checkout').length, 0); await close();
});

test('Confirmed payment waits for activation, then opens the same hub', async () => {
  const { page, state, go, close } = await scenario({ payment: { paid: true, active: false } });
  await go('/qa-burger?activation=success&session_id=cs_test_fixture');
  await expect(page.getByText('Payment confirmed. We’re finishing the setup for your page.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open my page' })).toHaveCount(0);
  state.payment = { paid: true, active: true };
  await page.getByRole('button', { name: 'Refresh status' }).click();
  await expect(page.getByText('Payment confirmed. Your page is active.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open my page' })).toHaveAttribute('href', '/qa-burger'); await close();
});

test('Unknown status fails safely with retry and no duplicate checkout', async () => {
  const { page, state, go, close } = await scenario({ statusFails: true });
  await go('/qa-burger?activation=success&session_id=cs_test_fixture');
  await expect(page.getByText(/If you’ve paid, please don’t pay again/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activate for $20/month' })).toHaveCount(0);
  state.statusFails = false; state.payment = { paid: true, active: true };
  await page.getByRole('button', { name: 'Try checking again' }).click();
  await expect(page.getByText('Payment confirmed. Your page is active.')).toBeVisible(); await close();
});

test('Missing catalog disables checkout; checkout failure gives a retry', async () => {
  const { page, state, go, close } = await scenario({ available: false });
  await go('/qa-burger'); await page.getByRole('button', { name: 'Do you own this business?' }).click();
  await expect(page.getByRole('button', { name: 'Activate for $20/month' })).toBeDisabled();
  state.available = true; state.checkoutFails = true;
  await go('/qa-burger'); await page.getByRole('button', { name: 'Do you own this business?' }).click();
  await page.getByRole('button', { name: 'Activate for $20/month' }).click();
  await expect(page.getByRole('alert')).toContainText('We couldn’t open secure checkout');
  await expect(page.getByRole('button', { name: 'Activate for $20/month' })).toBeEnabled(); await close();
});

test('Offer failure does not invent zero activity or offer checkout', async () => {
  const { page, state, go, close } = await scenario({ summaryFails: true });
  await go('/qa-burger'); await expect(page.getByText('We couldn’t load the owner options.')).toBeVisible();
  await expect(page.getByText('Hub views', { exact: true })).toHaveCount(0);
  state.summaryFails = false; await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Do you own this business?' })).toBeVisible(); await close();
});

for (const admin of [false, true]) test(`Signed-in ${admin ? 'admin' : 'owner'} still sees the public gate on the normal link`, async () => {
  const { page, state, go, close } = await scenario({ authenticated: true, admin });
  await go('/qa-burger'); await expect(page.getByRole('button', { name: 'Do you own this business?' })).toBeVisible();
  assert.equal(state.privateReads, 0); await close();
});

for (const width of [320, 1440]) test(`Admin confirmation targets one eligible hub and respects billing protection at ${width}px`, async () => {
  const { page, state, go, close } = await scenario({ authenticated: true, admin: true, width });
  await go('/admin?section=accounts');
  await expect(page.getByRole('button', { name: 'Require payment', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Require payment', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('QA Burger Co.'); await expect(dialog).toContainText('$20/month');
  await expect(dialog.getByRole('button', { name: 'Require payment', exact: true })).toHaveCSS('color', 'rgb(255, 253, 247)');
  await dialog.getByRole('button', { name: 'Keep as is' }).click();
  assert.equal(state.requests.filter(x => x.action === 'require').length, 0);
  await page.getByRole('button', { name: 'Require payment', exact: true }).click();
  state.requireFails = true;
  await dialog.getByRole('button', { name: 'Require payment', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('existing billing');
  await noOverflow(page); await shot(page, `admin-payment-dialog-${width}`);
  state.requireFails = false;
  await dialog.getByRole('button', { name: 'Require payment', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.aw-directory').getByText('Payment required', { exact: true })).toBeVisible();
  assert.deepEqual(state.requests.filter(x => x.action === 'require').at(-1), { action: 'require', profileId: id, confirm: true });
  assert.equal(state.hubs[1].payment_state, 'complimentary'); assert.equal(state.hubs[2].payment_state, 'paying');
  await noOverflow(page); await shot(page, `admin-payment-required-${width}`); await close();
});

(async () => {
  process.chdir(root);
  const { createServer, loadEnv } = await import('vite');
  backendHost = new URL(loadEnv('production', root, 'VITE_').VITE_SUPABASE_URL).hostname;
  server = await createServer({ root, mode: 'production', cacheDir: '/tmp/tapaway-hub-payment-vite', server: { host: '127.0.0.1', port: 4177, strictPort: true } });
  await server.listen(); base = 'http://127.0.0.1:4177';
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}), args: JSON.parse(process.env.BROWSER_ARGS || '[]') });
  let count = 0;
  const selected = process.env.QA_FILTER ? cases.filter(x => new RegExp(process.env.QA_FILTER).test(x.name)) : cases;
  for (const { name, run } of selected) { await run(); count++; console.log(`PASS ${name}`); }
  console.log(`${count}/${selected.length} hub payment browser checks passed. External requests were mocked or blocked.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); await server?.close(); });
