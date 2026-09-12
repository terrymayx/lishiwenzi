import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v180.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'current monthly-turn engine must exist');
  return import('../dist/engine-v180.js?v=1.8.1-cash-guide-test');
}

function game(E, seed = 1810) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  state.chapterSeen[1] = true;
  state.pendingEvent = null;
  state.running = false;
  state.phase = 'playing';
  return state;
}

function addPropertyValue(state, value = 1000) {
  const household = state.family.households[0];
  household.assets ??= [];
  state.assets ??= [];
  const id = `asset-cash-threshold-${state.assets.length + 1}`;
  state.assets.push({
    id,
    type: '产业',
    name: '测试家产',
    value,
    location: state.region,
    ownerId: state.playerId
  });
  household.assets.push(id);
}

function setCash(state, amount) {
  state.resources.money = amount;
  state.household.money = amount;
}

test('current guide uses cash rather than total household assets for money thresholds', async () => {
  const E = await currentEngine();
  const state = game(E, 1811);
  // Keep total assets above the early guide thresholds without crossing the separate
  // 500-money asset achievement, which legitimately pays its own reward.
  addPropertyValue(state, 100);
  setCash(state, 79);

  assert.ok(E.getHouseholdAssetValue(state) >= 80, 'total assets should already satisfy the old land threshold');
  let guide = E.getV174GuideStatus(state);
  assert.equal(guide.current.id, 'landPurchase');
  const landCash = guide.current.conditions.find(item => item.label === '现金');
  assert.ok(landCash, 'current guide should display a cash condition');
  assert.equal(landCash.current, 79);
  assert.equal(landCash.required, 80);
  assert.equal(guide.current.thresholdReady, false, 'property value must not satisfy a cash threshold');

  const blockedLand = E.buyLand(state, 1);
  assert.equal(blockedLand.ok, false, 'buying land must remain blocked until cash itself reaches 80');
  assert.match(blockedLand.message, /现金.*80|现金还差1/);
  assert.equal(E.getV174GuideStatus(state).current.id, 'landPurchase');

  setCash(state, 80);
  guide = E.getV174GuideStatus(state);
  assert.equal(guide.current.thresholdReady, true);
  const boughtLand = E.buyLand(state, 1);
  assert.equal(boughtLand.ok, true);
  assert.equal(E.getV174GuideStatus(state).current.id, 'mill');

  state.household.land = 3;
  state.resources.land = 3;
  setCash(state, 179);
  assert.ok(E.getHouseholdAssetValue(state) >= 180, 'total assets should satisfy the old mill threshold');
  guide = E.getV174GuideStatus(state);
  assert.equal(guide.current.id, 'mill');
  const millCash = guide.current.conditions.find(item => item.label === '现金');
  assert.ok(millCash);
  assert.equal(millCash.current, 179);
  assert.equal(millCash.required, 180);
  assert.equal(guide.current.thresholdReady, false);

  const blockedMill = E.buyBusiness(state, 'mill');
  assert.equal(blockedMill.ok, false, 'mill construction must require 180 current cash even if total assets are higher');
  assert.equal(E.getV174GuideStatus(state).current.id, 'mill');

  setCash(state, 180);
  const builtMill = E.buyBusiness(state, 'mill');
  assert.equal(builtMill.ok, true);
  assert.equal(E.getV174GuideStatus(state).current.id, 'grainShop');
});

test('ordinary asset milestones still use total household assets', async () => {
  const E = await currentEngine();
  const state = game(E, 1812);
  addPropertyValue(state, 600);
  setCash(state, 10);

  const milestones = E.getV170MilestoneStatus(state);
  assert.equal(milestones.byId.assets500.completed, true, 'side achievements should remain based on total household assets');
});

test('V1.8.1 page publishes the cash-threshold guide rule and cache-busts the current engine', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(index, /V1\.8\.1/);
  assert.match(index, /当前任务.*现金|现金.*当前任务/);
  assert.match(index, /普通经营成就.*家产|家产.*经营成就/);
  assert.match(index, /engine-v180\.js\?v=1\.8\.1/);
  assert.match(index, /game\.js\?v=1\.8\.1/);
  assert.match(index, /v180-ui\.js\?v=1\.8\.1/);
});
