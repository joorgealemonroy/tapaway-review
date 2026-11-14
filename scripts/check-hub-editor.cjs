const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, require: () => new Proxy({}, { get: () => () => null }), URL, console });
  return exports;
}
const { getPlatformConfig, isBareDomainHandle } = load('src/lib/platformLinks.tsx');
for (const type of ['tiktok', 'instagram']) {
  const platform = getPlatformConfig(type);
  for (const handle of ['rebels.burgers.br', 'studio.co', 'business.com', 'j.smith', 'a.v.meals', 'my_business']) {
    for (const input of [handle, '@' + handle, `https://www.${type}.com/${type === 'tiktok' ? '@' : ''}${handle}?lang=en`]) {
      assert.equal(platform.extractValue(input), handle);
      assert.equal(platform.generateUrl(input), type === 'tiktok' ? `https://tiktok.com/@${handle}` : `instagram://user?username=${handle}`);
      assert.equal(isBareDomainHandle(handle), false);
    }
  }
  for (const input of ['', `${type}.com`, `${type}.com/`, `https://www.${type}.com/`]) assert.equal(platform.generateUrl(input), '');
}
const fb = getPlatformConfig('facebook');
assert.equal(fb.generateUrl('facebook.com/'), '');
assert.equal(fb.generateUrl('facebook.com/people/Example/123456'), 'https://facebook.com/people/Example/123456');
assert.equal(getPlatformConfig('website').generateUrl('example.com'), 'https://example.com');
const { HUB_BACKGROUND_PRESETS, lightHubBackground } = load('src/lib/hubAppearance.ts');
assert.equal(HUB_BACKGROUND_PRESETS.length, 24);
assert.equal(new Set(HUB_BACKGROUND_PRESETS.map(p => p.color)).size, 24);
for (const { color } of HUB_BACKGROUND_PRESETS) assert.equal(lightHubBackground(color), color);
console.log('PASS dotted social usernames, full URLs, empty platform URLs, normal website links and 24 rendered background colors');
