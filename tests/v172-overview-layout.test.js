import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('V1.7.2 keeps V1.7.1 compact density and remains the overview layout base', () => {
  const html = read('dist/index.html');
  assert.match(html, /V1\.7\.2 总览重排/);
  assert.match(html, /body class="compact-ui"/);
  assert.match(html, /v171\.css\?v=1\.7\.1/);
  assert.match(html, /v172\.css\?v=1\.7\.2/);
  assert.match(html, /v172-ui\.js\?v=1\.7\.(?:2|3|4|5)/);
});

test('V1.7.2 separates status, actions, current stage, next goal and detail tabs', () => {
  const html = read('dist/index.html');
  assert.match(html, /id="compact-status"/);
  assert.match(html, /id="primary-workspace"/);
  assert.match(html, /class="side-panel actions-panel"/);
  assert.match(html, /class="main-panel current-stage"/);
  assert.match(html, /id="next-goal-panel"/);
  assert.match(html, /id="detail-tabs-shell"/);
});

test('V1.7.2 layout uses explicit actions-stage-goal areas and responsive fallbacks', () => {
  const css = read('dist/v172.css');
  assert.match(css, /grid-template-areas:\s*['"]actions stage goal['"]/);
  assert.match(css, /\.current-stage/);
  assert.match(css, /\.next-goal-panel/);
  assert.match(css, /\.detail-tabs-shell/);
  assert.match(css, /@media\s*\(max-width:\s*1150px\)/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
});

test('V1.7.2 next-goal helper remains view-only and reads current progression', () => {
  const js = read('dist/v172-ui.js');
  assert.match(js, /getHouseholdUnlockStatus/);
  assert.match(js, /getIndustrySummary/);
  assert.match(js, /getV170MilestoneStatus/);
  assert.match(js, /renderNextGoalPanel/);
  assert.doesNotMatch(js, /buyBusiness\(/);
  assert.doesNotMatch(js, /buyLand\(/);
  assert.doesNotMatch(js, /resources\.money\s*=/);
});
