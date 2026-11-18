// Rules for the per-link "Button" style and the per-hub "Buttons only" setting.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const lib = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/hubLinkButtons.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: lib });
const { rendersAsButton, splitHubLinks, isGridTileLink, hubButtonColors } = lib;

const links = [
  { id: 'row', display_style: 'pill', url: 'https://a.example' },
  { id: 'course', display_style: 'button', url: 'https://docs.google.com/forms/x' },
  { id: 'ig', display_style: 'icon', url: 'https://instagram.com/x' },
  { id: 'both', display_style: 'both', url: 'https://tiktok.com/@x' },
  { id: 'tile', display_style: 'pill', url: 'https://b.example', cover_image_url: 'https://img', grid_size: 'half' },
  { id: 'hidden', display_style: 'pill', url: 'https://c.example', is_active: false },
];
const snapshot = JSON.stringify(links);

// Buttons only is off unless explicitly true: only the link saved as Button is a button.
for (const off of [undefined, null, false]) {
  assert.deepEqual(links.filter((l) => rendersAsButton(l, off)).map((l) => l.id), ['course']);
  const { iconLinks, listLinks } = splitHubLinks(links, off);
  assert.deepEqual(iconLinks.map((l) => l.id), ['ig', 'both']);
  assert.deepEqual(listLinks.map((l) => l.id), ['row', 'course', 'both', 'tile']);
  assert.equal(isGridTileLink(links[4], off), true);
}

// Buttons only on: no icon bar, every active link (including icon-only) is a button, no image tiles.
{
  const { iconLinks, listLinks } = splitHubLinks(links, true);
  assert.equal(iconLinks.length, 0);
  assert.deepEqual(listLinks.map((l) => l.id), ['row', 'course', 'ig', 'both', 'tile']);
  assert.ok(listLinks.every((l) => rendersAsButton(l, true)));
  assert.equal(isGridTileLink(links[4], true), false);
}

// A half-size image link saved as Button is never grouped into the tile grid.
assert.equal(isGridTileLink({ display_style: 'button', cover_image_url: 'https://img', grid_size: 'half' }, false), false);

// Toggling never rewrites saved link styles, so switching back restores them.
assert.equal(JSON.stringify(links), snapshot);

// Hub palette: non-hex themes (e.g. "glass") fall back to a contrasting solid button with legible text.
assert.equal(JSON.stringify(hubButtonColors('glass', true)), JSON.stringify({ background: '#FFFFFF', color: '#1A1A1A' }));
assert.equal(JSON.stringify(hubButtonColors(null, false)), JSON.stringify({ background: '#1A1A1A', color: '#FFFFFF' }));
assert.equal(hubButtonColors('#0EA5A4', false).background, '#0EA5A4');
assert.equal(hubButtonColors('#FDE68A', true).color, '#1A1A1A');
assert.equal(hubButtonColors('#1E3A8A', true).color, '#FFFFFF');

console.log('PASS hub link buttons');
