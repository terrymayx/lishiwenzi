import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v174.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'V1.7.4 household guide-chain engine must exist');
  return import('../dist/engine-v174.js?v=1.7.4');
}

function setAssetValue(E, state, target) {
  const current = E.getHouseholdAssetValue(state);
  const propertyOnly = current - Number(state.resources.money || 0);
  state.resources.money = Math.max(0, target - propertyOnly);
  state.household.money = state.resources.money;
}

function game(E, seed = 1740) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  state.chapterSeen[1] = true;
  state.running = false;
  state.pendingEvent = null;
  return state;
}

test('V1.7.4 defines one strict household guide chain from buying land through the water fleet', async () => {
  const E = await currentEngine();
  assert.deepEqual(E.V174_GUIDE_CHAIN.map(item => item.id), [
    'landPurchase', 'mill', 'grainShop', 'clothShop', 'oilPress', 'caravan',
    'winery', 'inn', 'weavingWorkshop', 'paperMill', 'waterFleet'
  ]);
});

test('a new household starts with only the land-purchase goal active', async () => {
  const E = await currentEngine();
  const state = game(E, 1741);
  const guide = E.getV174GuideStatus(state);
  assert.equal(guide.current.id, 'landPurchase');
  assert.equal(guide.byId.landPurchase.completed, false);
  assert.equal(guide.byId.mill.chainLocked, true);
  assert.equal(guide.byId.grainShop.chainLocked, true);
});

test('reaching numeric thresholds alone never completes or rewards the current guide goal', async () => {
  const E = await currentEngine();
  const state = game(E, 1742);
  setAssetValue(E, state, 200);
  const before = state.resources.money;
  const status = E.getHouseholdUnlockStatus(state);
  const guide = E.getV174GuideStatus(state);
  assert.equal(status.landPurchase.unlocked, true);
  assert.equal(guide.current.id, 'landPurchase');
  assert.equal(guide.byId.landPurchase.completed, false);
  assert.equal(state.resources.money, before, 'threshold evaluation must not pay the land task reward');
});

test('actually buying land completes the first task, pays 20 once, and opens mill as the next goal', async () => {
  const E = await currentEngine();
  const state = game(E, 1743);
  setAssetValue(E, state, 200);
  E.getHouseholdUnlockStatus(state);
  const before = state.resources.money;
  const result = E.buyLand(state, 1);
  assert.equal(result.ok, true);
  assert.equal(result.guideCompleted?.id, 'landPurchase');
  assert.equal(result.guideRewardMoney, 20);
  assert.equal(state.resources.money, before - Number(result.cost || 0) + 20);
  let guide = E.getV174GuideStatus(state);
  assert.equal(guide.byId.landPurchase.completed, true);
  assert.equal(guide.current.id, 'mill');

  const secondBefore = state.resources.money;
  const second = E.buyLand(state, 1);
  assert.equal(second.ok, true);
  assert.equal(second.guideRewardMoney || 0, 0);
  assert.ok(state.resources.money < secondBefore);
  guide = E.getV174GuideStatus(state);
  assert.equal(guide.current.id, 'mill');
});

test('later businesses remain chain-locked even when their old numeric requirements are already met', async () => {
  const E = await currentEngine();
  const state = game(E, 1744);
  state.v174Guide.completed.landPurchase = true;
  state.householdProgression.unlocked.landPurchase = true;
  state.householdMilestoneRewards.claimed.landPurchase = true;
  state.household.land = 12;
  state.resources.land = 12;
  setAssetValue(E, state, 1000);
  const status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.mill.chainLocked, false);
  assert.equal(status.grainShop.chainLocked, true);
  assert.equal(status.clothShop.chainLocked, true);

  const blocked = E.buyBusiness(state, 'grainShop');
  assert.equal(blocked.ok, false);
  assert.match(blocked.message, /先完成|当前家业目标|磨坊/);
});

test('building the current industry completes it, pays its first-build reward, and advances the chain', async () => {
  const E = await currentEngine();
  const state = game(E, 1745);
  state.v174Guide.completed.landPurchase = true;
  state.householdProgression.unlocked.landPurchase = true;
  state.householdMilestoneRewards.claimed.landPurchase = true;
  state.household.land = 3;
  state.resources.land = 3;
  setAssetValue(E, state, 300);

  const before = state.resources.money;
  const result = E.buyBusiness(state, 'mill');
  assert.equal(result.ok, true);
  assert.equal(result.guideCompleted?.id, 'mill');
  assert.equal(result.guideRewardMoney, 20);
  assert.equal(state.resources.money, before - E.V170_BUSINESSES.mill.price + 20);
  const guide = E.getV174GuideStatus(state);
  assert.equal(guide.byId.mill.completed, true);
  assert.equal(guide.current.id, 'grainShop');
});

test('legacy V1.7.3 saves infer completed predecessors from already-built industries without paying guide rewards again', async () => {
  const E = await currentEngine();
  const Old = await import('../dist/engine-v173.js?v=1.7.3');
  const old = Old.createGame({ surname: '沈', origin: 'peasant', seed: 1746 });
  old.chapterSeen[1] = true;
  old.running = false;
  old.pendingEvent = null;
  old.industry.businesses.grainShop = 1;
  old.householdProgression.unlocked.grainShop = true;
  old.householdMilestoneRewards.claimed.grainShop = true;
  old.resources.money = 888;
  old.household.money = 888;

  const loaded = E.deserializeState(Old.serializeState(old));
  const guide = E.getV174GuideStatus(loaded);
  assert.equal(guide.byId.landPurchase.completed, true);
  assert.equal(guide.byId.mill.completed, true);
  assert.equal(guide.byId.grainShop.completed, true);
  assert.equal(guide.current.id, 'clothShop');
  assert.equal(loaded.eventLog.some(item => item.title === '家业引导完成奖励'), false);
});

test('current page routes through V1.7.4 and presents one current household goal instead of parallel unlocks', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(index, /V1\.7\.4/);
  assert.match(index, /engine-v174\.js\?v=1\.7\.4/);
  assert.match(index, /家业引导链/);
  assert.match(index, /当前唯一主目标|完成当前目标|完成后开启下一项/);
});
