import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  selectActivity,
  advanceDay,
  resolveEvent,
  getActions,
  ensureAgriculture,
  getFarmSummary,
  __test,
  V13_RULES
} from '../dist/engine-v13.js';

test('V1.3 cultivation no longer creates grain every spring day', () => {
  const state = createGame({ seed: 101 });
  state.resources.grain = 100;
  state.household.grain = 100;
  const before = state.resources.grain;
  assert.equal(selectActivity(state, 'cultivate').ok, true);
  const result = advanceDay(state);
  assert.equal(result.ok, true);
  assert.equal(state.resources.grain, Math.round((before - state.dailyFood) * 10) / 10);
  assert.equal(state.agriculture.springWorkDays, 0); // January is winter: no crop growth.
});

test('V1.3 spring and summer cultivation prepare an autumn harvest', () => {
  const state = createGame({ seed: 102 });
  state.resources.grain = 500;
  state.household.grain = 500;
  assert.equal(selectActivity(state, 'cultivate').ok, true);
  __test.setDate(state, 290, 3, 1);
  for (let i = 0; i < V13_RULES.SPRING_WORK_DAYS; i += 1) {
    if (state.pendingEvent) resolveEvent(state, state.pendingEvent.id, state.pendingEvent.options.at(-1).id);
    advanceDay(state);
  }
  assert.equal(state.agriculture.springWorkDays, V13_RULES.SPRING_WORK_DAYS);
  __test.setDate(state, 290, 6, 1);
  for (let i = 0; i < V13_RULES.SUMMER_WORK_DAYS; i += 1) {
    if (state.pendingEvent) resolveEvent(state, state.pendingEvent.id, state.pendingEvent.options.at(-1).id);
    advanceDay(state);
  }
  assert.equal(state.agriculture.summerWorkDays, V13_RULES.SUMMER_WORK_DAYS);
  const beforeAutumn = state.resources.grain;
  __test.setDate(state, 290, 9, 1);
  for (let i = 0; i < V13_RULES.HARVEST_WORK_DAYS; i += 1) {
    if (state.pendingEvent) resolveEvent(state, state.pendingEvent.id, state.pendingEvent.options.at(-1).id);
    advanceDay(state);
  }
  assert.ok(state.resources.grain > beforeAutumn);
  assert.ok(state.agriculture.harvestedGrain > 0);
});

test('minor life events become messages instead of blocking the clock', () => {
  const state = createGame({ seed: 103 });
  selectActivity(state, 'study');
  state.running = true;
  __test.queueRandomEvent(state, 0);
  assert.equal(state.pendingEvent?.title, '家人染病');
  const result = advanceDay(state);
  assert.equal(result.ok, true);
  assert.equal(result.paused, false);
  assert.equal(state.pendingEvent, null);
  assert.equal(state.running, true);
  assert.ok(state.eventLog.some(entry => entry.title === '家人染病'));
});

test('major historical events still block time', () => {
  const state = createGame({ seed: 104 });
  selectActivity(state, 'study');
  __test.setDate(state, 290, 12, 31);
  const result = advanceDay(state);
  assert.equal(result.paused, true);
  assert.equal(state.pendingEvent?.source, 'history');
  assert.match(state.pendingEvent?.title || '', /八王之乱/);
});

test('cultivate action text explains the current agricultural season', () => {
  const state = createGame({ seed: 105 });
  __test.setDate(state, 290, 9, 1);
  const cultivate = getActions(state).find(action => action.id === 'cultivate');
  assert.match(cultivate.desc, /秋收/);
  const summary = getFarmSummary(state);
  assert.equal(summary.season, 'autumn');
  assert.ok(summary.familyCapacity >= 0);
});

test('old saves get an agriculture block when loaded into V1.3', () => {
  const state = createGame({ seed: 106 });
  delete state.agriculture;
  ensureAgriculture(state);
  assert.ok(state.agriculture);
  assert.equal(state.agriculture.hiredWorkers, 0);
});
