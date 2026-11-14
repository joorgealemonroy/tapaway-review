const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => name === "@/lib/google" ? load("src/lib/google.ts") : new Proxy({}, { get: () => () => null }), URL, console });
  return exports;
}
const { getPlatformConfig, isBareDomainHandle, PLATFORM_CONFIGS } = load('src/lib/platformLinks.tsx');
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
// Exercise the same extract -> generate flow used for both save and preview.
const cases = [
  ['instagram', 'instagram.com/@studio.co', 'instagram://user?username=studio.co'],
  ['tiktok', 'tiktok.com/@rebels.burgers.br', 'https://tiktok.com/@rebels.burgers.br'],
  ['youtube', 'youtube.com/@studio.co?si=abc', 'https://youtube.com/@studio.co'],
  ['youtube', 'https://youtube.com/channel/UC123', 'https://youtube.com/channel/UC123'],
  ['youtube', 'https://youtu.be/video123?si=abc', 'https://youtu.be/video123?si=abc'],
  ['youtube', 'youtube.com/watch?v=video123', 'https://youtube.com/watch?v=video123'],
  ['x', 'twitter.com/studio', 'https://x.com/studio'],
  ['threads', 'threads.com/@studio.co', 'https://threads.net/@studio.co'],
  ['linkedin', 'linkedin.com/company/studio.co', 'https://linkedin.com/company/studio.co'],
  ['facebook', 'facebook.com/profile.php?id=123', 'https://facebook.com/profile.php?id=123'],
  ['discord', 'discord.com/invite/abc123', 'https://discord.gg/abc123'],
  ['twitch', 'twitch.tv/studio', 'https://twitch.tv/studio'],
  ['snapchat', 'snapchat.com/add/studio.co', 'https://snapchat.com/add/studio.co'],
  ['pinterest', 'pinterest.com/studio', 'https://pinterest.com/studio'],
  ['whatsapp', 'wa.me/15551234567?text=Hello', 'https://wa.me/15551234567?text=Hello'],
  ['whatsapp', '+1 (555) 123-4567', 'https://wa.me/15551234567'],
  ['whatsapp', 'https://api.whatsapp.com/send?phone=15551234567&text=Hello', 'https://api.whatsapp.com/send?phone=15551234567&text=Hello'],
  ['telegram', 't.me/studio', 'https://t.me/studio'],
  ['google_review', 'ChIJ123_example', 'https://search.google.com/local/writereview?placeid=ChIJ123_example'],
  ['google_review', 'https://g.page/r/example/review', 'https://g.page/r/example/review'],
  ['yelp', 'yelp.com/biz/studio-co', 'https://www.yelp.com/biz/studio-co'],
  ['directions', '123 Main St', 'https://maps.apple.com/?daddr=123%20Main%20St'],
  ['phone', '+1 (555) 123-4567', 'tel:+15551234567'],
  ['website', 'example.com/page?ref=hub#menu', 'https://example.com/page?ref=hub#menu'],
  ['email', 'hello@studio.co', 'mailto:hello@studio.co'],
  ['venmo', 'venmo.com/u/studio', 'https://venmo.com/studio'],
  ['cashapp', 'cash.app/$studio', 'https://cash.app/$studio'],
  ['cashapp', '$studio', 'https://cash.app/$studio'],
  ['paypal', 'paypal.me/studio.co', 'https://paypal.me/studio.co'],
  ['paypal', 'paypal.me/studio/20?currencyCode=USD', 'https://paypal.me/studio/20?currencyCode=USD'],
  ['paypal', 'https://www.paypal.com/donate/?hosted_button_id=ABC', 'https://www.paypal.com/donate/?hosted_button_id=ABC'],
  ['whatsapp', 'https://chat.whatsapp.com/InviteCode', 'https://chat.whatsapp.com/InviteCode'],
  ['patreon', 'patreon.com/studio.co', 'https://patreon.com/studio.co'],
  ['kofi', 'ko-fi.com/studio', 'https://ko-fi.com/studio'],
  ['spotify', 'open.spotify.com/artist/123?si=abc', 'https://open.spotify.com/artist/123?si=abc'],
  ['applemusic', 'music.apple.com/us/artist/studio/123', 'https://music.apple.com/us/artist/studio/123'],
  ['soundcloud', 'soundcloud.com/studio', 'https://soundcloud.com/studio'],
  ['bandcamp', 'studio.bandcamp.com/album/example', 'https://studio.bandcamp.com/album/example'],
  ['github', 'github.com/studio', 'https://github.com/studio'],
  ['behance', 'behance.net/studio', 'https://behance.net/studio'],
  ['dribbble', 'dribbble.com/studio', 'https://dribbble.com/studio'],
];
function savedUrl(platform, input) {
  const value = platform.extractValue(input.trim()) || input.trim();
  const url = platform.generateUrl(value);
  return !url || (platform.inputType === 'handle' && isBareDomainHandle(value)) ? '' : url;
}
for (const [type, input, expected] of cases) {
  const platform = getPlatformConfig(type);
  assert.equal(savedUrl(platform, input), expected, `${type}: ${input}`);
  assert.equal(savedUrl(platform, expected), expected, `${type}: reopen and save`);
}
assert.deepEqual([...new Set(cases.map(c => c[0]))].sort(), Array.from(PLATFORM_CONFIGS, p => p.type).sort(), 'Every platform needs a regression case');
for (const type of ['instagram', 'tiktok', 'x', 'threads', 'twitch', 'snapchat', 'pinterest', 'telegram', 'venmo', 'patreon', 'kofi', 'soundcloud', 'github', 'behance', 'dribbble']) {
  const platform = getPlatformConfig(type);
  assert.notEqual(savedUrl(platform, 'studio.co'), '', `${type}: dotted handle`);
  assert.notEqual(savedUrl(platform, '@studio.co'), '', `${type}: @handle`);
}
for (const [type, host] of [['youtube', 'youtube.com'], ['cashapp', 'cash.app'], ['paypal', 'paypal.me'], ['patreon', 'patreon.com'], ['kofi', 'ko-fi.com'], ['soundcloud', 'soundcloud.com'], ['github', 'github.com'], ['behance', 'behance.net'], ['dribbble', 'dribbble.com']]) {
  for (const input of ['', host, `https://${host}/`]) assert.equal(savedUrl(getPlatformConfig(type), input), '', `${type}: missing profile`);
}
assert.equal(getPlatformConfig('instagram').generateUrl('instagram.comedy'), 'instagram://user?username=instagram.comedy', 'host prefix is a valid handle');
const { HUB_BACKGROUND_PRESETS, lightHubBackground } = load('src/lib/hubAppearance.ts');
assert.equal(HUB_BACKGROUND_PRESETS.length, 24);
assert.equal(new Set(HUB_BACKGROUND_PRESETS.map(p => p.color)).size, 24);
for (const { color } of HUB_BACKGROUND_PRESETS) assert.equal(lightHubBackground(color), color);
console.log(`PASS all ${PLATFORM_CONFIGS.length} link types, dotted usernames, pasted URLs, edit/save round trips, missing profiles and 24 background colors`);
