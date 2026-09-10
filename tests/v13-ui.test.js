import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');

test('V1.3 page routes the game engine through engine-v13 and loads farm UI', () => {
  assert.match(index, /V1\.3/);
  assert.match(index, /engine-v13\.js\?v=1\.3\.0/);
  assert.match(index, /v13-ui\.js\?v=1\.3\.0/);
  assert.match(index, /v13\.css\?v=1\.3\.0/);
  assert.doesNotMatch(index, /v12-ui\.js/);
});

test('V1.3 farm UI exposes labor, hired workers, grain sales and seasonal progress', () => {
  const ui = fs.readFileSync(new URL('../dist/v13-ui.js', import.meta.url), 'utf8');
  assert.match(ui, /家庭劳力/);
  assert.match(ui, /雇工/);
  assert.match(ui, /卖10粮/);
  assert.match(ui, /春耕/);
  assert.match(ui, /夏管/);
  assert.match(ui, /秋收/);
});

test('V1.3 stylesheet has a dedicated farm management panel', () => {
  const style = fs.readFileSync(new URL('../dist/v13.css', import.meta.url), 'utf8');
  assert.match(style, /\.farm-dashboard/);
  assert.match(style, /\.farm-actions/);
  assert.match(style, /\.farm-progress/);
});
