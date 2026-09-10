import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSeason,
  getPersonFarmCapacity,
  getFamilyFarmCapacity,
  getTotalFarmCapacity,
  getFarmSummary,
  hireFarmWorkers,
  dismissFarmWorkers,
  getGrainSellPrice,
  sellGrain,
  ensureAgriculture,
  recordCultivationDay,
  settleMonthlyFarmWages,
  rollSeasonWeather,
  isMinorMessageEvent,
  resolveAgricultureEvent,
  V13_RULES
} from '../dist/v13-rules.js';

function makeState(overrides = {}) {
  return {
    seed: 20260910,
    year: 290,
    month: 3,
    day: 1,
    phase: 'playing',
    endpoint: false,
    running: false,
    pendingEvent: null,
    pauseReason: null,
    currentActivity: null,
    region: '洛阳近郊',
    grainPrice: 1,
    playerId: 'p1',
    activeId: 'p1',
    selectedPersonId: 'p1',
    family: { id: 'family-1', cohesion: 65, households: [{ assets: [] }] },
    household: { land: 8, money: 100, grain: 100, location: '洛阳近郊' },
    resources: { money: 100, grain: 100, land: 8, hunger: 0 },
    people: {
      p1: { id: 'p1', name: '沈安', alive: true, age: 30, health: 80, hunger: 0, familyId: 'family-1', skills: { trade: 1 } },
      p2: { id: 'p2', name: '沈母', alive: true, age: 58, health: 70, hunger: 0, familyId: 'family-1', skills: { trade: 1 } },
      p3: { id: 'p3', name: '沈子', alive: true, age: 14, health: 80, hunger: 0, familyId: 'family-1', skills: { trade: 1 } }
    },
    eventLog: [],
    assets: [],
    nextId: 10,
    ...overrides
  };
}

test('calendar months map to agricultural seasons', () => {
  assert.equal(getSeason(3), 'spring');
  assert.equal(getSeason(6), 'summer');
  assert.equal(getSeason(9), 'autumn');
  assert.equal(getSeason(12), 'winter');
  assert.equal(getSeason(1), 'winter');
});

test('each household member has a limited sustainable acreage', () => {
  assert.equal(getPersonFarmCapacity({ age: 30, health: 80, hunger: 0, alive: true }), 3);
  assert.equal(getPersonFarmCapacity({ age: 14, health: 80, hunger: 0, alive: true }), 1);
  assert.equal(getPersonFarmCapacity({ age: 58, health: 80, hunger: 0, alive: true }), 1);
  assert.equal(getPersonFarmCapacity({ age: 70, health: 80, hunger: 0, alive: true }), 0);
  assert.equal(getPersonFarmCapacity({ age: 30, health: 25, hunger: 0, alive: true }), 0);
});

test('family and hired workers together cap productive acreage', () => {
  const state = makeState();
  ensureAgriculture(state);
  assert.equal(getFamilyFarmCapacity(state), 5);
  assert.equal(getTotalFarmCapacity(state), 5);
  state.agriculture.hiredWorkers = 1;
  assert.equal(getTotalFarmCapacity(state), 8);
  const summary = getFarmSummary(state);
  assert.equal(summary.land, 8);
  assert.equal(summary.productiveAcres, 8);
  assert.equal(summary.idleAcres, 0);
});

test('hiring workers costs the first month up front and adds farm capacity', () => {
  const state = makeState();
  ensureAgriculture(state);
  const result = hireFarmWorkers(state, 1);
  assert.equal(result.ok, true);
  assert.equal(state.agriculture.hiredWorkers, 1);
  assert.equal(state.resources.money, 94);
  assert.equal(getTotalFarmCapacity(state), 8);
  assert.equal(dismissFarmWorkers(state, 1).ok, true);
  assert.equal(state.agriculture.hiredWorkers, 0);
});

test('monthly farm wages are paid once and unaffordable workers leave', () => {
  const state = makeState();
  ensureAgriculture(state);
  state.agriculture.hiredWorkers = 2;
  state.agriculture.lastWageMonthKey = '290-3';
  state.resources.money = 7;
  state.month = 4;
  state.day = 1;
  const result = settleMonthlyFarmWages(state);
  assert.equal(result.paidWorkers, 1);
  assert.equal(result.dismissedWorkers, 1);
  assert.equal(state.agriculture.hiredWorkers, 1);
  assert.equal(state.resources.money, 1);
  assert.equal(settleMonthlyFarmWages(state).charged, 0);
});

test('grain can be sold only from stock and sale price stays below crisis buy price', () => {
  const state = makeState();
  state.resources.grain = 120;
  const price = getGrainSellPrice(state);
  assert.ok(price > 0 && price < (10 / 12));
  const result = sellGrain(state, 50);
  assert.equal(result.ok, true);
  assert.equal(state.resources.grain, 70);
  assert.equal(state.resources.money, Math.round((100 + 50 * price) * 10) / 10);
  assert.equal(sellGrain(state, 100).ok, false);
});

test('cultivation builds seasonal work but produces no grain before autumn harvest', () => {
  const state = makeState();
  ensureAgriculture(state);
  const before = state.resources.grain;
  for (let i = 0; i < V13_RULES.SPRING_WORK_DAYS; i += 1) recordCultivationDay(state);
  assert.equal(state.resources.grain, before);
  assert.equal(state.agriculture.springWorkDays, V13_RULES.SPRING_WORK_DAYS);
  state.month = 6;
  for (let i = 0; i < V13_RULES.SUMMER_WORK_DAYS; i += 1) recordCultivationDay(state);
  assert.equal(state.resources.grain, before);
});

test('autumn harvest converts prepared productive acres into grain once per year', () => {
  const state = makeState();
  ensureAgriculture(state);
  state.agriculture.springWorkDays = V13_RULES.SPRING_WORK_DAYS;
  state.agriculture.summerWorkDays = V13_RULES.SUMMER_WORK_DAYS;
  state.month = 9;
  const before = state.resources.grain;
  let harvested = 0;
  for (let i = 0; i < V13_RULES.HARVEST_WORK_DAYS; i += 1) {
    harvested += recordCultivationDay(state).grainHarvested;
  }
  assert.ok(harvested > 0);
  assert.equal(state.resources.grain, Math.round((before + harvested) * 10) / 10);
  const after = state.resources.grain;
  recordCultivationDay(state);
  assert.equal(state.resources.grain, after);
});

test('seasonal weather is deterministic and severe disasters request a pause decision', () => {
  const a = makeState({ seed: 12345, year: 304, month: 6 });
  const b = makeState({ seed: 12345, year: 304, month: 6 });
  const wa = rollSeasonWeather(a);
  const wb = rollSeasonWeather(b);
  assert.deepEqual(wa, wb);
  assert.ok(['normal', 'minor', 'major'].includes(wa.severity));
  if (wa.severity === 'major') assert.ok(a.pendingEvent && a.pendingEvent.source === 'agriculture-major');
});

test('named low-impact story and random events are message-only', () => {
  for (const title of ['家人染病', '临时征敛', '故人来信', '一纸旧债']) {
    assert.equal(isMinorMessageEvent({ title }), true);
  }
  assert.equal(isMinorMessageEvent({ title: '洛阳陷落' }), false);
});

test('major agriculture decision can spend money to mitigate the yield loss', () => {
  const state = makeState();
  ensureAgriculture(state);
  state.agriculture.weather['290-summer'] = { severity: 'major', type: 'drought', label: '大旱', yieldModifier: 0.55, mitigated: false };
  state.pendingEvent = {
    id: 'agri-290-summer', source: 'agriculture-major', title: '大旱', options: [
      { id: 'mitigate', label: '疏渠打井', cost: 12 },
      { id: 'accept', label: '承受减产', cost: 0 }
    ]
  };
  const result = resolveAgricultureEvent(state, 'agri-290-summer', 'mitigate');
  assert.equal(result.ok, true);
  assert.equal(state.resources.money, 88);
  assert.equal(state.agriculture.weather['290-summer'].mitigated, true);
  assert.ok(state.agriculture.weather['290-summer'].yieldModifier > 0.55);
  assert.equal(state.pendingEvent, null);
});
