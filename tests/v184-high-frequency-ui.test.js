import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('V1.8.4 high-frequency UI files remain available but the current page no longer loads them', () => {
  const html = read('dist/index.html');
  assert.ok(fs.existsSync(new URL('../dist/v184.css', import.meta.url)));
  assert.ok(fs.existsSync(new URL('../dist/v184-ui.js', import.meta.url)));
  assert.doesNotMatch(html, /v184\.css\?v=|v184-ui\.js\?v=/);
});

test('high-frequency command center reuses the real action, month and current-goal controls', () => {
  const js = read('dist/v184-ui.js');
  execFileSync(process.execPath, ['--check', new URL('../dist/v184-ui.js', import.meta.url).pathname]);

  assert.match(js, /v184-command-center/);
  assert.match(js, /#actions/);
  assert.match(js, /#v180-month-controls/);
  assert.match(js, /#next-goal-panel/);
  assert.match(js, /appendChild|append\(/, 'existing live controls should be moved rather than reimplemented');
  assert.doesNotMatch(js, /advanceMonth\s*\(/, 'V1.8.4 must not duplicate month-settlement logic');
});

test('command center exposes prominent grain and asset shortcuts by delegating to existing controls', () => {
  const js = read('dist/v184-ui.js');
  assert.match(js, /data-resource-shortcut="grain"/);
  assert.match(js, /data-tab="assets"/);
  assert.match(js, /\.click\(\)/, 'quick actions should delegate to existing handlers');
  assert.match(js, /scrollIntoView/);
});

test('low-frequency save and new-game controls are grouped under a more menu', () => {
  const js = read('dist/v184-ui.js');
  assert.match(js, /v184-utility-menu/);
  assert.match(js, /\.top-actions/);
  assert.match(js, /createElement\(['"]details['"]\)/);
  assert.match(js, /更多/);
});

test('low grain coverage, low stamina and low health can raise visual alerts without changing game state', () => {
  const js = read('dist/v184-ui.js');
  assert.match(js, /#food-rate/);
  assert.match(js, /#grain/);
  assert.match(js, /#stamina/);
  assert.match(js, /#health/);
  assert.match(js, /dataset\.v184Alert/);
  assert.match(js, /35/);
  assert.match(js, /50/);
  assert.doesNotMatch(js, /__luanshiState\s*=|resources\.[a-zA-Z]+\s*=/, 'visual alert layer must not mutate gameplay state');
});

test('V1.8.4 visually prioritizes the primary turn button and core survival resources', () => {
  const css = read('dist/v184.css');
  assert.match(css, /\.v184-command-center/);
  assert.match(css, /#advance-month[\s\S]*min-height:\s*(5[0-9]|[6-9][0-9])px/);
  for (const id of ['money', 'grain', 'stamina', 'health']) {
    assert.match(css, new RegExp(`#${id}\\b`), `${id} should receive explicit prominence styling`);
  }
  assert.match(css, /data-v184-alert/);
  assert.match(css, /@media\s*\(max-width:/);
});
