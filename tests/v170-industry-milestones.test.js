import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v170.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'V1.7.0 industry/milestone engine must exist');
  return import('../dist/engine-v170.js?v=1.7.0');
}

function setAssetValue(E, state, target) {
  const current = E.getHouseholdAssetValue(state);
  const propertyOnly = current - Number(state.resources.money || 0);
  state.resources.money = Math.max(0, target - propertyOnly);
  state.household.money = state.resources.money;
  return E.getHouseholdAssetValue(state);
}

function game(E, seed = 1700) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  state.chapterSeen[1] = true;
  state.running = false;
  state.pendingEvent = null;
  return state;
}

test('V1.7 defines ten passive businesses including seven new industries', async () => {
  const E = await currentEngine();
  assert.equal(Object.keys(E.V170_BUSINESSES).length, 10);
  assert.deepEqual(E.V170_BUSINESSES.mill, { id: 'mill', label: '磨坊', price: 120, dailyIncome: 0.4 });
  assert.deepEqual(E.V170_BUSINESSES.oilPress, { id: 'oilPress', label: '油坊', price: 450, dailyIncome: 1.8 });
  assert.deepEqual(E.V170_BUSINESSES.winery, { id: 'winery', label: '酒坊', price: 800, dailyIncome: 3.4 });
  assert.deepEqual(E.V170_BUSINESSES.inn, { id: 'inn', label: '客栈', price: 1200, dailyIncome: 5.2 });
  assert.deepEqual(E.V170_BUSINESSES.weavingWorkshop, { id: 'weavingWorkshop', label: '织坊', price: 1800, dailyIncome: 8 });
  assert.deepEqual(E.V170_BUSINESSES.paperMill, { id: 'paperMill', label: '纸坊', price: 2400, dailyIncome: 11 });
  assert.deepEqual(E.V170_BUSINESSES.waterFleet, { id: 'waterFleet', label: '水运船队', price: 5000, dailyIncome: 23 });
});

test('mill unlocks at 3 mu and 180 household assets, grants 20 money once, and can be purchased', async () => {
  const E = await currentEngine();
  const state = game(E, 1701);
  state.household.land = 3;
  state.resources.land = 3;
  setAssetValue(E, state, 180);
  const before = state.resources.money;
  let status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.mill.unlocked, true);
  assert.equal(status.mill.rewardMoney, 20);
  assert.equal(state.resources.money, before + 20);
  assert.equal(state.v170IndustryProgression.claimedRewards.mill, true);

  status = E.getHouseholdUnlockStatus(state);
  assert.equal(state.resources.money, before + 20, 'querying again must not duplicate the unlock reward');

  const result = E.buyBusiness(state, 'mill');
  assert.equal(result.ok, true);
  assert.equal(E.getIndustrySummary(state).businesses.mill.count, 1);
  assert.equal(E.getIndustrySummary(state).businesses.mill.totalDailyIncome, 0.4);
});

test('all purchased business types count toward the caravan two-type requirement', async () => {
  const E = await currentEngine();
  const state = game(E, 1702);
  state.householdProgression.unlocked.caravan = false;
  state.industry.businesses.mill = 1;
  state.industry.businesses.grainShop = 1;
  setAssetValue(E, state, 1500);
  const status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.caravan.unlocked, true);
  assert.ok(status.caravan.conditions.some(item => item.label === '商业产业种类' && item.current >= 2));
});

test('paper mill requires current protagonist knowledge 30 and water fleet requires two caravans plus reputation 20', async () => {
  const E = await currentEngine();
  const state = game(E, 1703);
  const person = state.people[state.playerId];
  person.skills.knowledge = 29;
  setAssetValue(E, state, 20000);
  let status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.paperMill.unlocked, false);
  person.skills.knowledge = 30;
  status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.paperMill.unlocked, true);

  state.industry.businesses.caravan = 2;
  state.resources.reputation = 19;
  status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.waterFleet.unlocked, false);
  state.resources.reputation = 20;
  status = E.getHouseholdUnlockStatus(state);
  assert.equal(status.waterFleet.unlocked, true);
});

test('V1.7 defines fifteen one-time family milestones with the approved rewards', async () => {
  const E = await currentEngine();
  assert.equal(E.V170_MILESTONES.length, 15);
  const rewards = Object.fromEntries(E.V170_MILESTONES.map(item => [item.id, item.reward]));
  assert.equal(rewards.firstHarvest, 15);
  assert.equal(rewards.land10, 40);
  assert.equal(rewards.land30, 120);
  assert.equal(rewards.industry1, 20);
  assert.equal(rewards.industry5, 60);
  assert.equal(rewards.industry10, 120);
  assert.equal(rewards.industry30, 300);
  assert.equal(rewards.assets500, 30);
  assert.equal(rewards.assets2000, 80);
  assert.equal(rewards.assets5000, 150);
  assert.equal(rewards.assets20000, 500);
  assert.equal(rewards.knowledge20, 30);
  assert.equal(rewards.knowledge40, 80);
  assert.equal(rewards.reputation15, 30);
  assert.equal(rewards.reputation30, 100);
});

test('milestone money is automatic, persistent, and never paid twice', async () => {
  const E = await currentEngine();
  const state = game(E, 1704);
  setAssetValue(E, state, 500);
  const before = state.resources.money;
  let milestones = E.getV170MilestoneStatus(state);
  assert.equal(milestones.byId.assets500.completed, true);
  assert.equal(state.resources.money, before + 30);
  assert.equal(state.v170Milestones.claimed.assets500, true);
  E.getV170MilestoneStatus(state);
  assert.equal(state.resources.money, before + 30);

  const loaded = E.deserializeState(E.serializeState(state));
  E.getV170MilestoneStatus(loaded);
  assert.equal(loaded.resources.money, before + 30);
});

test('new V1.7 milestones may reward qualifying old saves, while harvest starts counting from V1.7 onward', async () => {
  const E = await currentEngine();
  const Old = await import('../dist/engine-v169.js?v=1.6.9');
  const old = Old.createGame({ surname: '沈', origin: 'peasant', seed: 1705 });
  old.household.land = 10;
  old.resources.land = 10;
  setAssetValue(Old, old, 500);
  const moneyBefore = old.resources.money;
  const loaded = E.deserializeState(Old.serializeState(old));
  assert.equal(loaded.v170Milestones.claimed.land10, true);
  assert.equal(loaded.v170Milestones.claimed.assets500, true);
  assert.equal(loaded.v170Milestones.claimed.firstHarvest, false);
  assert.equal(loaded.v170Progress.harvestSince170, 0);
  assert.ok(loaded.resources.money >= moneyBefore + 70);
});

test('current page routes through V1.7 and exposes the industry milestone UI', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(index, /V1\.7\.0/);
  assert.match(index, /engine-v170\.js\?v=1\.7\.0/);
  assert.match(index, /v170-ui\.js\?v=1\.7\.0/);
  assert.match(index, /v170\.css\?v=1\.7\.0/);
  assert.match(index, /磨坊|油坊|酒坊|客栈|织坊|纸坊|水运船队/);
  assert.match(index, /经营成就|家业目标|里程碑/);
});
