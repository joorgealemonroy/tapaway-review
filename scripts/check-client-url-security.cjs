/* Executes the actual URL helper and public components with isolated hooks and
 * navigation/provider fixtures. No network requests, purchases or data writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let checks = 0;
const pass = async (name, run) => { await run(); checks++; console.log(`PASS ${name}`); };
const walk = node => !node ? [] : Array.isArray(node) ? node.flatMap(walk) : typeof node === 'object' ? [node, ...walk(node.props?.children)] : [];
const textOf = node => node == null || typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(textOf).join('') : typeof node === 'object' ? textOf(node.props?.children) : String(node);

function environment(seed = []) {
  const env = { states: seed.slice(), index: 0, effects: [], opens: [], redirects: [], navigations: [], tracks: [], card: null };
  env.react = {
    useState(initial) { const i = env.index++; if (!(i in env.states)) env.states[i] = typeof initial === 'function' ? initial() : initial; return [env.states[i], next => { env.states[i] = typeof next === 'function' ? next(env.states[i]) : next; }]; },
    useEffect(fn) { env.effects.push(fn); }, useCallback: fn => fn, useRef: value => ({ current: value }), memo: fn => fn,
  };
  env.window = { location: { origin: 'https://fixture.invalid', href: 'https://fixture.invalid/c/EXAMPLE', assign: url => env.redirects.push(url) }, open: (...args) => env.opens.push(args) };
  env.storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  env.db = { from() { const q = new Proxy({}, { get: (_, key) => key === 'maybeSingle' ? async () => ({ data: env.card, error: null }) : () => q }); return q; }, auth: { getUser: async () => ({ data: { user: null } }) } };
  return env;
}

function load(relative, env = environment()) {
  const exported = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const jsx = (type, props) => ({ type, props: props || {} });
  const generic = new Proxy({}, { get: (_, key) => String(key) });
  const requireFixture = name => {
    if (name === 'react') return env.react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === 'react-router-dom') return { useParams: () => ({ publicCode: 'EXAMPLE', slug: 'fixture' }), useLocation: () => ({ pathname: '/fixture' }), useNavigate: () => (...args) => env.navigations.push(args) };
    if (name === '@/integrations/supabase/client') return { supabase: env.db };
    if (name === '@/lib/sanitizeUrl') return load('src/lib/sanitizeUrl.ts', env);
    if (name === '@/lib/hubThemes') return load('src/lib/hubThemes.ts', env);
    if (name === '@/hooks/useAdminAccess') return { useAdminAccess: () => ({ isAdmin: false, loading: false }) };
    if (name === '@/lib/platformLinks') return { getPlatformConfig: () => null };
    if (name === 'framer-motion') return { motion: generic, AnimatePresence: 'AnimatePresence' };
    if (name === 'sonner') return { toast: generic };
    return generic;
  };
  const context = { exports: exported, require: requireFixture, URL, URLSearchParams, console, setTimeout, clearTimeout,
    window: env.window, localStorage: env.storage, sessionStorage: env.storage, navigator: { userAgent: 'Fixture Desktop' },
    document: { documentElement: { classList: { toggle() {}, remove() {} } } },
    fetch: () => { throw new Error('External requests prohibited in URL checks'); },
  };
  vm.runInNewContext(source, context, { filename: relative });
  return exported;
}

(async () => {
  const { sanitizeUrl, getSafeExternalUrl } = load('src/lib/sanitizeUrl.ts');
  await pass('Absolute web URLs remain usable and normalize through the URL parser', () => {
    assert.equal(getSafeExternalUrl(' https://example.com/a?x=1#menu '), 'https://example.com/a?x=1#menu');
    assert.equal(getSafeExternalUrl('HTTP://example.com'), 'http://example.com/');
    assert.equal(sanitizeUrl('https://example.com/path with spaces'), 'https://example.com/path%20with%20spaces');
  });
  const hostile = ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\nscript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', '//evil.invalid', '/relative', 'https:evil.invalid', 'https:\\evil.invalid', 'https://fixture-user:fixture-pass@evil.invalid', 'https://example.com\n@evil.invalid', 'https://example.com\0/a', 'https://', null, undefined, { url: 'https://example.com' }];
  await pass('Unsafe schemes, URL confusion and non-string inputs fail closed', () => {
    for (const input of hostile) { assert.equal(getSafeExternalUrl(input), null); assert.equal(sanitizeUrl(input), '#'); }
  });
  await pass('Explicit contacts and supported app links remain links, never card redirects', () => {
    for (const input of ['mailto:hello@example.com', 'tel:+15555550123', 'sms:+15555550123?body=Hello', 'instagram://user?username=example', 'fb://facewebmodal/f?href=https://facebook.com/example', 'snssdk1128://user/profile/example', 'intent://instagram.com/_u/example/#Intent;package=com.instagram.android;scheme=https;end']) {
      assert.equal(sanitizeUrl(input), input); assert.equal(getSafeExternalUrl(input), null);
    }
  });
  const resolveCard = async (destination, type = 'external_url') => {
    const env = environment(); env.card = { status: 'claimed', destination_type: type, destination_value: destination };
    load('src/pages/CardResolver.tsx', env).default();
    for (const effect of env.effects) effect();
    await new Promise(resolve => setImmediate(resolve));
    return env;
  };
  await pass('Card resolver rejects executable and confused destinations before navigation', async () => {
    for (const value of hostile.filter(value => typeof value === 'string')) {
      const env = await resolveCard(value); assert.equal(env.states[0], 'not_found'); assert.deepEqual(env.redirects, []); assert.deepEqual(env.navigations, []);
    }
    for (const value of ['//evil.invalid', '../auth', 'user?admin_preview=1', 'https://evil.invalid']) {
      const env = await resolveCard(value, 'profile'); assert.equal(env.states[0], 'not_found'); assert.deepEqual(env.navigations, []);
    }
  });
  await pass('Valid card destinations retain external redirect and internal profile behavior', async () => {
    let env = await resolveCard('https://example.com/menu'); assert.deepEqual(env.redirects, ['https://example.com/menu']); assert.equal(env.states[0], 'redirecting');
    env = await resolveCard('test-business_1', 'profile'); assert.equal(env.navigations[0][0], '/test-business_1'); assert.equal(env.navigations[0][1].state.type, 'personal'); assert.deepEqual(env.redirects, []);
  });
  await pass('Review hub never renders executable promotion or review links', () => {
    const render = url => {
      const seed = []; seed[0] = { id: 'fixture', restaurant_name: 'Fixture', google_review_url: 'javascript:alert(1)', yelp_review_url: 'https://www.yelp.com/biz/fixture', directions_url: 'https://maps.google.com/?q=fixture' }; seed[4] = false; seed[6] = [{ id: 'promotion', type: 'promotion', content: 'Offer', options: { link: url } }];
      return walk(load('src/pages/ReviewHub.tsx', environment(seed)).default()).filter(node => node.type === 'a');
    };
    for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'https://trusted.invalid\n@evil.invalid']) {
      const anchors = render(url); assert.ok(!anchors.some(node => textOf(node).includes('Learn More'))); assert.ok(!anchors.some(node => /javascript:|data:/i.test(node.props.href)));
    }
    assert.equal(render('https://example.com/offer').find(node => textOf(node).includes('Learn More')).props.href, 'https://example.com/offer');
  });
  await pass('Meal hub hides unsafe actions and opens safe links once without an opener', () => {
    const render = (url, bundleUrl) => {
      const seed = []; seed[2] = [{ id: 'bundle', title: 'Bundle', cta_label: 'Trainer offer', cta_url: bundleUrl }];
      const env = environment(seed);
      const tree = load('src/components/hubs/AvMealPrepHub.tsx', env).AvMealPrepHub({ restaurant: { id: 'fixture', restaurant_name: 'Fixture', meal_order_url: url, instagram_url: url }, trackEvent: (...args) => env.tracks.push(args) });
      return { env, nodes: walk(tree) };
    };
    let result = render('javascript:alert(1)', 'data:text/html,hello');
    assert.ok(!result.nodes.some(node => node.type === 'button' && /Order \/ Subscribe|Trainer offer/.test(textOf(node))));
    assert.ok(!result.nodes.some(node => node.type === 'a' && /javascript:|data:/i.test(node.props.href)));
    result = render('https://example.com/order', 'https://example.com/bundle');
    result.nodes.find(node => node.type === 'button' && textOf(node).includes('Order / Subscribe')).props.onClick();
    result.nodes.find(node => node.type === 'button' && textOf(node).includes('Trainer offer')).props.onClick();
    const instagram = result.nodes.find(node => node.type === 'a' && node.props.href === 'https://example.com/order');
    instagram.props.onClick();
    assert.deepEqual(result.env.opens, [['https://example.com/order', '_blank', 'noopener,noreferrer'], ['https://example.com/bundle', '_blank', 'noopener,noreferrer']]);
    assert.equal(instagram.props.rel, 'noopener noreferrer');
  });
  await pass('Pro template suppresses executable links and validates callback destinations', () => {
    const env = environment(), destinations = [];
    const tree = load('src/components/personal/ProHubTemplate.tsx', env).ProHubTemplate({ displayName: 'Fixture', links: [{ id: 'bad', link_type: 'website', label: 'Unsafe', url: 'javascript:alert(1)' }, { id: 'safe', link_type: 'website', label: 'Safe', url: 'https://example.com/path with spaces' }], onLinkClick: value => destinations.push(value) });
    const buttons = walk(tree).filter(node => node.type === 'button'); assert.equal(buttons.length, 1); buttons[0].props.onClick(); assert.deepEqual(destinations, ['https://example.com/path%20with%20spaces']);
  });
  console.log(`${checks} client URL security checks passed. All navigation and network behavior used isolated fixtures.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
