import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v173.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'V1.7.3 industry build-reward engine must exist');
  return import('../dist/engine-v173.js?v=1.7.3');
}

function setAssetValue(E, state, target) {
  const current = E.getHouseholdAssetValue(state);
  const propertyOnly = current - Number(state.resources.money || 0);
  state.resources.money = Math.max(0, target - propertyOnly);
  state.household.money = state.resources.money;
}

function game(E, seed = 1730) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  state.chapterSeen[1] = true;
  state.running = false;
  state.pendingEvent = null;
  return state;
}

function unlockMill(E, state) {
  state.householdProgression.unlocked.landPurchase = true;
  state.householdMilestoneRewards.claimed.landPurchase = true;
  state.household.land = 3;
  state.resources.land = 3;
  setAssetValue(E, state, 180);
}

function unlockGrainShop(E, state) {
  state.householdProgression.unlocked.landPurchase = true;
  state.householdMilestoneRewards.claimed.landPurchase = true;
  state.household.land = 6;
  state.resources.land = 6;
  setAssetValue(E, state, 350);
}

test('V1.7.3 defines fixed ownership limits for every industry', async () => {
  const E = await currentEngine();
  assert.deepEqual(E.V173_BUSINESS_LIMITS, {
    mill: 1,
    grainShop: 1,
    clothShop: 1,
    oilPress: 1,
    caravan: 2,
    winery: 1,
    inn: 1,
    weavingWorkshop: 1,
    paperMill: 1,
    waterFleet: 1
  });
});

test('meeting an industry threshold unlocks construction but does not pay the industry reward', async () => {
  const E = await currentEngine();
  const state = game(E, 1731);
  unlockMill(E, state);
  const before = state.resources.money;
  const status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.mill.unlocked, true);
  assert.equal(status.mill.rewardMoney, 20);
  assert.equal(status.mill.rewardClaimed, false);
  assert.equal(status.mill.rewardAvailableOnBuild, true);
  assert.equal(state.resources.money, before);
});

test('first construction pays the reward exactly once and a capped industry cannot be bought again', async () => {
  const E = await currentEngine();
  const state = game(E, 1732);
  unlockMill(E, state);
  E.getHouseholdUnlockStatus(state);
  const before = state.resources.money;
  const result = E.buyBusiness(state, 'mill');
  assert.equal(result.ok, true);
  assert.equal(result.buildRewardMoney, 20);
  assert.equal(state.resources.money, before - E.V170_BUSINESSES.mill.price + 20);
  assert.equal(state.v170IndustryProgression.claimedRewards.mill, true);
  assert.equal(E.getIndustrySummary(state).businesses.mill.count, 1);
  assert.equal(E.getIndustrySummary(state).businesses.mill.limit, 1);

  const second = E.buyBusiness(state, 'mill');
  assert.equal(second.ok, false);
  assert.match(second.message, /上限|1\/1/);
});

test('original grain-shop reward also moves from threshold unlock to first construction', async () => {
  const E = await currentEngine();
  const state = game(E, 1733);
  unlockGrainShop(E, state);
  const before = state.resources.money;
  let status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.grainShop.unlocked, true);
  assert.equal(status.grainShop.rewardClaimed, false);
  assert.equal(state.resources.money, before);

  const result = E.buyBusiness(state, 'grainShop');
  assert.equal(result.ok, true);
  assert.equal(result.buildRewardMoney, 50);
  assert.equal(state.householdMilestoneRewards.claimed.grainShop, true);
  assert.equal(state.resources.money, before - E.V170_BUSINESSES.grainShop.price + 50);
  status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.grainShop.rewardClaimed, true);
});

test('caravan keeps a two-unit cap so water-fleet prerequisites remain reachable', async () => {
  const E = await currentEngine();
  const state = game(E, 1734);
  state.householdProgression.unlocked.caravan = true;
  state.householdMilestoneRewards.claimed.caravan = true;
  state.industry.businesses.caravan = 1;
  state.resources.money = 10000;
  state.household.money = 10000;
  const second = E.buyBusiness(state, 'caravan');
  assert.equal(second.ok, true);
  assert.equal(E.getIndustrySummary(state).businesses.caravan.count, 2);
  assert.equal(E.getIndustrySummary(state).businesses.caravan.limit, 2);
  const third = E.buyBusiness(state, 'caravan');
  assert.equal(third.ok, false);
});

test('legacy over-limit holdings stay owned but only the allowed quantity produces income', async () => {
  const E = await currentEngine();
  const state = game(E, 1735);
  state.industry.businesses.paperMill = 5;
  const summary = E.getIndustrySummary(state).businesses.paperMill;
  assert.equal(summary.count, 5);
  assert.equal(summary.limit, 1);
  assert.equal(summary.effectiveCount, 1);
  assert.equal(summary.inactiveCount, 4);
  assert.equal(summary.totalDailyIncome, 11);
});

test('old saves that already received an unlock reward never receive the new build reward again', async () => {
  const E = await currentEngine();
  const Old = await import('../dist/engine-v170.js?v=1.7.0');
  const old = game(Old, 1736);
  old.household.land = 3;
  old.resources.land = 3;
  setAssetValue(Old, old, 180);
  Old.getHouseholdUnlockStatus(old);
  assert.equal(old.v170IndustryProgression.claimedRewards.mill, true);
  old.industry.businesses.mill = 0;
  old.resources.money = 1000;
  old.household.money = 1000;

  const loaded = E.deserializeState(Old.serializeState(old));
  const before = loaded.resources.money;
  const result = E.buyBusiness(loaded, 'mill');
  assert.equal(result.ok, true);
  assert.equal(result.buildRewardMoney || 0, 0);
  assert.equal(loaded.resources.money, before - E.V170_BUSINESSES.mill.price);
});

test('current page retains V1.7.3 industry limits beneath the V1.7.4 guide-chain policy', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(index, /V1\.7\.3/);
  assert.match(index, /engine-v173\.js\?v=1\.7\.3/);
  assert.match(index, /完成奖励/);
  assert.match(index, /产业上限|已达上限/);
  assert.match(index, /V1\.7\.4 家业引导链/);
});
