import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('V1.7.6 direct-build guide remains loaded under V1.8.x monthly turns', () => {
  const html = read('dist/index.html');
  assert.match(html, /V1\.7\.6/);
  assert.match(html, /v172-ui\.js\?v=(?:1\.7\.6|1\.8\.(?:0|1))/);
  assert.match(html, /v176-ui\.js\?v=(?:1\.7\.6(?:\.1)?|1\.8\.(?:0|1))/);
  assert.match(html, /game\.js\?v=(?:1\.7\.6|1\.8\.(?:0|1))/);
});

test('guide action only appears after threshold readiness and reuses real purchase APIs', () => {
  const ui = read('dist/v176-ui.js');
  execFileSync(process.execPath, ['--check', new URL('../dist/v176-ui.js', import.meta.url).pathname]);
  assert.match(ui, /getV174GuideStatus/);
  assert.match(ui, /getLandPrice/);
  assert.match(ui, /if \(!current \|\| !current\.thresholdReady\)/);
  assert.match(ui, /buyLand\(state, 1\)/);
  assert.match(ui, /buyBusiness\(state, model\.businessId\)/);
  assert.match(ui, /serializeState/);
  assert.match(ui, /luanshi:statechange/);
});

test('guide action presents land, build and caravan verbs plus cash-shortage feedback', () => {
  const ui = read('dist/v176-ui.js');
  assert.match(ui, /置办1亩/);
  assert.match(ui, /建造/);
  assert.match(ui, /开设/);
  assert.match(ui, /组建/);
  assert.match(ui, /现钱不足/);
  assert.match(ui, /暂停时间后/);
  assert.match(ui, /data-guide-action/);
});

test('direct-build button renders after legacy overview timers so it cannot be overwritten', () => {
  const ui = read('dist/v176-ui.js');
  assert.match(ui, /window\.setTimeout\(\(\) => \{\s*window\.setTimeout\(\(\) => \{[\s\S]*?renderGuideAction\(window\.__luanshiState\)/);
});
