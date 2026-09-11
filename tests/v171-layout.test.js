import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('V1.7.1 loads the compact overview layout layer', () => {
  const html = read('dist/index.html');
  assert.match(html, /V1\.7\.1 紧凑总览界面/);
  assert.match(html, /v171\.css\?v=1\.7\.1/);
  assert.match(html, /v171-ui\.js\?v=1\.7\.1/);
});

test('V1.7.1 exposes clear top status, primary workspace and next-goal regions', () => {
  const html = read('dist/index.html');
  assert.match(html, /id="compact-status"/);
  assert.match(html, /id="primary-workspace"/);
  assert.match(html, /id="next-goal-panel"/);
  assert.match(html, /id="detail-tabs-shell"/);
});

test('V1.7.1 compact css defines the three-part information hierarchy', () => {
  const css = read('dist/v171.css');
  assert.match(css, /\.compact-status/);
  assert.match(css, /\.primary-workspace/);
  assert.match(css, /\.next-goal-panel/);
  assert.match(css, /\.detail-tabs-shell/);
  assert.match(css, /grid-template-areas/);
});

test('V1.7.1 overview ui renders the nearest goal without changing game state', () => {
  const js = read('dist/v171-ui.js');
  assert.match(js, /getHouseholdUnlockStatus/);
  assert.match(js, /getIndustrySummary/);
  assert.match(js, /getV170MilestoneStatus/);
  assert.match(js, /renderNextGoalPanel/);
  assert.doesNotMatch(js, /buyBusiness\(/);
  assert.doesNotMatch(js, /buyLand\(/);
});
