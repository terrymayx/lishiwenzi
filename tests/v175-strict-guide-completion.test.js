import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v175.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'V1.7.5 strict guide-completion engine must exist');
  return import('../dist/engine-v175.js?v=1.7.5');
}

function setAssetValue(E, state, target) {
  const current = E.getHouseholdAssetValue(state);
  const propertyOnly = current - Number(state.resources.money || 0);
  state.resources.money = Math.max(0, target - propertyOnly);
  state.household.money = state.resources.money;
}

function game(E, seed = 1750) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  state.chapterSeen[1] = true;
  state.running = false;
  state.pendingEvent = null;
  return state;
}

test('threshold readiness never completes the reward or unlocks the next guide task', async () => {
  const E = await currentEngine();
  const state = game(E, 1751);
  setAssetValue(E, state, 200);
  const before = state.resources.money;

  const status = E.getHouseholdUnlockStatus(state);
  const guide = E.getV174GuideStatus(state);

  assert.equal(status.landPurchase.unlocked, true, 'threshold may make the current action available');
  assert.equal(status.landPurchase.rewardClaimed, false, 'reward must remain incomplete before purchase');
  assert.equal(guide.current.id, 'landPurchase');
  assert.equal(guide.byId.landPurchase.completed, false);
  assert.equal(guide.byId.mill.chainLocked, true, 'next task must stay locked');
  assert.equal(state.resources.money, before, 'threshold check must not pay money');
});

test('actual land purchase completes the reward and only then unlocks mill', async () => {
  const E = await currentEngine();
  const state = game(E, 1752);
  setAssetValue(E, state, 200);
  E.getHouseholdUnlockStatus(state);
  const before = state.resources.money;

  const result = E.buyLand(state, 1);
  assert.equal(result.ok, true);
  assert.equal(result.guideCompleted?.id, 'landPurchase');
  assert.equal(result.guideRewardMoney, 20);
  assert.equal(state.resources.money, before - Number(result.cost || 0) + 20);

  const guide = E.getV174GuideStatus(state);
  assert.equal(guide.byId.landPurchase.completed, true);
  assert.equal(guide.current.id, 'mill');
  assert.equal(guide.byId.mill.chainLocked, false);
  assert.equal(guide.byId.grainShop.chainLocked, true);
});

test('V1.7.5 repairs a V1.7.4 save that falsely treated land threshold unlock as task completion', async () => {
  const E = await currentEngine();
  const Old = await import('../dist/engine-v174.js?v=1.7.4');
  const old = Old.createGame({ surname: '沈', origin: 'peasant', seed: 1753 });
  old.running = false;
  old.pendingEvent = null;
  old.household.land = Math.max(1, Number(old.household.land || 0));
  old.resources.land = old.household.land;
  old.householdProgression.unlocked.landPurchase = true;
  old.householdMilestoneRewards.claimed.landPurchase = true;
  old.householdMilestoneRewards.history = [];
  delete old.v174Guide;

  const buggy = Old.deserializeState(Old.serializeState(old));
  assert.equal(buggy.v174Guide.completed.landPurchase, true, 'documents the V1.7.4 migration bug');
  assert.equal(buggy.householdMilestoneRewards.claimed.landPurchase, true);

  const loaded = E.deserializeState(Old.serializeState(buggy));
  const repaired = E.getV174GuideStatus(loaded);
  assert.equal(repaired.current.id, 'landPurchase');
  assert.equal(repaired.byId.landPurchase.completed, false);
  assert.equal(repaired.byId.mill.chainLocked, true);
  assert.equal(loaded.householdMilestoneRewards.claimed.landPurchase, false, 'false migration settlement must be cleared when no reward was actually paid');

  setAssetValue(E, loaded, 250);
  const before = loaded.resources.money;
  const purchase = E.buyLand(loaded, 1);
  assert.equal(purchase.ok, true);
  assert.equal(purchase.guideRewardMoney, 20);
  assert.equal(loaded.resources.money, before - Number(purchase.cost || 0) + 20);
  assert.equal(E.getV174GuideStatus(loaded).current.id, 'mill');
});

test('future industries cannot be inferred complete merely because an old save already owns a later industry', async () => {
  const E = await currentEngine();
  const Old = await import('../dist/engine-v174.js?v=1.7.4');
  const old = Old.createGame({ surname: '沈', origin: 'peasant', seed: 1754 });
  old.running = false;
  old.pendingEvent = null;
  old.assets ??= [];
  old.assets.push({ id: 'legacy-land-buy', type: '田产', name: '新购田地（1亩）', area: 1, value: 25, location: old.region, ownerId: old.playerId });
  old.household.land = Math.max(3, Number(old.household.land || 0));
  old.resources.land = old.household.land;
  old.industry.businesses.grainShop = 1;
  old.householdProgression.unlocked.landPurchase = true;
  old.householdMilestoneRewards.claimed.landPurchase = true;
  old.householdProgression.unlocked.grainShop = true;
  old.householdMilestoneRewards.claimed.grainShop = true;
  old.householdMilestoneRewards.history = [];
  delete old.v174Guide;

  const buggy = Old.deserializeState(Old.serializeState(old));
  assert.equal(buggy.v174Guide.completed.mill, true, 'documents V1.7.4 predecessor inference');

  const loaded = E.deserializeState(Old.serializeState(buggy));
  setAssetValue(E, loaded, 300);
  const before = loaded.resources.money;
  const status = E.getHouseholdUnlockStatus(loaded);
  const guide = E.getV174GuideStatus(loaded);

  assert.equal(guide.byId.landPurchase.completed, true, 'real prior land purchase still counts');
  assert.equal(guide.current.id, 'mill', 'missing mill must become the current task');
  assert.equal(guide.byId.mill.completed, false);
  assert.equal(status.mill.rewardClaimed, false);
  assert.equal(guide.byId.grainShop.chainLocked, true, 'owning a later industry cannot bypass the missing current task');
  assert.equal(stateMoney(loaded), before, 'checking thresholds must not pay the mill reward');
});

function stateMoney(state) {
  return Number(state.resources.money || 0);
}

test('current page routes gameplay through V1.7.5 strict completion policy', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(index, /V1\.7\.5/);
  assert.match(index, /engine-v175\.js\?v=1\.7\.5/);
  assert.match(index, /达到条件不算完成|真正购买或建成后才发奖励|完成后才解锁下一项/);
});
