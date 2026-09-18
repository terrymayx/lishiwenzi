import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('V1.11.4 compacts current-task typography', () => {
  const css = read('dist/v211.css');
  assert.match(css, /#v211-task-rail\s+#next-goal-panel\s+h3,[\s\S]*#v211-task-rail\s+#next-goal-panel\s+strong\s*\{[^}]*font-size:\s*16px\s*!important[^}]*line-height:\s*1\.35\s*!important/s);
  assert.match(css, /#v211-task-rail\s+#next-goal-panel\s+p,[\s\S]*#v211-task-rail\s+#next-goal-panel\s+span\s*\{[^}]*font-size:\s*13px\s*!important[^}]*line-height:\s*1\.5\s*!important/s);
  assert.match(css, /#v211-task-rail\s+#next-goal-panel\s+small\s*\{[^}]*font-size:\s*11px\s*!important/s);
});

test('V1.11.4 colors achieved conditions green and unmet conditions red', () => {
  const css = read('dist/v211.css');
  assert.match(css, /#v211-task-rail\s+\.v174-condition\.met[\s\S]*color:\s*#3f7a44\s*!important/s);
  assert.match(css, /#v211-task-rail\s+\.v174-condition\.missing[\s\S]*color:\s*#a43f32\s*!important/s);
  assert.match(css, /#v211-task-rail\s+\.v174-condition\.met\s+b[\s\S]*color:\s*#3f7a44\s*!important/s);
  assert.match(css, /#v211-task-rail\s+\.v174-condition\.missing\s+b[\s\S]*color:\s*#a43f32\s*!important/s);
});

test('V1.11.4 uses restrained progress-chip colors', () => {
  const css = read('dist/v211.css');
  assert.match(css, /#v211-task-rail\s+\.v174-chain-progress\s+\.done[^}]*color:\s*#3f7a44\s*!important/s);
  assert.match(css, /#v211-task-rail\s+\.v174-chain-progress\s+\.current[^}]*color:\s*#8a5a18\s*!important/s);
  assert.match(css, /#v211-task-rail\s+\.v174-chain-progress\s+\.locked[^}]*color:\s*#746554\s*!important/s);
});

test('V1.11.4 is exposed by page and controller', () => {
  const html = read('dist/index.html');
  const js = read('dist/v211-ui.js');
  assert.match(html, /V1\.11\.4/);
  assert.match(html, /v211\.css\?v=1\.11\.4/);
  assert.match(html, /v211-ui\.js\?v=1\.11\.4/);
  assert.match(js, /VERSION = '1\.11\.4'/);
});
