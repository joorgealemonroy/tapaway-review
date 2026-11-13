// Exercise the real editor with isolated React/provider doubles. No customer writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
let checks = 0;
const pass = async (name, fn) => { await fn(); checks++; console.log('PASS ' + name); };
function fixture(overrides = {}) {
  const slots = [], timers = new Map(), calls = [], requests = [], ref = { current: null };
  let index = 0, effects = [], timerId = 0, tree;
  const react = {
    forwardRef: fn => fn,
    useState(initial) { const i = index++; if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }]; },
    useRef(initial) { const i = index++; if (!slots[i]) slots[i] = { current: initial }; return slots[i]; },
    useMemo(fn, deps) { const i = index++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = index++; if (!slots[i] || !same(slots[i].deps, deps)) { const old = slots[i]; slots[i] = { deps }; effects.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); }); } },
    useImperativeHandle(target, fn, deps) { react.useEffect(() => { target.current = fn(); }, deps); },
  };
  const db = {
    rpc(name, args) { return new Promise(resolve => requests.push({ name, args, resolve })); },
    from(table) { const call = { table, filters: [] }; const query = {
      update(value) { call.update = value; calls.push(call); return query; },
      eq(...args) { call.filters.push(args); return query; },
      then(...args) { return Promise.resolve({ error: null }).then(...args); },
    }; return query; },
    auth: { getUser: async () => ({ data: { user: { id: 'rep-one' } } }) },
  };
  const generic = new Proxy({}, { get: (_, key) => key === 'cn' ? (...v) => v.filter(Boolean).join(' ') : String(key) });
  const exports = {};
  const jsx = (type, props) => ({ type, props: props || {} });
  const req = name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === '@/integrations/supabase/client') return { supabase: db };
    if (name === '@/hooks/useProfileCache') return { invalidateProfileCache() {} };
    if (name === '@/lib/reservedUsernames') return { isUsernameReserved: value => value === 'admin' };
    if (name === '@/lib/personalUsername') {
      const result = {};
      vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'src/lib/personalUsername.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: result });
      return result;
    }
    if (name === 'sonner') return { toast: { error() {} } };
    return generic;
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'src/components/personal/DashboardHeroEditor.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: req, console, setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
  });
  const props = { profileId: 'draft-one', username: 'deadbeet-coffee', fullName: 'Deadbeet Coffee', headline: null, bio: null, planType: null, showUsername: true, onUpdate() {}, ...overrides };
  const render = () => { index = 0; tree = exports.DashboardHeroEditor(props, ref); const queue = effects; effects = []; queue.forEach(fn => fn()); return tree; };
  const settle = () => { for (let i = 0; i < 4; i++) render(); };
  const nodes = node => node && typeof node === 'object' ? [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)] : [];
  settle();
  return { props, ref, calls, requests, settle, render,
    edit(value, label = 'Your TapAway address') { nodes(tree).find(n => n.type === 'Input' && (label === 'name' ? n.props.placeholder === 'Your name' : label === 'headline' ? n.props.placeholder === 'e.g. Creator • LA • Tap to connect' : n.props['aria-label'] === label)).props.onChange({ target: { value } }); },
    timers() { const queue = [...timers.values()]; timers.clear(); queue.forEach(fn => fn()); },
    async answer(data, error = null) { requests.at(-1).resolve({ data, error }); await flush(); settle(); },
  };
}
(async () => {
  await pass('A successful save cannot swallow the next edit notification when clearing a name', async () => {
    let edits = 0;
    const f = fixture({ onEdit: () => { edits++; } });
    assert.equal(edits, 0);
    f.edit('Updated name', 'name'); f.settle();
    assert.equal(edits, 1);
    await f.ref.current.saveAllChanges();
    Object.assign(f.props, { fullName: 'Updated name' }); f.settle();
    assert.equal(edits, 1, 'Synchronizing saved props must not schedule another save');
    f.edit('', 'name'); f.settle();
    assert.equal(edits, 2, 'Clearing after a save must still notify the autosave parent');
    await f.ref.current.saveAllChanges();
    assert.equal(f.calls.at(-1).update.full_name, '');
  });
  await pass('Display names can be cleared and stay blank after saving and reloading', async () => {
    for (const value of ['', '   ']) {
      const f = fixture({ showUsername: false });
      f.edit(value, 'name'); f.settle(); await f.ref.current.saveAllChanges();
      assert.equal(f.calls.length, 1);
      assert.equal(f.calls[0].update.full_name, '');
      assert.equal(f.calls[0].update.show_username, false);
      assert.equal('username' in f.calls[0].update, false);
      Object.assign(f.props, { fullName: f.calls[0].update.full_name }); f.settle();
      assert.equal(f.ref.current.getSnapshot().name, '');
      assert.equal(f.ref.current.hasPendingChanges, false);
    }
  });
  await pass('An intentionally blank display name never blocks unrelated hero edits or changes the address', async () => {
    for (const planType of [null, 'free', 'solo_pro', 'personal_hosted']) {
      const f = fixture({ fullName: '', showUsername: false, planType });
      f.edit('Coffee, made fresh', 'headline'); f.settle(); await f.ref.current.saveAllChanges();
      assert.equal(f.calls[0].update.full_name, '');
      assert.equal(f.calls[0].update.headline, 'Coffee, made fresh');
      assert.equal('username' in f.calls[0].update, false);
      assert.equal(f.requests.length, 0);
      f.ref.current.discardChanges(); f.settle();
      assert.equal(f.ref.current.getSnapshot().name, '');
    }
  });
  await pass('Null-plan rep draft and legacy unprefixed free hub keep their existing URL on content saves', async () => {
    for (const planType of [null, 'free', 'solo_pro']) {
      const f = fixture({ planType }); assert.equal(f.ref.current.hasPendingChanges, false);
      await f.ref.current.saveAllChanges(); assert.equal(f.calls.length, 0);
      f.edit('Deadbeet Coffee updated', 'name'); f.settle(); await f.ref.current.saveAllChanges();
      assert.equal(f.calls.length, 1); assert.equal(f.calls[0].update.full_name, 'Deadbeet Coffee updated');
      assert.equal('username' in f.calls[0].update, false); assert.equal(f.requests.length, 0);
    }
  });
  await pass('Legacy prefixed personal address and long stored demo address survive unrelated saves', async () => {
    for (const props of [{ planType: 'free', username: 'tapcoffee' }, { username: 'a'.repeat(40) + '-25' }]) {
      const f = fixture(props); assert.equal(f.ref.current.hasPendingChanges, false);
      f.edit('New display name', 'name'); f.settle(); await f.ref.current.saveAllChanges(); assert.equal('username' in f.calls[0].update, false);
    }
  });
  await pass('Hyphenated address change is checked and saved atomically by the database', async () => {
    const f = fixture(); f.edit('deadbeet-coffee-new'); f.settle(); f.timers();
    assert.equal(f.requests[0].args.check_username, 'deadbeet-coffee-new');
    await f.answer(true); await f.ref.current.saveAllChanges();
    assert.equal(f.calls[0].update.username, 'deadbeet-coffee-new');
    assert.equal(f.calls.length, 1, 'Slug and cards must not be split across client requests; the SQL suite verifies the owner-bound trigger');
  });
  await pass('Another candidate cannot reuse a previous availability result, including before effects', async () => {
    const f = fixture(); f.edit('first-candidate'); f.settle(); f.timers(); await f.answer(true);
    f.edit('second-candidate'); f.render(); f.render();
    await assert.rejects(() => f.ref.current.saveAllChanges(), /checked/); assert.equal(f.calls.length, 0);
    f.timers(); await f.answer(false); await assert.rejects(() => f.ref.current.saveAllChanges(), /taken/);
  });
  await pass('Unavailable checks and reserved names never write; locked URLs ignore restored changes', async () => {
    const f = fixture(); f.edit('new-candidate'); f.settle(); f.timers(); await f.answer(null, new Error('Offline fixture'));
    await assert.rejects(() => f.ref.current.saveAllChanges(), /connection/); assert.equal(f.calls.length, 0);
    f.edit('admin'); f.settle(); await assert.rejects(() => f.ref.current.saveAllChanges(), /reserved/);
    const locked = fixture({ usernameLocked: true }); locked.ref.current.restoreSnapshot({ ...locked.ref.current.getSnapshot(), name: 'Updated', usernameInput: 'different' }); locked.settle();
    await locked.ref.current.saveAllChanges(); assert.equal('username' in locked.calls[0].update, false);
  });
  console.log(`PASS ${checks} rep hub editor checks; no live mutations.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
