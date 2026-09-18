import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('V1.9.0.1 ancient command-center layer loads after V1.8.5.1', () => {
  const html = read('dist/index.html');
  assert.match(html, /V1\.9\.0/);
  assert.match(html, /v190\.css\?v=1\.9\.0\.1/);
  assert.match(html, /v190-ui\.js\?v=1\.9\.0\.1/);
  assert.ok(html.indexOf('v190.css?v=1.9.0.1') > html.indexOf('v185.css?v=1.8.5.1'));
  assert.ok(html.indexOf('v190-ui.js?v=1.9.0.1') > html.indexOf('v185-mobile-nav.js?v=1.8.5.1'));
});

test('V1.9.0.1 moves navigation concepts into the monthly command center', () => {
  const js = read('dist/v190-ui.js');
  for (const label of ['谋生', '求学', '农耕', '军旅', '产业', '关系', '家族树', '历史']) {
    assert.match(js, new RegExp(label));
  }
  assert.match(js, /v190-command-nav/);
  assert.match(js, /v190-tab-area/);
  assert.match(js, /detail-tabs-shell/);
});

test('V1.9.0.1 renames normal month advance to next month without replacing engine logic', () => {
  const js = read('dist/v190-ui.js');
  assert.match(js, /下个月/);
  assert.match(js, /#advance-month/);
  assert.doesNotMatch(js, /advanceMonth\s*\(/, 'V1.9.0.1 UI layer must reuse the existing monthly-turn engine');
});

test('V1.9.0.1 hides old floating navigation and applies ancient business styling', () => {
  const css = read('dist/v190.css');
  assert.match(css, /\.v183-nav-root,\.v185-mobile-side-nav,\.v185-mobile-menu\{display:none!important\}/);
  assert.match(css, /--v190-paper/);
  assert.match(css, /--v190-gold/);
  assert.match(css, /grid-template-areas:[\s\S]*v190nav[\s\S]*action[\s\S]*goal/);
});


test('V1.9.0.1 avoids recursive DOM synchronization on embedded detail tabs', () => {
  const js = read('dist/v190-ui.js');
  assert.doesNotMatch(js, /new MutationObserver/);
  assert.doesNotMatch(js, /observer\.observe\(game/);
  assert.match(js, /!tabButton\.classList\.contains\('active'\)/);
});
