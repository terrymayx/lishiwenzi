import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v164.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'V1.6.4 household-unlock engine must exist');
  return import('../dist/engine-v164.js?v=1.6.4');
}

function setAssetValue(E, state, target) {
  const current = E.getHouseholdAssetValue(state);
  const propertyOnly = current - Number(state.resources.money || 0);
  state.resources.money = Math.max(0, target - propertyOnly);
  state.household.money = state.resources.money;
  return E.getHouseholdAssetValue(state);
}

function game(E, seed = 1640) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  E.selectActivity(state, 'rest');
  state.running = false;
  state.pendingEvent = null;
  return state;
}

test('V1.6.4 defines staged household unlock thresholds', async () => {
  const E = await currentEngine();
  assert.equal(E.V164_UNLOCKS.landPurchase.assetValue, 80);
  assert.deepEqual(E.V164_UNLOCKS.grainShop, { assetValue: 350, land: 6 });
  assert.deepEqual(E.V164_UNLOCKS.clothShop, { assetValue: 700, land: 12, requiresBusiness: 'grainShop' });
  assert.deepEqual(E.V164_UNLOCKS.caravan, { assetValue: 1500, businessTypes: 2 });
});

test('buying more land stays locked below 80 household assets and unlocks permanently at 80', async () => {
  const E = await currentEngine();
  const state = game(E, 1641);
  state.householdProgression = { version: 164, unlocked: { landPurchase: false, grainShop: false, clothShop: false, caravan: false }, unlockHistory: [] };
  setAssetValue(E, state, 79);
  let status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.landPurchase.unlocked, false);
  assert.equal(status.landPurchase.conditions[0].remaining, 1);
  assert.equal(E.buyLand(state, 1).ok, false);
  assert.match(E.buyLand(state, 1).message, /80|家产|未解锁/);

  setAssetValue(E, state, 80);
  status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.landPurchase.unlocked, true);
  assert.ok(state.householdProgression.unlockHistory.some(item => item.id === 'landPurchase'));

  setAssetValue(E, state, 20);
  assert.equal(E.getHouseholdUnlockStatus(state).landPurchase.unlocked, true, 'unlock must stay permanent after assets fall');
});

test('grain shop requires both 6 mu and 350 assets, then stays unlocked', async () => {
  const E = await currentEngine();
  const state = game(E, 1642);
  state.householdProgression = { version: 164, unlocked: { landPurchase: true, grainShop: false, clothShop: false, caravan: false }, unlockHistory: [] };
  state.household.land = 5;
  state.resources.land = 5;
  setAssetValue(E, state, 500);
  let status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.grainShop.unlocked, false);
  assert.equal(E.buyBusiness(state, 'grainShop').ok, false);

  state.household.land = 6;
  state.resources.land = 6;
  setAssetValue(E, state, 349);
  status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.grainShop.unlocked, false);

  setAssetValue(E, state, 350);
  status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.grainShop.unlocked, true);
  setAssetValue(E, state, 100);
  assert.equal(E.getHouseholdUnlockStatus(state).grainShop.unlocked, true);
});

test('cloth shop and caravan expose later-stage unlock goals', async () => {
  const E = await currentEngine();
  const state = game(E, 1643);
  state.householdProgression = { version: 164, unlocked: { landPurchase: true, grainShop: true, clothShop: false, caravan: false }, unlockHistory: [] };
  state.household.land = 12;
  state.resources.land = 12;
  state.industry.businesses.grainShop = 1;
  setAssetValue(E, state, 700);
  let status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.clothShop.unlocked, true);

  state.industry.businesses.clothShop = 1;
  setAssetValue(E, state, 1499);
  status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.caravan.unlocked, false);
  setAssetValue(E, state, 1500);
  status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.caravan.unlocked, true);
});

test('legacy saves preserve access to land and businesses they already own', async () => {
  const E = await currentEngine();
  const state = game(E, 1644);
  delete state.householdProgression;
  state.household.land = 3;
  state.resources.land = 3;
  state.industry.businesses.grainShop = 1;
  state.industry.businesses.clothShop = 1;
  state.industry.businesses.caravan = 1;
  const loaded = E.deserializeState(E.serializeState(state));
  const status = E.getHouseholdUnlockStatus(loaded);
  assert.equal(status.landPurchase.unlocked, true);
  assert.equal(status.grainShop.unlocked, true);
  assert.equal(status.clothShop.unlocked, true);
  assert.equal(status.caravan.unlocked, true);
});

test('V1.6.4 page shows locked projects with red reminders and explicit progress conditions', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const gameUi = fs.readFileSync(new URL('../dist/game.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../dist/v164.css', import.meta.url), 'utf8');

  assert.match(index, /V1\.6\.4/);
  assert.match(index, /engine-v164\.js\?v=1\.6\.4/);
  assert.match(index, /v164\.css\?v=1\.6\.4/);
  assert.match(gameUi, /getHouseholdUnlockStatus/);
  assert.match(gameUi, /未解锁/);
  assert.match(gameUi, /还差/);
  assert.match(gameUi, /unlock-badge/);
  assert.match(gameUi, /unlock-condition/);
  assert.match(css, /\.unlock-badge\.locked/);
  assert.match(css, /#c62828|#b71c1c|crimson|red/i);
});
