import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('V1.8.5.1 loads the mobile-side-navigation hotfix after V1.8.4', () => {
  const html = read('dist/index.html');
  assert.match(html, /V1\.8\.5\.1/);
  assert.match(html, /v185\.css\?v=1\.8\.5\.1/);
  assert.match(html, /v185-mobile-nav\.js\?v=1\.8\.5\.1/);
  assert.ok(html.indexOf('v185.css?v=1.8.5.1') > html.indexOf('v184.css?v=1.8.4'));
});

test('mobile side rail exposes industry, relations, history and menu as thumb-friendly direct buttons', () => {
  const js = read('dist/v185-mobile-nav.js');
  execFileSync(process.execPath, ['--check', new URL('../dist/v185-mobile-nav.js', import.meta.url).pathname]);

  for (const tab of ['assets', 'relations', 'timeline']) {
    assert.match(js, new RegExp(`tab:\\s*['\"]${tab}['\"]`), `${tab} mobile shortcut must exist`);
  }
  assert.match(js, /v185-mobile-side-nav/);
  assert.match(js, /v185-mobile-menu-toggle/);
  assert.match(js, /\[data-tab="\$\{item\.tab\}"\]/);
  assert.match(js, /\.click\(\)/, 'mobile navigation must reuse the existing tab handlers');
});

test('mobile menu reuses family, current-task and existing utility controls instead of duplicating game logic', () => {
  const js = read('dist/v185-mobile-nav.js');
  assert.match(js, /tab:\s*['"]family['"]/);
  assert.match(js, /#next-goal-panel/);
  assert.match(js, /#v184-utility-menu/);
  assert.match(js, /scrollIntoView/);
  assert.doesNotMatch(js, /advanceMonth\s*\(|buyBusiness\s*\(|buyLand\s*\(/);
});

test('phone navigation is fixed at the right-middle, vertical, and replaces the old lower-right ball on mobile', () => {
  const css = read('dist/v185.css');
  const rail = css.match(/\.v185-mobile-side-nav\s*\{([\s\S]*?)\}/)?.[1] || '';
  assert.match(rail, /position:\s*fixed/);
  assert.match(rail, /right:\s*/);
  assert.match(rail, /top:\s*50%/);
  assert.match(rail, /transform:\s*translateY\(-50%\)/);
  assert.match(rail, /flex-direction:\s*column/);
  assert.doesNotMatch(rail, /bottom\s*:/, 'new phone rail must not be bottom-anchored');
});

test('touch landscape devices use the phone rail even when their CSS viewport is wider than 760px', () => {
  const css = read('dist/v185.css');
  assert.match(css, /@media[^{]*\(hover:\s*none\)[^{]*\(pointer:\s*coarse\)/, 'touch capability must activate the mobile navigation independently of width');
  assert.match(css, /@media[^{]*\(max-width:\s*(900|1024|1100)px\)/, 'narrow screens should also use the mobile rail');
  assert.match(css, /\(hover:\s*none\)[\s\S]*\.v183-nav-root[\s\S]*display:\s*none\s*!important/, 'touch devices must hide the old lower-right navigation ball');
  assert.match(css, /\(hover:\s*none\)[\s\S]*#game[\s\S]*padding-right:\s*(7[0-9]|8[0-9]|9[0-9])px/, 'touch devices must reserve the thumb-navigation gutter even in landscape');
  assert.doesNotMatch(css, /@media\s*\(min-width:\s*761px\)[\s\S]*\.v185-mobile-side-nav[\s\S]*display:\s*none\s*!important/, 'wide touch devices must not be unconditionally forced back to the desktop navigator');
});

test('mobile content reserves a right thumb zone and the popup menu opens beside the rail', () => {
  const css = read('dist/v185.css');
  assert.match(css, /\.v185-mobile-menu[\s\S]*position:\s*fixed/);
  assert.match(css, /\.v185-mobile-menu[\s\S]*right:\s*(6[0-9]|7[0-9]|8[0-9])px/);
  assert.match(css, /\.v185-mobile-nav-button[\s\S]*width:\s*(5[0-9]|6[0-9])px/);
  assert.match(css, /\.v185-mobile-nav-button[\s\S]*height:\s*(5[0-9]|6[0-9])px/);
});

test('V1.8.4 label synchronizer yields to the newer V1.8.5 release layer', () => {
  const js = read('dist/v184-ui.js');
  assert.match(js, /compatibility-v185/);
  assert.match(js, /applyVersionLabel[\s\S]*compatibility-v185[\s\S]*return/);
});
