import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v166.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'V1.6.6 engine wrapper must exist');
  return import('../dist/engine-v166.js?v=1.6.6');
}

function prepareFarm(E, seed = 1660) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  state.resources.grain = 1000;
  state.household.grain = 1000;
  state.resources.money = 1000;
  state.household.money = 1000;
  state.chapterSeen[1] = true;
  state.household.land = 3;
  state.resources.land = 3;
  E.ensureAutoFarmWorkers(state);
  state.autoFarm.requiredWorkers = 1;
  state.autoFarm.paidWorkers = 1;
  state.autoFarm.lastPayrollMonthKey = `${state.year}-${state.month}`;
  state.agriculture.hiredWorkers = 1;
  E.selectActivity(state, 'trade');
  return state;
}

test('V1.6.6 gives every new origin 50 more starting grain', async () => {
  const E = await currentEngine();
  for (const origin of Object.keys(E.ORIGINS)) {
    const state = E.createGame({ surname: '沈', origin, seed: 1661 });
    assert.equal(E.ORIGINS[origin].grain, 170);
    assert.equal(state.resources.grain, 170);
    assert.equal(state.household.grain, 170);
  }
});

test('V1.6.6 splits the old annual 90 grain per mu into summer and autumn harvests', async () => {
  const E = await currentEngine();
  assert.equal(E.V166_HARVEST_RULES.summerYieldPerMu, 45);
  assert.equal(E.V166_HARVEST_RULES.autumnYieldPerMu, 45);
  assert.equal(E.V166_HARVEST_RULES.summerYieldPerMu + E.V166_HARVEST_RULES.autumnYieldPerMu, 90);
});

test('summer farm progress now produces a summer harvest', async () => {
  const E = await currentEngine();
  const state = prepareFarm(E, 1662);
  state.month = 6;
  state.day = 1;
  state.agriculture.work.sown = 3;
  state.agriculture.work.tended = 0;
  state.agriculture.work.harvested = 0;
  state.agriculture.sownAcres = 3;
  state.agriculture.tendedAcres = 0;
  state.agriculture.weather['290-spring'] = { yieldModifier: 1, label: '晴和' };
  state.agriculture.weather['290-summer'] = { yieldModifier: 1, label: '晴和' };
  state.dualHarvest = { version: 166, cropYear: 290, summerHarvestedAcres: 0, summerGrain: 0, autumnGrain: 0 };
  state.autoFarm.lastPayrollMonthKey = '290-6';

  const beforeHarvest = Number(E.ledger(state).harvest || 0);
  E.setRunning(state, true);
  const result = E.advanceDay(state);

  assert.equal(result.ok, true);
  const harvested = Number((E.ledger(state).harvest - beforeHarvest).toFixed(2));
  assert.equal(harvested, 6.75); // 3亩农工每天完成0.15亩夏管，0.15 * 45
  assert.equal(Number(state.dualHarvest.summerGrain.toFixed(2)), 6.75);
});

test('autumn harvest pays the second 45 grain per mu instead of the old full 90', async () => {
  const E = await currentEngine();
  const state = prepareFarm(E, 1663);
  state.month = 9;
  state.day = 1;
  state.agriculture.work.sown = 3;
  state.agriculture.work.tended = 3;
  state.agriculture.work.harvested = 0;
  state.agriculture.sownAcres = 3;
  state.agriculture.tendedAcres = 3;
  state.agriculture.weather['290-spring'] = { yieldModifier: 1, label: '晴和' };
  state.agriculture.weather['290-summer'] = { yieldModifier: 1, label: '晴和' };
  state.agriculture.weather['290-autumn'] = { yieldModifier: 1, label: '晴和' };
  state.dualHarvest = { version: 166, cropYear: 290, summerHarvestedAcres: 3, summerGrain: 135, autumnGrain: 0 };
  state.autoFarm.lastPayrollMonthKey = '290-9';

  const beforeHarvest = Number(E.ledger(state).harvest || 0);
  E.setRunning(state, true);
  const result = E.advanceDay(state);

  assert.equal(result.ok, true);
  const harvested = Number((E.ledger(state).harvest - beforeHarvest).toFixed(2));
  assert.equal(harvested, 27); // 3亩农工每天秋收0.6亩，0.6 * 45
  assert.equal(Number(state.dualHarvest.autumnGrain.toFixed(2)), 27);
});

test('loading an old V1.6.5 save does not grant the new-game 50 grain bonus', async () => {
  const E = await currentEngine();
  const Old = await import('../dist/engine-v165.js?v=1.6.5');
  const old = Old.createGame({ surname: '沈', origin: 'peasant', seed: 1664 });
  const before = old.resources.grain;
  const loaded = E.deserializeState(Old.serializeState(old));
  assert.equal(loaded.resources.grain, before);
  assert.equal(loaded.household.grain, before);
});

test('current page exposes V1.6.6 two-season harvest rules', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(index, /V1\.6\.6/);
  assert.match(index, /engine-v166\.js\?v=1\.6\.6/);
  assert.match(index, /夏收/);
  assert.match(index, /秋收/);
  assert.match(index, /初始粮食.*170|120.*170|\+50/);
});
