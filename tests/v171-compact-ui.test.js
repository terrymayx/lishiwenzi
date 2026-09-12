import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('dist/index.html');

test('compact UI remains the base while the current release stylesheet wins the cascade', () => {
  assert.match(html, /<body class="compact-ui">/);
  const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);
  const compactIndex = sheets.indexOf('./v171.css?v=1.7.1');
  const overviewIndex = sheets.indexOf('./v172.css?v=1.7.2');
  const industryIndex = sheets.indexOf('./v173.css?v=1.7.3');
  const currentIndex = sheets.indexOf('./v174.css?v=1.7.4');
  assert.ok(compactIndex >= 0, 'V1.7.1 compact stylesheet is retained');
  assert.ok(overviewIndex > compactIndex, 'V1.7.2 overview stylesheet layers on top of compact UI');
  assert.ok(industryIndex > overviewIndex, 'V1.7.3 industry state styling remains layered on top of the overview');
  assert.ok(currentIndex > industryIndex, 'V1.7.4 guide styling is the current layer');
  assert.equal(sheets.at(-1), './v174.css?v=1.7.4');
  assert.match(html, /v171-ui\.js\?v=1\.7\.1/);
});

test('current release keeps the compact viewport and routes gameplay through V1.7.4', () => {
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  assert.equal(map.imports['./engine.js?v=1.2.0'], './engine-v174.js?v=1.7.4');
  assert.equal(map.imports['./family-work-ui.js?v=1.4.1'], './family-work-ui.js?v=1.6.4-player-work');
  assert.match(html, /width=device-width, initial-scale=1/);
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1/);
});

test('compact stylesheet covers resources, all panels, tree, market and progression', () => {
  assert.ok(fs.existsSync(new URL('../dist/v171.css', import.meta.url)), 'compact stylesheet exists');
  const css = read('dist/v171.css');
  for (const selector of ['.resource-strip', '.resource-label', '.action-card', '.time-flow', '.economy-panel', '.business-card', '.unlock-condition', '.v170-milestone-row', '.family-tree', '.work-context-menu', '.event-option', '.timeline-row']) assert.ok(css.includes(selector), selector);
  assert.match(css, /pointer:\s*coarse/);
  assert.match(css, /focus-visible/);
  assert.doesNotMatch(css, /\bzoom\s*:|transform:\s*scale\(/, 'shrink layout rather than zooming the whole page');
});

test('only the SVG viewport is compacted, without rewriting relationship paths', () => {
  assert.ok(fs.existsSync(new URL('../dist/v171-ui.js', import.meta.url)));
  const ui = read('dist/v171-ui.js');
  assert.match(ui, /TREE_DISPLAY_SCALE = 0\.8/);
  assert.match(ui, /tree\.getAttribute\('height'\)/);
  assert.match(ui, /tree\.style\.height/);
  assert.match(ui, /compact-family-map/);
  assert.doesNotMatch(ui, /setAttribute\('viewBox'|setAttribute\('d'/);
});

test('compact view helper is valid JavaScript and never imports or writes gameplay state', () => {
  assert.ok(fs.existsSync(new URL('../dist/v171-ui.js', import.meta.url)), 'compact view helper exists');
  const ui = read('dist/v171-ui.js');
  execFileSync(process.execPath, ['--check', new URL('../dist/v171-ui.js', import.meta.url).pathname]);
  assert.doesNotMatch(ui, /\bimport\s|__luanshiState|localStorage|sessionStorage/);
  assert.match(ui, /toggle/);
  assert.match(ui, /compact-fold/);
});
