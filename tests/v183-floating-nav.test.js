import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('V1.8.3 page loads the floating navigation layer', () => {
  const html = read('dist/index.html');
  assert.match(html, /V1\.8\.3/);
  assert.match(html, /v183\.css\?v=1\.8\.3/);
  assert.match(html, /v183-nav\.js\?v=1\.8\.3/);
});

test('floating navigation reuses existing tabs and exposes the current-task shortcut', () => {
  const js = read('dist/v183-nav.js');
  execFileSync(process.execPath, ['--check', new URL('../dist/v183-nav.js', import.meta.url).pathname]);

  for (const tab of ['family', 'relations', 'assets', 'timeline']) {
    assert.match(js, new RegExp(`tab:\\s*['\"]${tab}['\"]`), `${tab} shortcut must exist`);
  }
  assert.match(js, /#detail-tabs-shell/);
  assert.match(js, /#next-goal-panel/);
  assert.match(js, /\[data-tab="\$\{item\.tab\}"\]/);
  assert.match(js, /\.click\(\)/, 'tab navigation must reuse the existing tab button handler');
  assert.match(js, /scrollIntoView/);
});

test('floating navigation can open, close, and dismiss itself from outside clicks', () => {
  const js = read('dist/v183-nav.js');
  assert.match(js, /aria-expanded/);
  assert.match(js, /dataset\.navOpen/);
  assert.match(js, /document\.addEventListener\(['\"]click['\"]/);
  assert.match(js, /Escape/);
});

test('floating navigation stays fixed at the lower-right corner and has a compact popup menu', () => {
  const css = read('dist/v183.css');
  assert.match(css, /\.v183-nav-root[\s\S]*position:\s*fixed/);
  assert.match(css, /right:\s*/);
  assert.match(css, /bottom:\s*/);
  assert.match(css, /\.v183-nav-menu/);
  assert.match(css, /z-index:\s*[1-9]/);
  assert.match(css, /@media\s*\(max-width:/);
});
