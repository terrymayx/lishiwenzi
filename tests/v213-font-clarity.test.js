import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('V1.11.4 current-task text uses explicit high-contrast readable styles', () => {
  const css = read('dist/v211.css');
  assert.match(css, /#v211-task-rail\s+#next-goal-panel\s*\{[^}]*opacity:\s*1\s*!important[^}]*filter:\s*none\s*!important/s);
  assert.match(css, /#v211-task-rail\s+#next-goal-panel\s+h3,[\s\S]*#v211-task-rail\s+#next-goal-panel\s+strong\s*\{[^}]*color:\s*#24180f\s*!important[^}]*font-size:\s*18px\s*!important[^}]*font-weight:\s*800\s*!important/s);
  assert.match(css, /#v211-task-rail\s+#next-goal-panel\s+p,[\s\S]*#v211-task-rail\s+#next-goal-panel\s+span\s*\{[^}]*color:\s*#3b2b1d\s*!important[^}]*font-size:\s*15px\s*!important[^}]*font-weight:\s*600\s*!important/s);
  assert.match(css, /#v211-task-rail\s+#next-goal-panel\s+small\s*\{[^}]*color:\s*#5a4330\s*!important[^}]*font-size:\s*13px\s*!important/s);
});

test('V1.11.4 task rail avoids inherited blur-producing transforms and filters', () => {
  const css = read('dist/v211.css');
  assert.match(css, /#v211-right,[\s\S]*#v211-task-rail,[\s\S]*#next-goal-panel\s*\{[^}]*transform:\s*none\s*!important[^}]*filter:\s*none\s*!important[^}]*opacity:\s*1\s*!important/s);
});

test('V1.11.4 is exposed by page and controller', () => {
  const html = read('dist/index.html');
  const js = read('dist/v211-ui.js');
  assert.match(html, /V1\.11\.4/);
  assert.match(html, /v211\.css\?v=1\.11\.4/);
  assert.match(html, /v211-ui\.js\?v=1\.11\.4/);
  assert.match(js, /VERSION = '1\.11\.4'/);
});
