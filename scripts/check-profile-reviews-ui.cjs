// Offline component checks against the actual CustomerReviews source.
// Controlled hooks/RPCs exercise handlers; React's server renderer verifies text escaping.
// No browser, network, accounts, live review writes, or additional dependencies.
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { build } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const profileId = '45f38528-6c08-4d86-a095-54e1cdef73d9';
const savedId = '00000000-0000-4000-8000-000000000099';
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const plain = value => JSON.parse(JSON.stringify(value));
let checks = 0;
const pass = async (name, work) => { await work(); console.log(`PASS ${name}`); checks++; };

function lifecycle() {
  const slots = []; let cursor = 0; let current;
  const react = {
    useId: () => 'fixture-review',
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, value => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    Fragment: 'fragment',
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  };
  return { react, render(fn) { current = fn; cursor = 0; return fn(); }, read() { cursor = 0; return current(); } };
}

function children(node) { return node?.props?.children || []; }
function walk(node) {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!node || typeof node !== 'object') return [];
  if (typeof node.type === 'function') return walk(node.type(node.props));
  return [node, ...walk(children(node))];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('');
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  if (typeof node.type === 'function') return text(node.type(node.props));
  return text(children(node));
}
function asReact(node) {
  if (Array.isArray(node)) return node.map(asReact);
  if (!node || typeof node !== 'object') return node;
  if (typeof node.type === 'function') return asReact(node.type(node.props));
  const { children: nested, ...props } = node.props;
  return React.createElement(node.type === 'fragment' ? React.Fragment : node.type, props, ...(nested || []).flat(Infinity).map(asReact));
}
const find = (tree, type, predicate = () => true) => walk(tree).find(node => node.type === type && predicate(node.props, node));
const button = (tree, label) => find(tree, 'button', (_props, node) => text(node) === label);
const select = (f, score) => find(f.life.read(), 'input', props => props.value === score).props.onChange();
const write = f => find(f.life.read(), 'form').props.onSubmit({ preventDefault() {} });
const changeComment = (f, value) => find(f.life.read(), 'textarea').props.onChange({ target: { value } });

async function compile() {
  const mocks = {
    react: 'module.exports=globalThis.__react;',
    '@tanstack/react-query': 'export const useInfiniteQuery=options=>{globalThis.__queryOptions=options;return globalThis.__query;};',
    '@/integrations/supabase/client': 'export const supabase=globalThis.__db;',
    'lucide-react': 'export const CheckCircle2="svg",ChevronDown="svg",Loader2="svg",Star="svg";',
  };
  const output = await build({ entryPoints: [path.join(root, 'src/components/personal/CustomerReviews.tsx')], bundle: true,
    write: false, format: 'cjs', jsx: 'transform', plugins: [{ name: 'review-fixtures', setup(b) {
      b.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: 'fixture' }
        : args.path.startsWith('@/') ? { path: path.join(root, 'src', args.path.slice(2) + '.ts') } : null);
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'js' }));
    } }] });
  return output.outputFiles[0].text;
}

function fixture(source, options = {}) {
  const life = lifecycle(); const requests = []; const storage = new Map();
  const page = options.page || { enabled: true, total: 0, average: null, reviews: [], has_more: false };
  const query = { data: { pages: [page] }, isPending: false, isFetching: false, hasNextPage: page.has_more,
    isFetchingNextPage: false, isFetchNextPageError: false, refreshes: 0,
    async refetch() { this.refreshes++; return { isError: false }; }, async fetchNextPage() {} };
  const db = { rpc(name, args) { const request = { name, args: plain(args), ...deferred() }; requests.push(request); return request.promise; } };
  const context = vm.createContext({ console, Promise, Set, Date, crypto, __react: life.react, React: life.react,
    __db: db, __query: query, window: { localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } } });
  context.module = { exports: {} }; context.exports = context.module.exports;
  new vm.Script(source).runInContext(context);
  life.render(() => context.module.exports.CustomerReviews({ profileId, isPreview: !!options.isPreview }));
  return { life, requests, storage, query };
}

(async () => {
  const source = await compile();
  await pass('Preview blocks review writes even if its submit handler is invoked directly', async () => {
    const f = fixture(source, { isPreview: true });
    assert.equal(find(f.life.read(), 'fieldset').props.disabled, true);
    select(f, 5); write(f); await flush();
    assert.equal(f.requests.length, 0);
    assert.equal(f.storage.size, 0);
  });

  await pass('Star-only review needs no identity fields and duplicate clicks send only once', async () => {
    const f = fixture(source);
    assert.ok(text(f.life.read()).includes('Be the first to leave a review.'));
    select(f, 4); write(f); write(f);
    assert.equal(f.requests.length, 1);
    const request = f.requests[0];
    assert.equal(request.name, 'submit_profile_review');
    assert.equal(request.args.p_rating, 4);
    assert.equal(request.args.p_comment, null);
    assert.deepEqual(Object.keys(request.args).sort(), ['p_comment', 'p_profile_id', 'p_rating', 'p_submission_id', 'p_visitor_id']);
    request.resolve({ data: savedId, error: null }); await flush();
    assert.ok(text(f.life.read()).includes('Thanks for your review!'));
    assert.equal(f.query.refreshes, 1);
  });

  await pass('Failed submission keeps optional feedback and reuses both retry identifiers', async () => {
    const f = fixture(source); select(f, 2); changeComment(f, 'Please improve the pickup timing.'); write(f);
    f.requests[0].resolve({ data: null, error: { code: 'PGRST000', message: 'Fixture connection error' } }); await flush();
    assert.equal(find(f.life.read(), 'textarea').props.value, 'Please improve the pickup timing.');
    write(f); assert.equal(f.requests.length, 2);
    assert.deepEqual(f.requests[0].args, f.requests[1].args);
    f.requests[1].resolve({ data: savedId, error: null }); await flush();
    assert.ok(text(f.life.read()).includes('Your rating and feedback are now public.'));
  });

  await pass('An already-saved review offers refresh without claiming edited feedback was posted', async () => {
    const f = fixture(source); select(f, 3); changeComment(f, 'First attempt'); write(f);
    f.requests[0].resolve({ data: null, error: { message: 'Fixture connection error' } }); await flush();
    changeComment(f, 'Edited after a lost response'); write(f);
    f.requests[1].resolve({ data: null, error: { code: 'P0001', message: 'You can leave another review after 24 hours.' } }); await flush();
    assert.ok(!text(f.life.read()).includes('Thanks for your review!'));
    assert.ok(text(f.life.read()).includes('last 24 hours'));
    assert.equal(find(f.life.read(), 'textarea').props.value, 'Edited after a lost response');
    button(f.life.read(), 'Refresh reviews').props.onClick(); await flush();
    assert.equal(f.query.refreshes, 1);
  });

  await pass('Low scores and optional comments remain visible, with HTML rendered as harmless text', async () => {
    const comment = '<script>window.reviewAttack=true</script> More flavor, please.';
    const f = fixture(source, { page: { enabled: true, total: 2, average: 3, has_more: false,
      reviews: [{ id: savedId, rating: 1, comment, created_at: '2026-11-22T12:00:00Z' },
        { id: '00000000-0000-4000-8000-000000000098', rating: 5, comment: null, created_at: '2026-11-21T12:00:00Z' }] } });
    button(f.life.read(), 'Read all 2 reviews').props.onClick();
    const tree = f.life.read();
    assert.ok(text(tree).includes('1/5'));
    assert.ok(text(tree).includes('5/5'));
    assert.ok(text(tree).includes('3.0'));
    const html = renderToStaticMarkup(asReact(tree));
    assert.ok(html.includes('&lt;script&gt;window.reviewAttack=true&lt;/script&gt;'));
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('dangerouslySetInnerHTML'));
  });

  await pass('Feedback limit uses Unicode characters and rejects over-limit submissions', async () => {
    const f = fixture(source); select(f, 5); changeComment(f, '🥗'.repeat(601));
    assert.equal(button(f.life.read(), 'Post review').props.disabled, true);
    write(f); assert.equal(f.requests.length, 0);
    changeComment(f, '🥗'.repeat(600));
    assert.equal(button(f.life.read(), 'Post review').props.disabled, false);
    write(f); assert.equal(f.requests.length, 1);
    f.requests[0].resolve({ data: savedId, error: null }); await flush();
  });
  console.log(`${checks} offline review component checks passed. No external traffic.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
