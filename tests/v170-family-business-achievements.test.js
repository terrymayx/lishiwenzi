import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v170.js', import.meta.url);

async function E() {
  assert.ok(fs.existsSync(enginePath), 'V1.7 engine-v170.js must exist');
  return import('../dist/engine-v170.js?v=1.7.0');
}

function setAssetValue(engine, state, target) {
  const current = engine.getHouseholdAssetValue(state);
  const propertyOnly = current - Number(state.resources.money || 0);
  state.resources.money = Math.max(0, target - propertyOnly);
  state.household.money = state.resources.money;
}

function game(engine, seed = 1700) {
  const state = engine.createGame({ surname: '沈', origin: 'peasant', seed });
  engine.selectActivity(state, 'rest');
  state.running = false;
  state.pendingEvent = null;
  return state;
}

test('V1.7 exposes ten simple auto-income industries', async () => {
  const engine = await E();
  assert.equal(Object.keys(engine.V170_BUSINESSES).length, 10);
  assert.deepEqual(engine.V170_BUSINESSES.mill, { id: 'mill', label: '磨坊', price: 120, dailyIncome: 0.4 });
  assert.deepEqual(engine.V170_BUSINESSES.oilMill, { id: 'oilMill', label: '油坊', price: 450, dailyIncome: 1.8 });
  assert.deepEqual(engine.V170_BUSINESSES.brewery, { id: 'brewery', label: '酒坊', price: 800, dailyIncome: 3.4 });
  assert.deepEqual(engine.V170_BUSINESSES.inn, { id: 'inn', label: '客栈', price: 1200, dailyIncome: 5.2 });
  assert.deepEqual(engine.V170_BUSINESSES.weavingWorkshop, { id: 'weavingWorkshop', label: '织坊', price: 1800, dailyIncome: 8 });
  assert.deepEqual(engine.V170_BUSINESSES.paperWorkshop, { id: 'paperWorkshop', label: '纸坊', price: 2400, dailyIncome: 11 });
  assert.deepEqual(engine.V170_BUSINESSES.shippingFleet, { id: 'shippingFleet', label: '水运船队', price: 5000, dailyIncome: 23 });
});

test('V1.7 defines fifteen one-time household achievements', async () => {
  const engine = await E();
  assert.equal(Object.keys(engine.V170_MILESTONES).length, 15);
  assert.equal(engine.V170_MILESTONES.firstHarvest.reward, 15);
  assert.equal(engine.V170_MILESTONES.land10.reward, 40);
  assert.equal(engine.V170_MILESTONES.income30.reward, 300);
  assert.equal(engine.V170_MILESTONES.asset20000.reward, 500);
  assert.equal(engine.V170_MILESTONES.knowledge40.reward, 80);
  assert.equal(engine.V170_MILESTONES.reputation30.reward, 100);
});

test('mill unlocks at 3 mu and 180 asset, grants 20 once, then can be bought', async () => {
  const engine = await E();
  const state = game(engine, 1701);
  state.householdProgression.unlocked.landPurchase = true;
  state.householdMilestoneRewards.claimed.landPurchase = true;
  state.household.land = 3; state.resources.land = 3;
  setAssetValue(engine, state, 180);
  const before = state.resources.money;
  let status = engine.getHouseholdUnlockStatus(state);
  assert.equal(status.mill.unlocked, true);
  assert.equal(status.mill.rewardMoney, 20);
  assert.equal(Number((state.resources.money - before).toFixed(2)), 20);
  const after = state.resources.money;
  status = engine.getHouseholdUnlockStatus(state);
  assert.equal(state.resources.money, after, 'unlock reward must not repeat');
  state.resources.money = 500; state.household.money = 500;
  const result = engine.buyBusiness(state, 'mill');
  assert.equal(result.ok, true);
  assert.equal(engine.getIndustrySummary(state).businesses.mill.count, 1);
});

test('caravan can unlock from any two owned commercial business types', async () => {
  const engine = await E();
  const state = game(engine, 1702);
  state.industry.businesses.mill = 1;
  state.industry.businesses.grainShop = 1;
  setAssetValue(engine, state, 1500);
  const status = engine.getHouseholdUnlockStatus(state);
  assert.equal(status.caravan.unlocked, true);
  assert.equal(status.caravan.conditions.find(item => item.label === '商业产业种类').current >= 2, true);
});

test('new industry passive income is added without double-paying legacy income', async () => {
  const engine = await E();
  const state = game(engine, 1703);
  state.industry.businesses.mill = 1;
  state.industry.businesses.grainShop = 1;
  const summary = engine.getIndustrySummary(state);
  assert.equal(summary.dailyIncome, 1.1);
  assert.equal(summary.businesses.mill.totalDailyIncome, 0.4);
});

test('achievement money is paid once and saved as claimed', async () => {
  const engine = await E();
  const state = game(engine, 1704);
  state.household.land = 10; state.resources.land = 10;
  const before = state.resources.money;
  let status = engine.getHouseholdUnlockStatus(state);
  assert.equal(status.milestones.find(item => item.id === 'land10').claimed, true);
  assert.equal(Number((state.resources.money - before).toFixed(2)) >= 40, true);
  const after = state.resources.money;
  status = engine.getHouseholdUnlockStatus(state);
  assert.equal(state.resources.money, after);
});

test('old save harvest is migration baseline instead of retroactive first-harvest reward', async () => {
  const engine = await E();
  const old = await import('../dist/engine-v169.js?v=1.6.9');
  const state = old.createGame({ surname: '沈', origin: 'peasant', seed: 1705 });
  state.agriculture ??= {};
  state.agriculture.harvestedGrain = 500;
  const money = state.resources.money;
  const loaded = engine.deserializeState(old.serializeState(state));
  const firstHarvest = engine.getHouseholdUnlockStatus(loaded).milestones.find(item => item.id === 'firstHarvest');
  assert.equal(firstHarvest.current, 0);
  assert.equal(firstHarvest.claimed, false);
  assert.equal(loaded.resources.money >= money, true);
});
