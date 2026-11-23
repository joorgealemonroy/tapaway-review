// Offline checks against the real phone-review components and request client.
// Controlled hook/RPC lifecycle, plus React SSR for public-text escaping.
// No provider traffic, OTP texts, accounts, or live review writes.
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { build } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const profileId = '45f38528-6c08-4d86-a095-54e1cdef73d9';
const reviewId = '00000000-0000-4000-8000-000000000099';
const token = 'fixture-review-capability-'.repeat(3);
const expiresAt = '2099-01-01T00:00:00Z';
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const plain = value => JSON.parse(JSON.stringify(value));
let checks = 0;
const pass = async (name, work) => { await work(); console.log(`PASS ${name}`); checks++; };
const review = (rating = 4, comment = null) => ({ id: reviewId, rating, comment, created_at: '2026-11-22T12:00:00Z', updated_at: '2026-11-22T12:00:00Z', phone_verified: true });
const config = { enabled: true, phoneVerification: true, verificationAvailable: true, otpConsentVersion: 1,
  otpConsentText: 'By tapping Send code, I agree to receive a one-time verification text. This does not sign me up for offers.',
  sms: { available: true, brandName: 'A.V. Meal Preps', consentVersion: 2,
    consentText: 'I agree to receive recurring automated updates and offers from A.V. Meal Preps. Optional; not required to review or buy. Msg & data rates may apply. Reply STOP to opt out.',
    termsUrl: 'https://example.invalid/terms', privacyUrl: 'https://example.invalid/privacy', frequencyText: 'Frequency varies.' } };

function lifecycle() {
  const slots = []; let cursor = 0; let current; let effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useId: () => 'fixture-review',
    useState(initial) { const i = cursor++; if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { const old = slots[i]; slots[i] = { deps, cleanup: old?.cleanup }; effects.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); }); } },
    Fragment: 'fragment', createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  };
  return { react, render(fn) { current = fn; cursor = 0; return fn(); }, read() { cursor = 0; return current(); },
    effects() { const pending = effects; effects = []; pending.forEach(fn => fn()); } };
}
function walk(node) { if (Array.isArray(node)) return node.flatMap(walk); if (!node || typeof node !== 'object') return []; if (typeof node.type === 'function') return walk(node.type(node.props)); return [node, ...walk(node.props?.children || [])]; }
function text(node) { if (Array.isArray(node)) return node.map(text).join(''); if (node == null || typeof node === 'boolean') return ''; if (typeof node !== 'object') return String(node); if (typeof node.type === 'function') return text(node.type(node.props)); return text(node.props?.children || []); }
function asReact(node) { if (Array.isArray(node)) return node.map(asReact); if (!node || typeof node !== 'object') return node; if (typeof node.type === 'function') return asReact(node.type(node.props)); const { children, ...props } = node.props; return React.createElement(node.type === 'fragment' ? React.Fragment : node.type, props, ...(children || []).flat(Infinity).map(asReact)); }
const find = (tree, type, predicate = () => true) => walk(tree).find(node => node.type === type && predicate(node.props, node));
const button = (f, label) => find(f.life.read(), 'button', (_props, node) => text(node) === label);
const input = (f, type) => find(f.life.read(), 'input', props => props.type === type);
const select = (f, score) => find(f.life.read(), 'input', props => props.type === 'radio' && props.value === score).props.onChange();
const submit = f => find(f.life.read(), 'form').props.onSubmit({ preventDefault() {} });
const comment = (f, value) => find(f.life.read(), 'textarea').props.onChange({ target: { value } });
const answer = async (request, value, error = null) => { assert.ok(request, 'Expected a controlled request'); request.resolve({ data: value, error }); await flush(); };

async function compile(file, feed = false) {
  const mocks = {
    react: 'module.exports=globalThis.__react;',
    '@tanstack/react-query': 'export const useQuery=()=>globalThis.__config;export const useInfiniteQuery=()=>globalThis.__feed;',
    '@/integrations/supabase/client': 'export const supabase=globalThis.__db;',
    'lucide-react': 'export const CheckCircle2="svg",ChevronDown="svg",Loader2="svg",Star="svg",ShieldCheck="svg";',
    ...(feed ? { './PhoneVerifiedReviewForm': 'export const PhoneVerifiedReviewForm="review-form";' } : {}),
  };
  const output = await build({ entryPoints: [path.join(root, file)], bundle: true, write: false, format: 'cjs', jsx: 'transform',
    plugins: [{ name: 'review-fixtures', setup(b) {
      b.onResolve({ filter: /.*/ }, a => a.path in mocks ? { path: a.path, namespace: 'fixture' } : a.path.startsWith('@/') ? { path: path.join(root, 'src', a.path.slice(2) + '.ts') } : null);
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, a => ({ contents: mocks[a.path], loader: 'js' }));
    } }] }); return output.outputFiles[0].text;
}
function fixture(source, options = {}) {
  const life = lifecycle(); const requests = []; const storage = new Map(options.storage || []); let saved = 0;
  const configQuery = { data: options.config || config, isPending: false, isError: false, async refetch() {} };
  const feedQuery = { data: { pages: [options.page || { enabled: true, total: 0, average: null, reviews: [], has_more: false }] }, isPending: false, isFetching: false, hasNextPage: false, async refetch() { return { isError: false }; } };
  const db = { functions: { invoke(name, { body }) { const request = { name, body: plain(body), ...deferred() }; requests.push(request); return request.promise; } } };
  const context = vm.createContext({ console, Promise, Set, Date, URL, crypto, __react: life.react, React: life.react, __db: db, __config: configQuery, __feed: feedQuery,
    window: { setInterval: () => 1, clearInterval() {}, localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) } } });
  context.module = { exports: {} }; context.exports = context.module.exports; new vm.Script(source).runInContext(context);
  const Component = options.feed ? context.module.exports.CustomerReviews : context.module.exports.PhoneVerifiedReviewForm;
  life.render(() => Component({ profileId, isPreview: !!options.isPreview, onSaved: async () => { saved++; return true; } }));
  return { life, requests, storage, configQuery, get saved() { return saved; } };
}
async function verify(f, own = null) {
  input(f, 'tel').props.onChange({ target: { value: '(661) 555-0123' } }); submit(f);
  const send = f.requests.at(-1); assert.equal(send.body.action, 'request_code'); assert.equal(send.body.otpConsent, true); assert.equal(send.body.otpConsentVersion, 1);
  await answer(send, { success: true, challengeId: '00000000-0000-4000-8000-000000000088', maskedPhone: '••• ••• 0123', expiresIn: 600, retryAfter: 60 });
  input(f, 'text').props.onChange({ target: { value: '123456' } }); submit(f);
  const check = f.requests.at(-1); assert.equal(check.body.action, 'verify_code');
  await answer(check, { success: true, token, expiresAt, maskedPhone: '••• ••• 0123', review: own });
}

(async () => {
  const formSource = await compile('src/components/personal/PhoneVerifiedReviewForm.tsx');
  const feedSource = await compile('src/components/personal/CustomerReviews.tsx', true);
  await pass('Preview cannot send codes, verify phones, save reviews, or restore a stored capability', async () => {
    const f = fixture(formSource, { isPreview: true, storage: [[`tapaway:review-session:${profileId}`, JSON.stringify({ token, expiresAt })]] });
    f.life.effects(); select(f, 5); input(f, 'tel').props.onChange({ target: { value: '6615550123' } }); submit(f); await flush();
    assert.equal(f.requests.length, 0); assert.equal(find(f.life.read(), 'fieldset').props.disabled, true);
  });
  await pass('Phone verification is required; optional offers begin unchecked and rating-only save does not subscribe', async () => {
    const f = fixture(formSource); select(f, 4);
    assert.equal(input(f, 'checkbox').props.checked, false);
    assert.equal(button(f, 'Post review'), undefined);
    assert.ok(text(f.life.read()).includes('not required to review or buy'));
    assert.deepEqual(walk(f.life.read()).filter(n => n.type === 'a').map(n => n.props.href), ['https://example.invalid/terms', 'https://example.invalid/privacy', '/terms#review-verification', '/privacy#review-verification']);
    await verify(f);
    assert.ok(text(f.life.read()).includes('Phone verified'));
    submit(f); submit(f); assert.equal(f.requests.length, 3);
    const request = f.requests.at(-1); assert.equal(request.body.action, 'save'); assert.equal(request.body.rating, 4); assert.equal(request.body.comment, null);
    assert.equal(request.body.marketingConsent, false); assert.ok(!('consentVersion' in request.body));
    await answer(request, { success: true, review: review(), smsStatus: 'not_requested' });
    assert.ok(text(f.life.read()).includes('Thanks for your review!')); assert.equal(f.saved, 1);
  });
  await pass('Returning phone verification loads the existing review and edits it without creating a new identity', async () => {
    const f = fixture(formSource); button(f, 'Edit my review').props.onClick(); await verify(f, review(2, 'My previous review'));
    assert.equal(find(f.life.read(), 'textarea').props.value, 'My previous review');
    assert.equal(input(f, 'checkbox').props.checked, false); assert.ok(button(f, 'Save changes'));
    select(f, 5); comment(f, 'Pickup improved.'); submit(f);
    assert.equal(f.requests.at(-1).body.token, token);
    await answer(f.requests.at(-1), { success: true, review: review(5, 'Pickup improved.'), smsStatus: 'not_requested' });
    assert.ok(text(f.life.read()).includes('Your review has been updated.'));
    button(f, 'Edit my review').props.onClick(); assert.equal(input(f, 'checkbox').props.checked, false);
    assert.equal(find(f.life.read(), 'textarea').props.value, 'Pickup improved.');
  });
  await pass('A fresh composed update survives verification that discovers an earlier review', async () => {
    const f = fixture(formSource); select(f, 5); comment(f, 'My new feedback'); await verify(f, review(2, 'My old feedback'));
    assert.equal(find(f.life.read(), 'textarea').props.value, 'My new feedback');
    assert.equal(find(f.life.read(), 'input', p => p.type === 'radio' && p.value === 5).props.checked, true);
    assert.ok(text(f.life.read()).includes('Saving will update your review.'));
    assert.ok(button(f, 'Save changes'));
  });
  await pass('Consent is explicit, separate from verification, and SMS failure does not turn a saved review into a failure', async () => {
    const f = fixture(formSource); select(f, 3); input(f, 'checkbox').props.onChange({ target: { checked: true } });
    assert.equal(f.requests.length, 0); await verify(f);
    assert.ok(f.requests.every(r => r.body.action !== 'save'));
    submit(f); assert.equal(f.requests.at(-1).body.marketingConsent, true); assert.equal(f.requests.at(-1).body.consentVersion, 2);
    await answer(f.requests.at(-1), { success: true, review: review(3), smsStatus: 'suppressed' });
    assert.ok(text(f.life.read()).includes('Your review is saved.'));
    assert.ok(!text(f.life.read()).includes('preference is saved'));
  });
  await pass('Failed saves preserve the draft and same-request id; expired sessions reverify without overwriting edits', async () => {
    const f = fixture(formSource); select(f, 4); await verify(f, review()); comment(f, 'Unsaved change'); submit(f);
    const first = f.requests.at(-1); await answer(first, { error: 'Temporary failure', code: 'SAVE_UNAVAILABLE' });
    assert.equal(find(f.life.read(), 'textarea').props.value, 'Unsaved change'); submit(f);
    const retry = f.requests.at(-1); assert.equal(retry.body.submissionId, first.body.submissionId);
    await answer(retry, { error: 'Session expired', code: 'SESSION_EXPIRED' });
    assert.ok(text(f.life.read()).includes('verify your phone again'));
    await verify(f, review(4, 'Older saved version'));
    assert.equal(find(f.life.read(), 'textarea').props.value, 'Unsaved change');
  });
  await pass('Stored capability is checked server-side before reuse and never renders in public markup', async () => {
    const f = fixture(formSource, { storage: [[`tapaway:review-session:${profileId}`, JSON.stringify({ token, expiresAt })]] });
    f.life.effects(); assert.equal(f.requests[0].body.action, 'session');
    assert.ok(!text(f.life.read()).includes('Phone verified'));
    await answer(f.requests[0], { success: true, expiresAt, maskedPhone: '••• ••• 0123', review: review(4, 'Saved review') });
    assert.ok(text(f.life.read()).includes('Phone verified')); assert.ok(button(f, 'Edit my review'));
    assert.ok(!renderToStaticMarkup(asReact(f.life.read())).includes(token));
  });
  await pass('Public feed includes low scores, escapes comments, and only labels phone-verified rows', async () => {
    const hostile = '<script>window.badReview=true</script> Improve seasoning.';
    const f = fixture(feedSource, { feed: true, page: { enabled: true, total: 2, average: 3, has_more: false,
      reviews: [review(1, hostile), { ...review(5), id: '00000000-0000-4000-8000-000000000098', phone_verified: false }] } });
    button(f, 'Read all 2 reviews').props.onClick(); const html = renderToStaticMarkup(asReact(f.life.read()));
    assert.ok(text(f.life.read()).includes('1/5')); assert.ok(text(f.life.read()).includes('5/5'));
    assert.equal((text(f.life.read()).match(/Phone verified/g) || []).length, 1);
    assert.ok(html.includes('&lt;script&gt;window.badReview=true&lt;/script&gt;')); assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('6615550123'));
  });
  await pass('Unavailable marketing never blocks a verified review, and comment limit counts Unicode characters', async () => {
    const f = fixture(formSource, { config: { ...config, sms: null } }); select(f, 5);
    assert.deepEqual(walk(f.life.read()).filter(n => n.type === 'a').map(n => n.props.href), ['/terms#review-verification', '/privacy#review-verification']);
    await verify(f);
    assert.equal(input(f, 'checkbox'), undefined); comment(f, '🥗'.repeat(601)); assert.equal(button(f, 'Post review').props.disabled, true);
    submit(f); assert.equal(f.requests.length, 2); comment(f, '🥗'.repeat(600)); submit(f); assert.equal(f.requests.length, 3);
    assert.equal(f.requests.at(-1).body.marketingConsent, false);
    await answer(f.requests.at(-1), { success: true, review: review(5, '🥗'.repeat(600)), smsStatus: 'not_requested' });
  });
  console.log(`${checks} offline phone-review component checks passed. No external traffic.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
