import test from 'node:test';
import assert from 'node:assert/strict';
import {
  V170_BUSINESSES,
  V170_MILESTONES,
  createGame,
  getIndustrySummary,
  getHouseholdUnlockStatus,
  buyBusiness,
  evaluateV170Progress
} from '../dist/engine-v170.js?v=1.7.0';

test('V1.7 exposes seven new simple passive businesses', () => {
  const ids = ['mill','oilPress','winery','inn','weavingWorkshop','paperMill','shippingFleet'];
  for (const id of ids) assert.ok(V170_BUSINESSES[id], `${id} should exist`);
  assert.equal(V170_BUSINESSES.mill.price, 120);
  assert.equal(V170_BUSINESSES.shippingFleet.dailyIncome, 23);
});

test('new game keeps previous businesses and exposes V1.7 business summary', () => {
  const state = createGame({ surname: '沈', origin: 'farmer', seed: 7 });
  const summary = getIndustrySummary(state);
  for (const id of ['grainShop','clothShop','caravan','mill','oilPress','winery','inn','weavingWorkshop','paperMill','shippingFleet']) {
    assert.ok(summary.businesses[id], `${id} should be rendered by summary`);
  }
});

test('mill unlocks at 3 mu and 180 asset value with one-time reward', () => {
  const state = createGame({ surname: '沈', origin: 'farmer', seed: 9 });
  state.household.land = 3;
  state.resources.land = 3;
  state.resources.money = 180;
  state.household.money = 180;
  const before = state.resources.money;
  const status = evaluateV170Progress(state);
  assert.equal(status.industries.mill.unlocked, true);
  assert.equal(state.resources.money, before + 20);
  const again = evaluateV170Progress(state);
  assert.equal(state.resources.money, before + 20);
  assert.equal(again.industries.mill.rewardClaimed, true);
});

test('locked new business cannot be purchased before conditions are met', () => {
  const state = createGame({ surname: '沈', origin: 'farmer', seed: 11 });
  state.resources.money = 9999;
  state.household.money = 9999;
  const result = buyBusiness(state, 'paperMill');
  assert.equal(result.ok, false);
  assert.match(result.message, /尚未解锁|条件/);
});

test('milestone rewards are one-time and include estate, income, knowledge and reputation goals', () => {
  const ids = Object.keys(V170_MILESTONES);
  for (const id of ['land10','dailyIncome5','asset2000','knowledge20','reputation15']) assert.ok(ids.includes(id));
  const state = createGame({ surname: '沈', origin: 'farmer', seed: 13 });
  state.household.land = 10;
  state.resources.land = 10;
  const before = state.resources.money;
  evaluateV170Progress(state);
  assert.equal(state.householdAchievements.claimed.land10, true);
  assert.equal(state.resources.money, before + V170_MILESTONES.land10.rewardMoney);
  evaluateV170Progress(state);
  assert.equal(state.resources.money, before + V170_MILESTONES.land10.rewardMoney);
});

test('unlock status exposes explicit conditions and reward amounts for new industries', () => {
  const state = createGame({ surname: '沈', origin: 'farmer', seed: 15 });
  const status = getHouseholdUnlockStatus(state);
  assert.equal(status.industries.mill.rewardMoney, 20);
  assert.ok(status.industries.paperMill.conditions.some(item => item.label === '学识'));
  assert.ok(status.industries.shippingFleet.conditions.some(item => item.label === '声望'));
});
