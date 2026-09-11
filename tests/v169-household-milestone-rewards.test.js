import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v169.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'V1.6.9 milestone reward engine must exist');
  return import('../dist/engine-v169.js?v=1.6.9');
}

function setAssetValue(E, state, target) {
  const current = E.getHouseholdAssetValue(state);
  const propertyOnly = current - Number(state.resources.money || 0);
  state.resources.money = Math.max(0, target - propertyOnly);
  state.household.money = state.resources.money;
  return E.getHouseholdAssetValue(state);
}

function game(E, seed = 1690) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  E.selectActivity(state, 'rest');
  state.running = false;
  state.pendingEvent = null;
  return state;
}

test('V1.6.9 defines one-time money rewards for each household milestone', async () => {
  const E = await currentEngine();
  assert.deepEqual(E.V169_UNLOCK_REWARDS, {
    landPurchase: 20,
    grainShop: 50,
    clothShop: 100,
    caravan: 200
  });
});

test('unlocking land purchase grants 20 money exactly once', async () => {
  const E = await currentEngine();
  const state = game(E, 1691);
  state.householdProgression = {
    version: 164,
    unlocked: { landPurchase: false, grainShop: false, clothShop: false, caravan: false },
    unlockHistory: [],
    lastUnlock: null
  };
  delete state.householdMilestoneRewards;
  setAssetValue(E, state, 80);
  const before = state.resources.money;

  let status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.landPurchase.unlocked, true);
  assert.equal(status.landPurchase.rewardMoney, 20);
  assert.equal(status.landPurchase.rewardClaimed, true);
  assert.equal(Number((state.resources.money - before).toFixed(2)), 20);
  assert.equal(state.householdMilestoneRewards.claimed.landPurchase, true);
  assert.equal(state.householdMilestoneRewards.totalGranted, 20);

  const afterFirst = state.resources.money;
  status = E.getHouseholdUnlockStatus(state);
  assert.equal(state.resources.money, afterFirst, 'querying status again must not duplicate the reward');
  assert.equal(status.newRewardMoney, 0);
});

test('later stages grant the approved 50, 100 and 200 money rewards', async () => {
  const E = await currentEngine();
  const state = game(E, 1692);
  state.householdProgression = {
    version: 164,
    unlocked: { landPurchase: true, grainShop: false, clothShop: false, caravan: false },
    unlockHistory: [{ id: 'landPurchase' }],
    lastUnlock: null
  };
  state.householdMilestoneRewards = {
    version: 169,
    claimed: { landPurchase: true, grainShop: false, clothShop: false, caravan: false },
    history: [],
    totalGranted: 20
  };

  state.household.land = 6;
  state.resources.land = 6;
  setAssetValue(E, state, 350);
  let before = state.resources.money;
  let status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.grainShop.unlocked, true);
  assert.equal(Number((state.resources.money - before).toFixed(2)), 50);

  state.industry.businesses.grainShop = 1;
  state.household.land = 12;
  state.resources.land = 12;
  setAssetValue(E, state, 700);
  before = state.resources.money;
  status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.clothShop.unlocked, true);
  assert.equal(Number((state.resources.money - before).toFixed(2)), 100);

  state.industry.businesses.clothShop = 1;
  setAssetValue(E, state, 1500);
  before = state.resources.money;
  status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.caravan.unlocked, true);
  assert.equal(Number((state.resources.money - before).toFixed(2)), 200);
  assert.equal(state.householdMilestoneRewards.totalGranted, 370);
});

test('loading an old V1.6.8 save does not back-pay milestones that were already unlocked', async () => {
  const E = await currentEngine();
  const Old = await import('../dist/engine-v168.js?v=1.6.8');
  const old = Old.createGame({ surname: '沈', origin: 'peasant', seed: 1693 });
  old.householdProgression = {
    version: 164,
    unlocked: { landPurchase: true, grainShop: true, clothShop: false, caravan: false },
    unlockHistory: [{ id: 'landPurchase' }, { id: 'grainShop' }],
    lastUnlock: { id: 'grainShop' }
  };
  old.resources.money = 123;
  old.household.money = 123;
  delete old.householdMilestoneRewards;

  const loaded = E.deserializeState(Old.serializeState(old));
  assert.equal(loaded.resources.money, 123);
  assert.equal(loaded.householdMilestoneRewards.claimed.landPurchase, true);
  assert.equal(loaded.householdMilestoneRewards.claimed.grainShop, true);
  assert.equal(loaded.householdMilestoneRewards.totalGranted, 0);
});

test('reward state survives save and load without paying twice', async () => {
  const E = await currentEngine();
  const state = game(E, 1694);
  state.householdProgression = {
    version: 164,
    unlocked: { landPurchase: false, grainShop: false, clothShop: false, caravan: false },
    unlockHistory: [],
    lastUnlock: null
  };
  delete state.householdMilestoneRewards;
  setAssetValue(E, state, 80);
  E.getHouseholdUnlockStatus(state);
  const moneyAfterReward = state.resources.money;

  const loaded = E.deserializeState(E.serializeState(state));
  E.getHouseholdUnlockStatus(loaded);
  assert.equal(loaded.resources.money, moneyAfterReward);
  assert.equal(loaded.householdMilestoneRewards.totalGranted, 20);
});

test('current page preserves V1.6.9 unlock money rewards under V1.7', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const unlockUi = fs.readFileSync(new URL('../dist/v164-ui.js', import.meta.url), 'utf8');
  assert.match(index, /V1\.7/);
  assert.match(index, /engine-v170\.js\?v=1\.7\.0/);
  assert.match(index, /解锁.*奖励|经营成就/);
  assert.match(unlockUi, /engine-v169\.js\?v=1\.6\.9/);
  assert.match(unlockUi, /rewardMoney|解锁奖励/);
});
