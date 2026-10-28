/* Isolated client security regressions. Executes real helpers and auth-screen
 * effects with fixture storage, providers and navigation; no external requests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let checks = 0;
const pass = async (name, run) => { await run(); checks++; console.log(`PASS ${name}`); };
const flush = () => new Promise(resolve => setImmediate(resolve));
const textOf = node => node == null || typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(textOf).join(' ') : typeof node === 'object' ? textOf(node.props?.children) : String(node);

function environment(href = 'https://fixture.invalid/dashboard') {
  let url = new URL(href);
  const env = { index: 0, values: [], effects: [], cache: new Map(), stored: new Map(), storageBlocked: false, calls: [], logs: [], navigations: [], welcome: { status: 'verify_email', emailHint: 'q***@example.invalid', token_hash: 'unexpected-fixture-token' } };
  env.storage = {
    getItem(key) { if (env.storageBlocked) throw new Error('Storage blocked'); return env.stored.get(key) ?? null; },
    setItem(key, value) { if (env.storageBlocked) throw new Error('Storage blocked'); env.stored.set(key, value); },
    removeItem(key) { if (env.storageBlocked) throw new Error('Storage blocked'); env.stored.delete(key); },
  };
  const location = { get href() { return url.href; }, set href(value) { env.navigations.push(value); url = new URL(value, url); }, get hash() { return url.hash; }, get pathname() { return url.pathname; }, get search() { return url.search; }, get origin() { return url.origin; } };
  env.window = { location, history: { state: null, replaceState(_state, _title, next) { url = new URL(next, url); } } };
  env.react = {
    useState(initial) { const i = env.index++; if (!(i in env.values)) env.values[i] = typeof initial === 'function' ? initial() : initial; return [env.values[i], next => { env.values[i] = typeof next === 'function' ? next(env.values[i]) : next; }]; },
    useRef(initial) { const i = env.index++; if (!(i in env.values)) env.values[i] = { current: initial }; return env.values[i]; },
    useEffect(fn) { env.effects.push(fn); }, useCallback: fn => fn,
  };
  env.auth = {};
  for (const method of ['initialize', 'verifyOtp', 'exchangeCodeForSession', 'setSession', 'updateUser', 'signUp', 'signInWithOtp', 'resetPasswordForEmail']) env.auth[method] = async function (...args) { env.calls.push({ method, args, correctReceiver: this === env.auth }); return { error: env.failure === method ? new Error('Fixture rejected') : null }; };
  env.auth.getUser = async () => { env.calls.push({ method: 'getUser' }); return { data: { user: { id: 'existing-fixture-user' } }, error: null }; };
  env.auth.getSession = async () => ({ data: { session: null } });
  return env;
}

function load(relative, env) {
  if (env.cache.has(relative)) return env.cache.get(relative);
  const exports = {};
  env.cache.set(relative, exports);
  const jsx = (type, props) => ({ type, props: props || {} });
  const generic = new Proxy({}, { get: (_, key) => String(key) });
  const requireFixture = name => {
    if (name === 'react') return env.react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === 'react-router-dom') return { useSearchParams: () => [new URLSearchParams(env.window.location.search)], useNavigate: () => path => env.navigations.push(path), Link: 'Link' };
    if (name === '@/integrations/supabase/client') return { supabase: { auth: env.auth } };
    if (['@/lib/clientSecurity', '@/lib/checkoutAttempt', '@/lib/authGuard'].includes(name)) return load(`src/lib/${name.split('/').pop()}.ts`, env);
    if (name === '@/lib/paymentFirst') return { callFunction: async (name, body) => { env.calls.push({ method: name, body }); return { ok: true, data: env.welcome }; } };
    if (name === '@/lib/analytics') return { track() {} };
    return generic;
  };
  const source = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { exports, require: requireFixture, URL, URLSearchParams, Error, TextEncoder, crypto: webcrypto, Uint8Array, setTimeout, clearTimeout,
    window: env.window, sessionStorage: env.storage, localStorage: env.storage,
    console: { log: (...args) => env.logs.push(args), info: (...args) => env.logs.push(args), error: (...args) => env.logs.push(args), warn: (...args) => env.logs.push(args) },
    fetch: () => { throw new Error('Unexpected external request'); },
  }, { filename: relative });
  return exports;
}
function render(Component, env) { env.index = 0; env.effects = []; return Component(); }

(async () => {
  await pass('Internal redirects reject alternate origins, raw controls and slash confusion', () => {
    const { safeInternalPath } = load('src/lib/clientSecurity.ts', environment());
    for (const value of ['https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/\t/evil.invalid', '/\n/evil.invalid', '/\r/evil.invalid', '/\0/evil.invalid', ' /dashboard', '/ dashboard', undefined, null, {}]) assert.equal(safeInternalPath(value), '/dashboard');
    assert.equal(safeInternalPath('/a/../dashboard?tab=plan#billing'), '/dashboard?tab=plan#billing');
    assert.equal(safeInternalPath('/welcome?session_id=fixture'), '/welcome?session_id=fixture');
  });
  await pass('Diagnostics redact auth URLs, bearer credentials, passwords, keys and emails', () => {
    const { redactDiagnostic, diagnosticRoute } = load('src/lib/clientSecurity.ts', environment('https://fixture.invalid/auth?token_hash=private-marker#access_token=other-marker'));
    const samples = [
      ['Failed at https://fixture.invalid/auth?token_hash=private-marker#extra', 'private-marker'],
      ['Route /welcome?session_id=checkout-marker', 'checkout-marker'],
      ['Bearer bearer-marker', 'bearer-marker'],
      ['{"password":"fixture-password-marker", "refresh_token":"fixture-refresh-marker"}', 'fixture-password-marker', 'fixture-refresh-marker'],
      ['token_hash=hash-marker&session_id=session-marker', 'hash-marker', 'session-marker'],
      ['Hello person@example.invalid', 'person@example.invalid'],
      [['sk', 'test', 'fixturekeymarker'].join('_'), 'fixturekeymarker'],
      [['eyJfixture', 'fixturepayload', 'fixturesignature'].join('.'), 'fixturesignature'],
    ];
    for (const [input, ...markers] of samples) { const output = redactDiagnostic(input); for (const marker of markers) assert.ok(!output.includes(marker), 'Sensitive diagnostic marker must be removed'); }
    assert.equal(diagnosticRoute(), '/auth');
    assert.equal(redactDiagnostic(new Error('Network unavailable')), 'Network unavailable');
  });
  await pass('Captured auth credentials leave the address bar while harmless routing survives', () => {
    const env = environment('https://fixture.invalid/auth/set-password?token_hash=hash-marker&code=code-marker&redirect=%2Fdashboard#access_token=access-marker&refresh_token=fixture-refresh-marker');
    load('src/lib/clientSecurity.ts', env).clearAuthUrlCredentials();
    assert.equal(env.window.location.href, 'https://fixture.invalid/auth/set-password?redirect=%2Fdashboard');
  });
  const selection = { plan: 'solo', interval: 'month', cardClub: false, business: { name: 'Private fixture company', email: 'person@example.invalid', address: { city: 'Fixture City', state: 'CA' } } };
  await pass('Checkout retries and reordered nested selections reuse a UUID without storing PII', async () => {
    const env = environment(), { getCheckoutAttemptId } = load('src/lib/checkoutAttempt.ts', env);
    const first = await getCheckoutAttemptId(selection);
    const reordered = { business: { address: { state: 'CA', city: 'Fixture City' }, email: 'person@example.invalid', name: 'Private fixture company' }, cardClub: false, interval: 'month', plan: 'solo' };
    assert.equal(await getCheckoutAttemptId(reordered), first);
    assert.equal(await getCheckoutAttemptId(selection), first);
    assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    const stored = JSON.parse([...env.stored.values()][0]);
    assert.deepEqual(Object.keys(stored).sort(), ['fingerprint', 'id']); assert.match(stored.fingerprint, /^[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(stored).includes('Private fixture')); assert.ok(!JSON.stringify(stored).includes('person@example.invalid'));
    const reloaded = environment(); reloaded.stored = new Map(env.stored);
    assert.equal(await load('src/lib/checkoutAttempt.ts', reloaded).getCheckoutAttemptId(selection), first);
  });
  await pass('Changed selection and explicit completion reset produce new checkout attempts', async () => {
    const env = environment(), api = load('src/lib/checkoutAttempt.ts', env);
    const first = await api.getCheckoutAttemptId(selection);
    const changed = await api.getCheckoutAttemptId({ ...selection, cardClub: true }); assert.notEqual(changed, first);
    api.clearCheckoutAttempt(); assert.equal(env.stored.size, 0);
    assert.notEqual(await api.getCheckoutAttemptId({ ...selection, cardClub: true }), changed);
  });
  await pass('Blocked browser storage preserves in-memory retry identity and reset semantics', async () => {
    const env = environment(); env.storageBlocked = true;
    const api = load('src/lib/checkoutAttempt.ts', env), first = await api.getCheckoutAttemptId(selection);
    assert.equal(await api.getCheckoutAttemptId(selection), first); assert.equal(env.stored.size, 0);
    api.clearCheckoutAttempt(); assert.notEqual(await api.getCheckoutAttemptId(selection), first);
  });
  await pass('Auth guard blocks default email methods and permits only explicit hash verification', async () => {
    const env = environment(), api = load('src/lib/authGuard.ts', env);
    api.installAuthGuard(); api.installAuthGuard();
    for (const method of ['signUp', 'signInWithOtp', 'resetPasswordForEmail', 'verifyOtp']) { const result = await env.auth[method]({ email: 'private-fixture-marker' }); assert.ok(result.error); }
    assert.equal(env.calls.length, 0); assert.ok(!JSON.stringify(env.logs).includes('private-fixture-marker'));
    await api.verifyTokenHash('hash-fixture-marker', 'recovery'); assert.equal(env.calls.length, 1); assert.equal(env.calls[0].method, 'verifyOtp'); assert.equal(env.calls[0].args[0].type, 'recovery'); assert.equal(env.calls[0].correctReceiver, true);
    api.uninstallAuthGuard(); await env.auth.verifyOtp({ token_hash: 'second-fixture-marker', type: 'email' }); assert.equal(env.calls.length, 2);
  });
  await pass('Rejected recovery credentials cannot fall back to an existing signed-in user', async () => {
    for (const [suffix, failedMethod] of [['?token_hash=invalid-fixture', 'verifyOtp'], ['?code=invalid-fixture', 'exchangeCodeForSession'], ['#access_token=invalid-fixture&refresh_token=invalid-refresh', 'setSession'], ['#access_token=partial-fixture', null], ['?error=access_denied', null]]) {
      const env = environment(`https://fixture.invalid/auth/set-password${suffix}`); env.failure = failedMethod;
      const Component = load('src/pages/auth/SetPassword.tsx', env).default;
      render(Component, env); for (const effect of env.effects) effect(); await flush();
      const tree = render(Component, env);
      assert.ok(textOf(tree).includes('This link has expired or has already been used'));
      assert.ok(!env.calls.some(call => call.method === 'getUser')); assert.ok(!env.calls.some(call => call.method === 'updateUser'));
      const cleanedUrl = new URL(env.window.location.href);
      for (const key of ['token_hash', 'code', 'access_token', 'refresh_token']) assert.equal(cleanedUrl.searchParams.has(key), false);
      assert.equal(cleanedUrl.hash, '');
    }
  });
  await pass('Valid recovery is exchanged once across repeated effects and clears its URL', async () => {
    const env = environment('https://fixture.invalid/auth/set-password?token_hash=valid-fixture');
    const Component = load('src/pages/auth/SetPassword.tsx', env).default;
    render(Component, env); const effect = env.effects[0]; const cleanup = effect(); cleanup(); effect(); await flush();
    assert.equal(env.calls.filter(call => call.method === 'verifyOtp').length, 1);
    assert.equal(env.calls.filter(call => call.method === 'getUser').length, 1);
    assert.ok(textOf(render(Component, env)).includes('Save password & continue'));
    assert.equal(env.window.location.href, 'https://fixture.invalid/auth/set-password');
  });
  await pass('Welcome asks the buyer to check their inbox and never consumes returned token hashes', async () => {
    const env = environment('https://fixture.invalid/welcome?session_id=checkout-fixture&token_hash=unexpected-url-fixture');
    const Component = load('src/pages/Welcome.tsx', env).default;
    render(Component, env); for (const effect of env.effects) effect(); await flush();
    assert.ok(textOf(render(Component, env)).includes('Thank you. Check your email to continue.'));
    assert.ok(!env.calls.some(call => ['verifyOtp', 'exchangeCodeForSession', 'setSession'].includes(call.method)));
    assert.equal(env.calls.filter(call => call.method === 'payment-first-welcome').length, 1);
    assert.deepEqual(env.navigations, []);
  });
  console.log(`${checks} client security checks passed. Providers, storage and navigation were isolated fixtures.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
