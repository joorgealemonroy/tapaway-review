// Offline calendar boundary checks: no network, provider traffic or data writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const exports_ = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/weeklyCutoff.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: exports_, Date, Intl });
const { nextWeeklyCutoff, cutoffCountdown, cutoffScheduleLabel, parseWeeklyCutoffConfig } = exports_;
let count = 0;
const check = (name, fn) => { fn(); count++; console.log(`PASS ${name}`); };
const next = (now, config) => nextWeeklyCutoff(new Date(now), config).toISOString();
check('Friday 11pm Pacific is Saturday UTC, regardless of visitor timezone', () => {
  assert.equal(next('2026-11-12T12:00:00Z'), '2026-11-14T07:00:00.000Z');
  assert.equal(next('2026-11-14T06:59:59Z'), '2026-11-14T07:00:00.000Z');
});
check('Exact cutoff rolls forward once, never freezes at expired zero', () => {
  assert.equal(next('2026-11-14T07:00:00Z'), '2026-11-21T07:00:00.000Z');
});
check('Spring DST changes the next Friday UTC hour while retaining 11pm Pacific', () => {
  assert.equal(next('2026-03-07T07:00:00Z'), '2026-03-14T06:00:00.000Z');
});
check('Autumn DST changes the next Friday UTC hour while retaining 11pm Pacific', () => {
  assert.equal(next('2026-10-31T06:00:00Z'), '2026-11-07T07:00:00.000Z');
});
check('Month and year boundaries retain the local weekday', () => {
  assert.equal(next('2026-12-31T20:00:00Z'), '2027-01-02T07:00:00.000Z');
});
check('Configurable skipped and repeated wall times follow consistent DST rules', () => {
  assert.equal(next('2026-03-08T08:00:00Z', {weekday:0,hour:2,minute:30}), '2026-03-08T10:30:00.000Z');
  assert.equal(next('2026-11-01T07:00:00Z', {weekday:0,hour:1,minute:30}), '2026-11-01T08:30:00.000Z');
});
check('Editor strings parse; invalid configuration falls back safely', () => {
  const parsed = parseWeeklyCutoffConfig({weekday:'5',hour:'23',minute:'0',timeZone:'Not/A_Zone'});
  assert.equal(parsed.timeZone,'America/Los_Angeles'); assert.equal(parsed.hour,23);
  assert.equal(next('2026-11-12T12:00:00Z', {weekday:99,hour:24,minute:-5}), '2026-11-14T07:00:00.000Z');
});
check('Schedule label identifies cutoff time and Pacific timezone', () => {
  assert.equal(cutoffScheduleLabel(new Date('2026-11-14T07:00:00Z'),parseWeeklyCutoffConfig()), 'Fri · 11 PM PT');
});
check('Countdown preserves partial final second and never produces negative units', () => {
  const cutoff = new Date('2026-11-14T07:00:00Z');
  assert.equal(cutoffCountdown(cutoff,cutoff.getTime()-500).seconds,1);
  assert.equal(cutoffCountdown(cutoff,cutoff.getTime()+1).seconds,0);
  assert.equal(cutoffCountdown(cutoff,cutoff.getTime()-90061000).days,1);
  assert.equal(cutoffCountdown(cutoff,cutoff.getTime()-90061000).hours,1);
  assert.equal(cutoffCountdown(cutoff,cutoff.getTime()-90061000).minutes,1);
  assert.equal(cutoffCountdown(cutoff,cutoff.getTime()-90061000).seconds,1);
});
console.log(`PASS ${count} weekly cutoff checks.`);
