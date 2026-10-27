// Isolated interaction checks of the actual booking component. No network or writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
const root = path.resolve(__dirname, '..');
process.env.TZ = 'Asia/Tokyo';
let checks = 0;
const pass = async (name, run) => { await run(); checks++; console.log(`PASS ${name}`); };
const flush = () => new Promise(resolve => setImmediate(resolve));
const textOf = node => node == null || typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(textOf).join(' ') : typeof node === 'object' ? textOf(node.props?.children) : String(node);
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const props = { creatorId: '11111111-1111-4111-8111-111111111111', productId: '22222222-2222-4222-8222-222222222222', durationMinutes: 30, priceCents: 4500 };
class Clock extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-21T12:00:00Z'])); } static now() { return Date.parse('2026-10-21T12:00:00Z'); } }
function fixture() {
  const env = { index: 0, values: [], effects: [], calls: [], stored: new Map(), navigations: [], fail: false };
  env.values[0] = [{ day_of_week: 1, start_time: '09:00:00', end_time: '11:00:00', timezone: 'America/Los_Angeles' }];
  env.values[1] = []; env.values[2] = new Date('2026-11-02T00:00:00'); env.values[3] = null; env.values[4] = 'buyer@example.invalid'; env.values[5] = false;
  const react = { useState(initial) { const i = env.index++; if (!(i in env.values)) env.values[i] = initial; return [env.values[i], value => { env.values[i] = typeof value === 'function' ? value(env.values[i]) : value; }]; },
    useRef(initial) { const i = env.index++; if (!(i in env.values)) env.values[i] = { current: initial }; return env.values[i]; }, useMemo: fn => fn(), useEffect: fn => env.effects.push(fn) };
  const supabase = { rpc: async function(name, args) { assert.equal(this, supabase, 'RPC keeps its client receiver'); env.calls.push({ name, args }); return { data: env.values[1], error: env.slotFailure ? new Error('fixture') : null }; },
    from(name) { assert.equal(name, 'creator_availability', 'Calendar must never read/write private bookings'); return { select() { return this; }, eq() { return this; }, then(fn) { return Promise.resolve(fn({ data: env.values[0], error: null })); } }; },
    functions: { invoke: async (name, args) => { env.calls.push({ name, body: args.body }); if (env.fail) return { data: null, error: new Error('fixture') }; return { data: { url: env.url || 'https://checkout.stripe.com/c/pay/fixture' }, error: null }; } } };
  const jsx = (type, props) => ({ type, props: props || {} });
  const generic = new Proxy({}, { get: (_, key) => String(key) });
  const requireFixture = name => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name === '@/integrations/supabase/client' ? { supabase } : name === '@/lib/utils' ? { cn: (...args) => args.filter(Boolean).join(' ') } : generic;
  const storage = { getItem: key => env.stored.get(key) || null, setItem: (key, value) => env.stored.set(key, value) };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(root, 'src/components/personal/BookingCalendar.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { exports, require: requireFixture, Date: Clock, Intl, URL, Error, TextEncoder, Uint8Array, crypto: webcrypto, sessionStorage: storage, window: { location: { assign: url => env.navigations.push(url) } } });
  env.render = () => { env.index = 0; env.effects = []; return exports.BookingCalendar(props); };
  env.select = label => { const button = nodes(env.render()).find(n => n.type === 'button' && textOf(n) === label); assert.ok(button, `Slot ${label}`); button.props.onClick(); };
  env.pay = () => nodes(env.render()).find(n => n.type === 'button' && textOf(n).startsWith('Continue to payment')).props.onClick;
  return env;
}
(async () => {
  await pass('Visitor timezone cannot change the creator appointment date or start time', async () => {
    const s = fixture(); s.select('9:00 AM'); await s.pay()();
    const body = s.calls.find(c => c.name === 'create-product-checkout').body;
    assert.equal(body.booking.date, '2026-11-02'); assert.equal(body.booking.startTime, '09:00:00'); assert.equal(body.booking.timezone, 'America/Los_Angeles');
    assert.equal(s.values[3].utcMs, Date.parse('2026-11-02T17:00:00Z'));
    assert.equal(body.productId, props.productId); assert.equal(body.buyerEmail, 'buyer@example.invalid');
    for (const key of ['bookingId', 'creatorId', 'status', 'price', 'testMode']) assert.equal(body[key], undefined);
  });
  await pass('Occupied ranges block overlapping appointment starts across product durations', () => {
    const s = fixture(); s.values[1] = [{ starts_at: '2026-11-02T17:15:00Z', ends_at: '2026-11-02T18:15:00Z', status: 'paid', reserved_until: null }];
    const slots = nodes(s.render()).filter(n => n.type === 'button' && /AM$/.test(textOf(n)));
    assert.deepEqual(slots.map(n => [textOf(n), Boolean(n.props.disabled)]), [['9:00 AM', true], ['9:30 AM', true], ['10:00 AM', true], ['10:30 AM', false]]);
  });
  await pass('Public availability reads only the privacy-preserving slot RPC', async () => {
    const s = fixture(); s.render(); s.effects[1](); await flush();
    assert.equal(s.calls[0].name, 'get_public_booking_slots'); assert.equal(s.calls[0].args._product_id, props.productId); assert.equal(s.calls[0].args._from, '2026-11-02');
    assert.equal(s.values[6], false);
  });
  await pass('Double clicks produce one request and safely navigate to Stripe', async () => {
    const s = fixture(); s.select('9:00 AM'); const click = s.pay(); await Promise.all([click(), click()]);
    assert.equal(s.calls.filter(c => c.name === 'create-product-checkout').length, 1); assert.deepEqual(s.navigations, ['https://checkout.stripe.com/c/pay/fixture']);
  });
  await pass('Checkout failure remains retryable with the same request identity and no stored email', async () => {
    const s = fixture(); s.fail = true; s.select('9:00 AM'); await s.pay()();
    assert.ok(nodes(s.render()).some(n => n.props.role === 'alert'));
    const first = s.calls[0].body.booking.requestKey; s.fail = false; await s.pay()();
    assert.equal(s.calls[1].body.booking.requestKey, first); assert.ok(!JSON.stringify([...s.stored]).includes('buyer@example.invalid'));
  });
  await pass('Non-Stripe checkout URLs never navigate and failed availability remains blocked', async () => {
    const s = fixture(); s.url = 'javascript:alert(1)'; s.select('9:00 AM'); await s.pay()(); assert.equal(s.navigations.length, 0);
    const missing = fixture(); missing.slotFailure = true; missing.render(); missing.effects[1](); await flush();
    assert.ok(nodes(missing.render()).filter(n => n.type === 'button' && /AM$/.test(textOf(n))).every(n => n.props.disabled));
    assert.ok(nodes(missing.render()).some(n => textOf(n) === 'Check times again'));
  });
  console.log(`${checks} booking calendar interaction checks passed. No network, writes or checkout sessions.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
