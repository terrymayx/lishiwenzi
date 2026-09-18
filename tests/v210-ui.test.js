import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('V1.11.0 target-layout files are retained only as historical assets after V1.11.1', () => {
  const html = read('dist/index.html');
  assert.ok(fs.existsSync(new URL('../dist/v210.css', import.meta.url)));
  assert.ok(fs.existsSync(new URL('../dist/v210-ui.js', import.meta.url)));
  assert.doesNotMatch(html, /v210\.css\?v=|v210-ui\.js\?v=/);
});

test('V1.11.0 rebuilds the page into target top-main-bottom dashboard', () => {
  const js = read('dist/v210-ui.js');
  for (const token of [
    'v210-layout',
    'v210-left-column',
    'v210-middle-column',
    'v210-right-column',
    'v210-bottom-dashboard',
    'v210-help-card',
    'v210-preview-card',
    'v210-family-summary',
    'v210-relations-summary',
    'v210-assets-summary'
  ]) assert.match(js, new RegExp(token));
});

test('V1.11.0 keeps the no-observer stability rule', () => {
  const js = read('dist/v210-ui.js');
  assert.doesNotMatch(js, /MutationObserver/);
  assert.doesNotMatch(js, /observer\.observe/);
  assert.match(js, /requestAnimationFrame/);
  assert.match(js, /luanshi:rendered/);
  assert.match(js, /luanshi:statechange/);
});

test('V1.11.0 target CSS includes wood, paper, right preview, bottom summaries and ornate month button', () => {
  const css = read('dist/v210.css');
  for (const token of [
    '--v210-paper',
    '#v210-layout',
    '.v210-side-nav',
    '.v210-stage-banner',
    '.v210-paper-card',
    '#v210-bottom-dashboard',
    '.v210-family-summary',
    '.v210-relations-summary',
    '.v210-assets-summary',
    '.v210-next-month'
  ]) assert.ok(css.includes(token), token);
});

test('V1.11.0 only restructures and decorates UI, not gameplay engine methods', () => {
  const js = read('dist/v210-ui.js');
  assert.doesNotMatch(js, /advanceMonth\s*\(/);
  assert.doesNotMatch(js, /buyBusiness\s*\(/);
  assert.doesNotMatch(js, /buyLand\s*\(/);
  assert.doesNotMatch(js, /localStorage|sessionStorage/);
});
