import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');

test('V1.4 page routes through family economy engine and retains compact-tree UI', () => {
  assert.match(index, /V1\.4/);
  assert.match(index, /engine-v14\.js\?v=1\.4\.0/);
  assert.match(index, /v14-ui\.js\?v=1\.4\.0/);
  assert.match(index, /v132-ui\.js\?v=1\.3\.2/);
  assert.match(index, /v132\.css\?v=1\.3\.2/);
  assert.doesNotMatch(index, /v12-ui\.js/);
});

test('V1.3.2 farm UI keeps live grain market and adds automatic hired-worker feedback', () => {
  const ui = fs.readFileSync(new URL('../dist/v13-ui.js', import.meta.url), 'utf8');
  const autoUi = fs.readFileSync(new URL('../dist/v132-ui.js', import.meta.url), 'utf8');
  assert.match(ui, /家庭劳力/);
  assert.match(ui, /雇工/);
  assert.match(ui, /购买粮食/);
  assert.match(ui, /出售余粮/);
  assert.match(ui, /\[10, 50, 100\]/);
  assert.match(ui, /买\$\{amount\}粮/);
  assert.match(ui, /卖\$\{amount\}粮/);
  assert.match(ui, /getBuyQuote/);
  assert.match(ui, /refreshResourceStrip/);
  assert.match(autoUi, /雇工自动耕作/);
  assert.match(autoUi, /主角选择行商、读书、从军/);
});

test('V1.3 styles include farm management and compact family tree layers', () => {
  const style = fs.readFileSync(new URL('../dist/v13.css', import.meta.url), 'utf8');
  const compact = fs.readFileSync(new URL('../dist/v132.css', import.meta.url), 'utf8');
  assert.match(style, /\.farm-dashboard/);
  assert.match(style, /\.farm-actions/);
  assert.match(style, /\.farm-progress/);
  assert.match(compact, /\.family-tree/);
  assert.match(compact, /min-width:360px/);
});
