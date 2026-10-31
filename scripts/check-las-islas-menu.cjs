// Offline exact scope, search and authoritative menu economics; no network or writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const exports_ = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/lasIslasMenu.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exports_ });
const { hasLasIslasMenu, filterMenu } = exports_;
const data = JSON.parse(fs.readFileSync('src/data/lasIslasMenu.json'));
let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log(`PASS ${name}`); };
const sections = data.sections.map((s, n) => ({ ...s, id: String(n), items: s.items.map((i, x) => ({ ...i, id: `${n}-${x}` })) }));
const item = name => sections.flatMap(s => s.items).find(i => i.name === name);
check('Exactly two authorized IDs; original Islas and slug strings never enable location menu', () => {
  assert.equal(hasLasIslasMenu('aff3e306-8ccf-4c55-b33f-88da2d17bba8'), true);
  assert.equal(hasLasIslasMenu('e0e6ff46-9574-4df8-84bd-94ecedfbd4fd'), true);
  for (const id of ['islas', 'islasfontana', 'islasmarias', 'lasislas', 'lasislasfontana', 'other']) assert.equal(hasLasIslasMenu(id), false);
});
check('Search removes accents and searches categories, items and ingredients without mutating menu', () => {
  const before = JSON.stringify(sections);
  assert.deepEqual(JSON.parse(JSON.stringify(filterMenu(sections, 'camarón'))), JSON.parse(JSON.stringify(filterMenu(sections, 'CAMARON'))));
  assert.ok(filterMenu(sections, 'shrimp').length > 0);
  assert.equal(filterMenu(sections, 'not-a-menu-item').length, 0);
  assert.equal(filterMenu(sections, 'Botanas Frías').find(s => s.name === 'Botanas Frías').items.length, 13);
  assert.equal(JSON.stringify(sections), before);
});
check('All eight reviewed pages produce 20 categories and 155 unique category items', () => {
  assert.deepEqual(data.pagesReviewed, [1,2,3,4,5,6,7,8]); assert.equal(sections.length, 20);
  assert.equal(sections.reduce((n,s) => n+s.items.length,0),155);
  for (const s of sections) assert.equal(new Set(s.items.map(i=>i.name)).size,s.items.length);
});
check('Sarandeado is $33/kg plus $3.30 per 100g and at least 30 minutes', () => {
  assert.equal(item('Pescado Sarandeado').price,'1 kg $33.00');
  assert.match(item('Pescado Sarandeado').description,/\$3\.30 per 100g/);
  assert.match(item('Pescado Sarandeado').description,/at least 30 minutes/);
});
check('Filete Zarandeado is $26 with at least 25 minutes', () => {
  assert.equal(item('Filete Zarandeado').price,'$26.00'); assert.match(item('Filete Zarandeado').description,/at least 25 minutes/);
});
check('Chips service is $4 after first service and dine-in only', () => {
  assert.match(sections.find(s=>s.name==='Órdenes Extras · Sides').note,/\$4\.00 after first chips & sauce service \(dine-in only\)/);
});
check('Market-price crab and all 17 unpriced spirits have no invented amounts', () => {
  assert.equal(item('Patas de Jaiba').price,'Market Price'); assert.equal(item('Tequilas Shot').price,'Prices Vary');
  const spirits=sections.at(-1).items; assert.equal(spirits.length,17); for(const i of spirits) assert.equal(i.price,null);
});
check('Quantity prices retain all choices', () => {
  assert.equal(item('Empanadas de Camarón').price,'3 pieces $10.50 · 6 pieces $21.00 · 12 pieces $40.00');
  assert.equal(item('Langostinos').price,'Regular $28.00 · Grande $38.00');
  assert.equal(item('Aguas Frescas').price,'Medium $5.00 · Large $6.00');
});
console.log(`PASS ${checks} menu checks. No provider traffic.`);