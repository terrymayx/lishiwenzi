import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const E = await import('../dist/engine-v151.js?v=1.5.3');

function game(seed = 1530) {
  const s = E.createGame({ surname: '沈', origin: 'peasant', seed });
  E.selectActivity(s, 'rest');
  return s;
}

test('donating money converts exactly 1000 money into 1 reputation', () => {
  const s = game();
  s.resources.money = 6000;
  s.resources.reputation = 14;

  const result = E.donateForReputation(s, 5000);

  assert.equal(result.ok, true);
  assert.equal(result.spent, 5000);
  assert.equal(result.reputationGained, 5);
  assert.equal(s.resources.money, 1000);
  assert.equal(s.resources.reputation, 19);
});

test('reputation donation rejects invalid amounts, insufficient money, and running time without mutation', () => {
  const s = game(1531);
  s.resources.money = 1500;
  s.resources.reputation = 10;

  const invalid = E.donateForReputation(s, 1500);
  assert.equal(invalid.ok, false);
  assert.equal(s.resources.money, 1500);
  assert.equal(s.resources.reputation, 10);

  const poor = E.donateForReputation(s, 5000);
  assert.equal(poor.ok, false);
  assert.equal(s.resources.money, 1500);
  assert.equal(s.resources.reputation, 10);

  s.running = true;
  const running = E.donateForReputation(s, 1000);
  assert.equal(running.ok, false);
  assert.equal(s.resources.money, 1500);
  assert.equal(s.resources.reputation, 10);
});

test('current page keeps the V1.5.3 donation control as a folded reputation shortcut and farm management inside assets', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const ui = fs.readFileSync(new URL('../dist/v15-ui.js', import.meta.url), 'utf8');
  const farmUi = fs.readFileSync(new URL('../dist/v13-ui.js', import.meta.url), 'utf8');

  assert.match(index, /V1\.6\.6/);
  assert.match(index, /engine-v166\.js\?v=1\.6\.6/);
  assert.match(index, /<details[^>]+id="reputation-donation"/);
  assert.match(index, /data-resource-shortcut="reputation"/);
  assert.match(index, /1000钱\s*=\s*\+1声望/);
  assert.match(index, /data-donate="1000"/);
  assert.match(index, /data-donate="5000"/);
  assert.match(index, /data-donate="10000"/);
  assert.match(ui, /donateForReputation/);
  assert.match(farmUi, /const assets = \$\('#assets'\)/);
  assert.match(farmUi, /雇工/);
  assert.match(farmUi, /land-purchase/);
});
