import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('V1.10.0 global-ancient files are retained only as historical assets', () => {
  const html = read('dist/index.html');
  assert.ok(fs.existsSync(new URL('../dist/v200.css', import.meta.url)));
  assert.ok(fs.existsSync(new URL('../dist/v200-ui.js', import.meta.url)));
  assert.doesNotMatch(html, /v200\.css\?v=|v200-ui\.js\?v=/);
});

test('V1.10.0 styles all major surfaces with one ancient visual system', () => {
  const css = read('dist/v200.css');
  for (const token of [
    '--v200-paper',
    '.v200-top-status',
    '.v200-left-nav',
    '.v200-center-stage',
    '.v200-right-rail',
    '.v200-next-month-button',
    '.v200-family-board',
    '.v200-relations-board'
  ]) assert.ok(css.includes(token), token);
});

test('V1.10.0 does not introduce a DOM observer render loop', () => {
  const js = read('dist/v200-ui.js');
  assert.doesNotMatch(js, /MutationObserver/);
  assert.doesNotMatch(js, /observer\.observe/);
  assert.match(js, /luanshi:rendered/);
  assert.match(js, /luanshi:statechange/);
});

test('V1.10.0 decorates UI only and leaves gameplay engine calls alone', () => {
  const js = read('dist/v200-ui.js');
  assert.doesNotMatch(js, /advanceMonth\s*\(/);
  assert.doesNotMatch(js, /buyBusiness\s*\(/);
  assert.doesNotMatch(js, /buyLand\s*\(/);
  assert.doesNotMatch(js, /localStorage|sessionStorage/);
  assert.match(js, /classList\.add/);
});
