import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v167.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'V1.6.7 mother-farm engine must exist');
  return import('../dist/engine-v167.js?v=1.6.7');
}

function motherOf(state) {
  return Object.values(state.people).find(person => person.role === 'mother');
}

function setLand(state, land) {
  state.household.land = land;
  state.resources.land = land;
}

test('living initial mother automatically covers the first three mu without hired workers', async () => {
  const E = await currentEngine();
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed: 1670 });
  setLand(state, 3);
  const summary = E.getFarmSummary(state);

  assert.equal(summary.motherAvailable, true);
  assert.equal(summary.motherFarmCapacity, 3);
  assert.equal(summary.motherManagedAcres, 3);
  assert.equal(summary.requiredWorkers, 0);
  assert.equal(summary.requiredMonthlyWage, 0);
  assert.equal(summary.productiveAcres, 3);
});

test('land beyond the mothers three mu automatically requires paid workers', async () => {
  const E = await currentEngine();
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed: 1671 });
  setLand(state, 7);
  const summary = E.getFarmSummary(state);

  assert.equal(summary.motherManagedAcres, 3);
  assert.equal(summary.requiredWorkers, 2);
  assert.equal(summary.requiredMonthlyWage, 12);
  assert.equal(summary.workerAcres, 3);
});

test('when the initial mother dies her free farm capacity disappears', async () => {
  const E = await currentEngine();
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed: 1672 });
  setLand(state, 3);
  const mother = motherOf(state);
  assert.ok(mother);
  mother.alive = false;

  const summary = E.getFarmSummary(state);
  assert.equal(summary.motherAvailable, false);
  assert.equal(summary.motherFarmCapacity, 0);
  assert.equal(summary.requiredWorkers, 1);
  assert.equal(summary.requiredMonthlyWage, 6);
});

test('mother can keep the first three mu working through monthly payroll even with no cash', async () => {
  const E = await currentEngine();
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed: 1673 });
  setLand(state, 3);
  state.resources.money = 0;
  state.household.money = 0;
  state.resources.grain = 1000;
  state.household.grain = 1000;
  state.year = 290;
  state.month = 1;
  state.day = 31;
  E.selectActivity(state, 'rest');

  const wagesBefore = E.ledger(state).wages;
  E.setRunning(state, true);
  const result = E.advanceDay(state);
  const summary = E.getFarmSummary(state);

  assert.equal(result.ok, true);
  assert.equal(state.month, 2);
  assert.equal(state.day, 1);
  assert.equal(state.resources.money, 0);
  assert.equal(Number((E.ledger(state).wages - wagesBefore).toFixed(1)), 0);
  assert.equal(summary.requiredWorkers, 0);
  assert.equal(summary.paidWorkers, 0);
  assert.equal(summary.motherManagedAcres, 3);
  assert.equal(summary.productiveAcres, 3);
});

test('a four-mu farm charges only one hired-worker wage because mother covers the first three mu', async () => {
  const E = await currentEngine();
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed: 1674 });
  setLand(state, 4);
  state.resources.money = 6;
  state.household.money = 6;
  state.resources.grain = 1000;
  state.household.grain = 1000;
  state.year = 290;
  state.month = 1;
  state.day = 31;
  E.selectActivity(state, 'rest');

  const wagesBefore = E.ledger(state).wages;
  E.setRunning(state, true);
  const result = E.advanceDay(state);
  const summary = E.getFarmSummary(state);

  assert.equal(result.ok, true);
  assert.equal(state.resources.money, 0);
  assert.equal(Number((E.ledger(state).wages - wagesBefore).toFixed(1)), 6);
  assert.equal(summary.requiredWorkers, 1);
  assert.equal(summary.paidWorkers, 1);
  assert.equal(summary.motherManagedAcres, 3);
  assert.equal(summary.productiveAcres, 4);
});

test('first land bought by a landless household does not add a worker wage while mother is alive', async () => {
  const E = await currentEngine();
  const state = E.createGame({ surname: '沈', origin: 'merchant', seed: 1675 });
  state.resources.money = 1000;
  state.household.money = 1000;
  state.householdProgression = { version: 164, unlocked: { landPurchase: true, grainShop: false, clothShop: false, caravan: false }, unlockHistory: [] };

  const quote = E.getLandPurchaseQuote(state, 1);
  assert.equal(quote.workerWage, 0);
  assert.equal(quote.newWorkers, 0);
  assert.equal(quote.motherCoversNewLand, true);

  const before = state.resources.money;
  const result = E.buyLand(state, 1);
  assert.equal(result.ok, true);
  assert.equal(Number((before - state.resources.money).toFixed(1)), quote.landCost);
  assert.equal(E.getFarmSummary(state).requiredWorkers, 0);
});

test('current page explains mother farming and routes through V1.6.7', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const uiPath = new URL('../dist/v167-ui.js', import.meta.url);
  assert.match(index, /V1\.6\.7/);
  assert.match(index, /engine-v167\.js\?v=1\.6\.7/);
  assert.match(index, /v167-ui\.js\?v=1\.6\.7/);
  assert.match(index, /母亲.*3亩|3亩.*母亲/);
  assert.ok(fs.existsSync(uiPath));
  const ui = fs.readFileSync(uiPath, 'utf8');
  assert.match(ui, /母亲照看/);
  assert.match(ui, /超过母亲可照看的田地/);
});
