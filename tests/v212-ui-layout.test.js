import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('V1.11.2 puts current task and next-month control in the right rail', () => {
  const js = read('dist/v211-ui.js');
  assert.match(js, /createPaperCard\('v211-task-rail',\s*'当前任务'/);
  assert.match(js, /right\.append\([\s\S]*v211-task-rail[\s\S]*v211-preview[\s\S]*v211-turn-rail/);
  assert.doesNotMatch(js, /createDashboardCard\('v211-turn-card'/);
  assert.doesNotMatch(js, /v211-task-card/);
});

test('V1.11.2 keeps next month visible in the right column and reduces the bottom dashboard to three summaries', () => {
  const css = read('dist/v211.css');
  assert.match(css, /\.v211-right\s*\{[^}]*grid-template-rows:\s*auto\s+minmax\(0,1fr\)\s+auto/s);
  assert.match(css, /#v211-bottom-dashboard\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s);
  assert.match(css, /#v211-turn-rail[^}]*position:\s*sticky/s);
});

test('V1.11.2 gives business industry text an explicit readable parchment palette', () => {
  const css = read('dist/v211.css');
  assert.match(css, /#tab-assets\s+\.business-heading\s*>\s*strong[^}]*color:\s*#f3d89a/s);
  assert.match(css, /#tab-assets\s+\.business-card\s*>\s*strong[^}]*color:\s*#2d2115/s);
  assert.match(css, /#tab-assets\s+\.business-card\s*>\s*small[^}]*color:\s*#665038/s);
  assert.match(css, /#tab-assets\s+\.business-income-summary[^}]*color:\s*#ffe0a0/s);
});

test('V1.11.2 version is exposed by the page and UI controller', () => {
  const html = read('dist/index.html');
  const js = read('dist/v211-ui.js');
  assert.match(html, /V1\.11\.2/);
  assert.match(html, /v211\.css\?v=1\.11\.2/);
  assert.match(html, /v211-ui\.js\?v=1\.11\.2/);
  assert.match(js, /VERSION = '1\.11\.2'/);
});
