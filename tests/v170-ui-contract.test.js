import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('V1.7 page routes through engine-v170 and advertises expanded family business progression', () => {
  const index = read('../dist/index.html');
  assert.match(index, /V1\.7/);
  assert.match(index, /engine-v170\.js\?v=1\.7\.0/);
  assert.match(index, /v170\.css\?v=1\.7\.0/);
  assert.match(index, /经营成就|家业发展/);
});

test('business cards expose ids and V1.7 unlock UI handles all new industries', () => {
  const game = read('../dist/game.js');
  const unlockUi = read('../dist/v164-ui.js');
  assert.match(game, /dataset\.businessId/);
  assert.match(unlockUi, /engine-v170\.js\?v=1\.7\.0/);
  for (const label of ['磨坊', '油坊', '酒坊', '客栈', '织坊', '纸坊', '水运船队']) {
    assert.match(unlockUi, new RegExp(label));
  }
  assert.match(unlockUi, /远期产业/);
  assert.match(unlockUi, /家业目标/);
});
