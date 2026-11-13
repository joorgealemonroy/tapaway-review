// Offline async regression checks against the actual resolver/hook source.
// Controlled hook lifecycle and deferred RPCs; no provider traffic or timers.
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { build } = require('esbuild');
const root = path.resolve(__dirname, '..');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
let checks = 0;
const pass = async (name, fn) => { await fn(); console.log(`PASS ${name}`); checks++; };

// Mirrors React's render -> effect cleanup -> effect setup order, exposing
// the first render before effects (the frame where this regression occurred).
function lifecycle() {
  const slots = []; let index = 0; let pending = []; let current;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) { const i = index++; if (!slots[i]) slots[i] = { value: initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }]; },
    useRef(initial) { const i = index++; if (!slots[i]) slots[i] = { current: initial }; return slots[i]; },
    useCallback(fn, deps) { const i = index++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: fn, deps }; return slots[i].value; },
    useEffect(fn, deps) { const i = index++; if (!slots[i] || !same(slots[i].deps, deps)) { const previous = slots[i]; slots[i] = { deps, cleanup: previous?.cleanup }; pending.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn(); }); } },
    memo: x => x, lazy: () => 'lazy', Suspense: 'suspense', Fragment: 'fragment',
    createElement: (type, props, ...children) => ({ type, props: { ...props, children }, key: props?.key }),
  };
  return {
    react,
    render(fn) { index = 0; current = fn; return fn(); },
    effects() { const queued = pending; pending = []; queued.forEach(fn => fn()); },
    read() { index = 0; return current(); },
    unmount() { slots.forEach(s => s.cleanup?.()); },
  };
}
async function fixture(file) {
  const life = lifecycle(); const requests = []; const cached = []; const invalidated = [];
  const route = { slug: 'lasislas', key: 'a', search: '', state: null };
  const admin = { isAdmin: false, loading: false };
  const auth = { user: null, loading: false };
  const db = {
    rpc(name, args) { const d = deferred(); requests.push({ name, args, ...d }); return d.promise; },
    from(table) { const d = deferred(); const request = { name: table, filters: [], ...d }; requests.push(request); const query = { then: (...a) => d.promise.then(...a) }; for (const method of ['select', 'eq', 'or', 'order', 'maybeSingle']) query[method] = (...args) => { request.filters.push([method, ...args]); return query; }; return query; },
  };
  const context = vm.createContext({ console, Promise, URLSearchParams, document: { querySelectorAll: () => [], createElement: () => ({}), head: { appendChild() {} } }, __react: life.react, __db: db, __route: route, __admin: admin, __auth: auth, __cache: (key, data) => cached.push({ key, data }), __invalidate: key => invalidated.push(key) });
  const mocks = {
    react: 'module.exports=globalThis.__react;',
    'react-router-dom': 'export const useParams=()=>globalThis.__route; export const useLocation=()=>globalThis.__route; export const Navigate="navigate";',
    '@/integrations/supabase/client': 'export const supabase=globalThis.__db;',
    '@/lib/analytics': 'export const track=()=>{};',
    './useProfileCache': 'export const setCachedProfile=globalThis.__cache; export const invalidateProfileCache=globalThis.__invalidate;',
    '@/lib/reservedUsernames': 'export const isUsernameReserved=s=>s==="reserved";',
    '@/components/personal/OptimizedImage': 'export const getOptimizedImageUrl=x=>x;',
    '@/hooks/useAdminAccess': 'export const useAdminAccess=()=>globalThis.__admin;',
    '@/hooks/useAuth': 'export const useAuth=()=>globalThis.__auth;',
    '@/lib/hubProfileColumns': 'export const HUB_PROFILE_COLUMNS="id,username";',
    './personal/PersonalProfilePage': 'export default "personal";',
    './ReviewHub': 'export default "restaurant";', './NotFound': 'export default "notfound";',
    'lucide-react': 'export const Loader2="loader";',
  };
  context.React = life.react;
  const output = await build({ entryPoints: [path.join(root, file)], bundle: true, write: false, format: 'cjs', jsx: 'transform', plugins: [{ name: 'offline', setup(b) { b.onResolve({ filter: /.*/ }, a => a.kind === 'entry-point' ? null : a.path in mocks ? { path: a.path, namespace: 'mock' } : (() => { throw Error(`Unexpected import ${a.path}`); })()); b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ contents: mocks[a.path], loader: 'js' })); } }] });
  context.module = { exports: {} }; context.exports = context.module.exports;
  new vm.Script(output.outputFiles[0].text).runInContext(context);
  return { life, requests, cached, invalidated, route, admin, auth, exports: context.module.exports };
}
const reply = async (request, data) => { assert.ok(request, 'Expected pending lookup'); request.resolve({ data, error: null }); await flush(); };
const live = username => ({ id: username, username, subscription_status: 'active', is_approved: true });
const emptyParallel = async f => { for (const r of f.requests.filter(r => ['personal_links', 'personal_blocks', 'profile_has_active_card'].includes(r.name))) r.resolve({ data: r.name === 'profile_has_active_card' ? false : [], error: null }); await flush(); };
const plain = value => JSON.parse(JSON.stringify(value));

(async () => {
  await pass('First destination render is neutral; superseded missing results cannot overwrite live destination', async () => {
    const f = await fixture('src/hooks/useProfileData.ts'); let slug = 'old';
    const render = () => f.exports.useProfileData(slug);
    f.life.render(render); f.life.effects(); const old = f.requests[0];
    slug = 'lasislas'; assert.deepEqual(plain(f.life.render(render)).data, null); assert.equal(f.life.read().loading, true); assert.equal(f.life.read().error, null); f.life.effects();
    await reply(f.requests[1], [live(slug)]); await emptyParallel(f); assert.equal(f.life.read().data.profile.username, slug);
    await reply(old, []); await reply(f.requests.find(r => r.name === 'get_public_personal_profile_status'), []);
    assert.equal(f.life.read().data.profile.username, slug); assert.equal(f.life.read().error, null); assert.deepEqual(f.cached.map(r => r.key), ['lasislas']);
  });
  await pass('Mismatched initial profile cannot hydrate another slug; stale parallel completion is discarded', async () => {
    const f = await fixture('src/hooks/useProfileData.ts'); let slug = 'a'; const initial = live('a');
    const render = () => f.exports.useProfileData(slug, initial);
    f.life.render(render); f.life.effects(); slug = 'b'; assert.equal(f.life.render(render).loading, true); f.life.effects();
    await emptyParallel(f); assert.equal(f.life.read().loading, true); assert.equal(f.cached.length, 0);
    assert.equal(f.requests.find(r => r.name === 'get_public_personal_profile').args._slug, 'b');
    await reply(f.requests.find(r => r.name === 'get_public_personal_profile'), [live('b')]); await emptyParallel(f); assert.equal(f.life.read().data.profile.username, 'b');
  });
  await pass('Fast a/b/a history and refetch use newest request; unmount prevents cache writes', async () => {
    const f = await fixture('src/hooks/useProfileData.ts'); let slug = 'a'; const render = () => f.exports.useProfileData(slug);
    f.life.render(render); f.life.effects(); slug = 'b'; f.life.render(render); f.life.effects(); slug = 'a'; f.life.render(render); f.life.effects();
    const latest = f.requests[2]; await reply(latest, [live('a')]); await emptyParallel(f); assert.equal(f.life.read().data.profile.username, 'a');
    const refetch = f.life.read().refetch(); assert.equal(f.life.read().loading, true); const refresh = f.requests.at(-1);
    f.life.unmount(); await reply(refresh, [live('a')]); await emptyParallel(f); await refetch; assert.equal(f.cached.length, 1);
    await reply(f.requests[0], []); await reply(f.requests[1], []); assert.equal(f.cached.length, 1);
  });
  await pass('Missing waits for exact status lookup; unapproved trial stays branding-only and uncached', async () => {
    const f = await fixture('src/hooks/useProfileData.ts'); let slug = 'missing'; const render = () => f.exports.useProfileData(slug);
    f.life.render(render); f.life.effects(); await reply(f.requests[0], []); assert.equal(f.life.read().loading, true); assert.equal(f.life.read().error, null);
    await reply(f.requests[1], []); assert.equal(f.life.read().error, 'not_found');
    slug = 'trial'; assert.equal(f.life.render(render).error, null); f.life.effects(); await reply(f.requests[2], [{ ...live(slug), subscription_status: 'trialing', is_approved: false }]);
    await reply(f.requests[3], [{ username: 'trial', subscription_status: 'trialing', is_approved: false }]);
    assert.equal(f.life.read().data, null); assert.equal(f.life.read().expiredPreview.username, 'trial'); assert.equal(f.cached.length, 0);
  });
  await pass('Server-authorized gifts resolve and refetch without an active paid subscription', async () => {
    const walk = node => node && typeof node === 'object' ? [node, ...(node.props?.children || []).flatMap(walk)] : [];
    for (const status of ['pending', 'expired', 'canceled', null]) {
      // Match the public projection: payment_state is not exposed by this RPC.
      const gift = { ...live('gift'), subscription_status: status };
      const f = await fixture('src/hooks/useProfileData.ts');
      f.life.render(() => f.exports.useProfileData('gift')); f.life.effects();
      await reply(f.requests[0], [gift]); await emptyParallel(f);
      assert.equal(f.life.read().data.profile.username, 'gift'); assert.equal(f.life.read().expiredPreview, null);
      assert.ok(!f.requests.some(r => r.name === 'get_public_personal_profile_status'));
      // Revoking access must still discard cached content and show only branding.
      const refresh = f.life.read().refetch(); await reply(f.requests.at(-1), []);
      await reply(f.requests.at(-1), [gift]); await refresh;
      assert.equal(f.life.read().data, null); assert.equal(f.life.read().expiredPreview.username, 'gift');
      const resolver = await fixture('src/pages/UsernameResolver.tsx');
      const inner = resolver.life.render(resolver.exports.default).type;
      resolver.life.render(() => inner({ slug: 'gift' })); resolver.life.effects();
      await reply(resolver.requests[0], [gift]);
      const page = walk(resolver.life.read()).find(n => n.type === 'personal');
      assert.equal(page.props.initialProfile.username, 'gift'); assert.equal(page.props.privatePreview, false);
      assert.equal(resolver.requests.length, 1);
    }
  });
  await pass('A paid-looking but unapproved public row never exposes links', async () => {
    const f = await fixture('src/hooks/useProfileData.ts');
    const draft = { ...live('draft'), is_approved: false };
    f.life.render(() => f.exports.useProfileData('draft')); f.life.effects();
    await reply(f.requests[0], [draft]); await reply(f.requests[1], [draft]);
    assert.equal(f.life.read().data, null); assert.equal(f.life.read().expiredPreview.username, 'draft');
    assert.equal(f.cached.length, 0); assert.ok(!f.requests.some(r => r.name === 'personal_links'));
  });
  await pass('Every slug/history/admin-preview destination has distinct synchronous ownership', async () => {
    const f = await fixture('src/pages/UsernameResolver.tsx'); const outer = f.exports.default;
    const a = f.life.render(outer); f.route.slug = 'lasislasfontana'; f.route.key = 'b'; const b = f.life.render(outer); assert.notEqual(a.key, b.key);
    f.route.slug = 'lasislasmarias'; f.route.key = 'c'; assert.notEqual(b.key, f.life.render(outer).key);
    f.route.slug = 'lasislas'; f.route.key = 'back'; assert.notEqual(a.key, f.life.render(outer).key);
    f.route.state = { type: 'personal' }; const direct = f.life.render(outer); assert.equal(direct.type, 'personal'); assert.ok(direct.key);
    f.route.search = '?admin_preview=1'; assert.notEqual(f.life.render(outer).type, 'personal');
  });
  await pass('Cancelled resolver cannot choose old hub; personal/restaurant paused status fallback preserved', async () => {
    const f = await fixture('src/pages/UsernameResolver.tsx'); const inner = f.life.render(f.exports.default).type; let slug = 'a';
    const render = () => inner({ slug, isAdminPreview: false }); f.life.render(render); f.life.effects(); const old = f.requests[0];
    slug = 'b'; f.life.render(render); f.life.effects(); await reply(f.requests[1], []); await reply(f.requests[2], []);
    const beforeRestaurant = f.life.read(); assert.equal(typeof beforeRestaurant.type, 'function');
    await reply(f.requests[3], []); await reply(f.requests[4], [{ id: 'b', payment_state: 'paid' }]); assert.equal(f.life.read().props.children[0].type, 'lazy');
    await reply(old, [live('a')]); assert.equal(f.life.read().props.children[0].type, 'lazy');
  });
  await pass('Old hub URLs redirect with query and fragment intact, and stale aliases cannot redirect another route', async () => {
    const f = await fixture('src/pages/UsernameResolver.tsx'); f.route.search = '?location=fridge-one&utm_source=card'; f.route.hash = '#menu';
    const inner = f.life.render(f.exports.default).type; let slug = 'old-address';
    const render = () => inner({ slug }); f.life.render(render); f.life.effects();
    for (let i = 0; i < 4; i++) await reply(f.requests[i], []);
    assert.equal(f.requests[4].name, 'get_hub_slug_redirect');
    await reply(f.requests[4], 'greensleeves');
    const redirect = f.life.read(); assert.equal(redirect.type, 'navigate');
    assert.deepEqual(plain(redirect.props.to), { pathname: '/greensleeves', search: f.route.search, hash: '#menu' });
    assert.equal(redirect.props.replace, true); assert.equal(redirect.props.state, null);
    slug = 'second-old'; f.life.render(render); f.life.effects();
    for (let i = 5; i < 9; i++) await reply(f.requests[i], []);
    const stale = f.requests[9]; slug = 'new-hub'; f.life.render(render); f.life.effects();
    await reply(f.requests[10], [live('new-hub')]); await reply(stale, 'wrong-hub');
    assert.notEqual(f.life.read().type, 'navigate');
  });
  await pass('Unknown, reserved and malformed redirect targets never navigate', async () => {
    for (const target of [null, 'https://outside.invalid', 'old-address', 'reserved']) {
      const f = await fixture('src/pages/UsernameResolver.tsx'); const inner = f.life.render(f.exports.default).type;
      f.life.render(() => inner({ slug: 'old-address' })); f.life.effects();
      for (let i = 0; i < 4; i++) await reply(f.requests[i], []);
      await reply(f.requests[4], target); assert.notEqual(f.life.read().type, 'navigate');
    }
  });
  await pass('Explicit admin preview requires verified admin; private ownership does not bypass public lookup', async () => {
    for (const isAdmin of [false, true]) {
      const f = await fixture('src/pages/UsernameResolver.tsx'); f.admin.isAdmin = isAdmin; f.route.search = '?admin_preview=1'; const inner = f.life.render(f.exports.default).type;
      f.life.render(() => inner({ slug: 'private', isAdminPreview: true })); f.life.effects(); assert.equal(f.requests[0].name, isAdmin ? 'personal_profiles' : 'get_public_personal_profile');
      f.life.unmount(); await reply(f.requests[0], isAdmin ? live('private') : []);
    }
  });
  await pass('Rep preview requires login, active rep and an assigned unapproved row', async () => {
    const walk = node => node && typeof node === 'object' ? [node, ...(node.props?.children || []).flatMap(walk)] : [];
    for (const access of ['anonymous', 'inactive', 'unassigned', 'assigned']) {
      const f = await fixture('src/pages/UsernameResolver.tsx');
      f.auth.user = access === 'anonymous' ? null : { id: 'rep-one' };
      const inner = f.life.render(f.exports.default).type;
      f.life.render(() => inner({ slug: 'draft', isRepPreview: true })); f.life.effects();
      if (access === 'anonymous') { assert.equal(f.requests[0].name, 'get_public_personal_profile'); continue; }
      assert.equal(f.requests[0].name, 'sales_reps');
      assert.ok(f.requests[0].filters.some(x => x[0] === 'eq' && x[1] === 'is_active' && x[2] === true));
      await reply(f.requests[0], access === 'inactive' ? null : { id: 'rep-one' });
      if (access === 'inactive') { assert.equal(f.requests[1].name, 'get_public_personal_profile'); continue; }
      assert.equal(f.requests[1].name, 'personal_profiles');
      assert.ok(f.requests[1].filters.some(x => x[0] === 'eq' && x[1] === 'is_approved' && x[2] === false));
      assert.ok(f.requests[1].filters.some(x => x[0] === 'or' && x[1] === 'sales_rep_id.eq.rep-one,created_by_rep_id.eq.rep-one'));
      await reply(f.requests[1], access === 'assigned' ? { ...live('draft'), subscription_status: 'pending', is_approved: false } : null);
      if (access === 'unassigned') { assert.equal(f.requests[2].name, 'get_public_personal_profile'); continue; }
      const page = walk(f.life.read()).find(x => x.type === 'personal');
      assert.equal(page.props.initialProfile.username, 'draft'); assert.equal(page.props.privatePreview, true);
      assert.equal(f.requests.length, 2);
    }
  });
  await pass('Private preview remounts across logout and never populates public cache', async () => {
    const f = await fixture('src/pages/UsernameResolver.tsx'); f.route.search = '?rep_preview=1'; f.auth.user = { id: 'rep-one' };
    const before = f.life.render(f.exports.default); f.auth.user = null; assert.notEqual(before.key, f.life.render(f.exports.default).key);
    const h = await fixture('src/hooks/useProfileData.ts'); const draft = { ...live('draft'), subscription_status: 'pending', is_approved: false };
    h.life.render(() => h.exports.useProfileData('draft', draft, true)); h.life.effects(); await emptyParallel(h);
    assert.equal(h.life.read().data.profile.username, 'draft'); assert.equal(h.cached.length, 0);
  });
  console.log(`PASS ${checks} async hub route regression checks; no network traffic.`);
})().catch(error => { console.error(error); process.exit(1); });
