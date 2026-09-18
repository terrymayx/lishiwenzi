import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('V1.11.2 loads one presentation layer and drops V1.9/V1.10 visual controllers', () => {
  const html = read('dist/index.html');
  assert.match(html, /V1\.11\.1/);
  assert.match(html, /v211\.css\?v=1\.11\.1/);
  assert.match(html, /v211-ui\.js\?v=1\.11\.1/);
  assert.doesNotMatch(html, /v190(?:-ui)?\.js|v190\.css|v200(?:-ui)?\.js|v200\.css/);
});

test('V1.11.2 shell is self-contained and does not depend on V1.9 DOM builders', () => {
  const js = read('dist/v211-ui.js');
  assert.match(js, /createPrimaryNavigation/);
  assert.match(js, /ensureDetailHeader/);
  assert.match(js, /ensureEmbeddedTabs/);
  assert.doesNotMatch(js, /MutationObserver/);
  assert.doesNotMatch(js, /v190-ui/);
});

test('V1.11.2 keeps top resources on one line and gives the target dashboard fixed visual roles', () => {
  const css = read('dist/v211.css');
  assert.match(css, /\.resource-card b\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(css, /#v211-layout/);
  assert.match(css, /#v211-bottom-dashboard/);
  assert.match(css, /\.v211-action-row/);
  assert.match(css, /\.v211-next-month/);
});
