import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, selectActivity, advanceDay, resolveEvent, serializeState, deserializeState,
  listSuccessors, continueAs, performGuardianAction, getDailyFoodCost, __test
} from '../dist/engine.js';

function clearPending(state) {
  if (state.pendingEvent) {
    const event = state.pendingEvent;
    const affordable = event.options.find(option => {
      const e = option.effect || {};
      return state.resources.money + (e.money || 0) >= 0 && state.resources.grain + (e.grain || 0) >= 0;
    });
    assert.ok(affordable);
    assert.equal(resolveEvent(state, event.id, affordable.id).ok, true);
  }
}

function runDays(state, count) {
  for (let i = 0; i < count; i++) {
    clearPending(state);
    if (state.phase === 'succession') {
      const s = listSuccessors(state)[0];
      if (!s) break;
      continueAs(state, s.id);
    }
    if (state.phase === 'guardian') {
      const g = Object.values(state.people).find(p => p.alive && p.age >= 18 && p.id !== state.pendingGuardian.successorId);
      performGuardianAction(state, g?.id || 'community-guardian', 'protect');
    }
    if (state.phase !== 'playing' || state.endpoint) break;
    if (!state.currentActivity) assert.equal(selectActivity(state, 'study').ok, true);
    advanceDay(state);
  }
}

test('selecting an activity does not move the calendar until a day advances', () => {
  const state = createGame({ seed: 1 });
  assert.equal(selectActivity(state, 'study').ok, true);
  assert.equal(state.year, 290);
  assert.equal(state.month, 1);
  assert.equal(state.day, 1);
  clearPending(state);
  advanceDay(state);
  assert.equal(state.day, 2);
});

test('every simulated day consumes food for every living household member', () => {
  const state = createGame({ seed: 2 });
  const daily = getDailyFoodCost(state);
  const before = state.resources.grain;
  selectActivity(state, 'study');
  advanceDay(state);
  assert.equal(state.resources.grain, Math.round((before - daily) * 10) / 10);
});

test('291 historical event pauses time and only triggers once', () => {
  const state = createGame({ seed: 3 });
  selectActivity(state, 'study');
  __test.setDate(state, 290, 12, 31);
  const result = advanceDay(state);
  assert.equal(state.year, 291);
  assert.equal(state.month, 1);
  assert.equal(state.day, 1);
  assert.equal(result.paused, true);
  assert.equal(state.running, false);
  assert.equal(state.history.filter(id => id === 'h291').length, 1);
  assert.match(state.pendingEvent.title, /八王之乱/);
  clearPending(state);
  // Same date cannot retrigger because h291 is already recorded.
  __test.setDate(state, 290, 12, 31);
  if (!state.currentActivity) selectActivity(state, 'study');
  advanceDay(state);
  assert.equal(state.history.filter(id => id === 'h291').length, 1);
});

test('a queued random event pauses until the player resolves it', () => {
  const state = createGame({ seed: 4 });
  selectActivity(state, 'study');
  __test.queueRandomEvent(state, 0);
  assert.equal(state.running, false);
  assert.ok(state.pendingEvent);
  const before = state.elapsedDays;
  assert.equal(advanceDay(state).ok, false);
  assert.equal(state.elapsedDays, before);
  clearPending(state);
  assert.equal(state.pendingEvent, null);
});

test('pregnancy is measured in days rather than quarters', () => {
  const state = createGame({ seed: 5 });
  // Finish chapter event first so project selection is available.
  selectActivity(state, 'marry');
  for (let i = 0; i < 15; i++) { clearPending(state); advanceDay(state); }
  assert.ok(Object.values(state.people).some(p => p.role === 'spouse'));
  selectActivity(state, 'child');
  clearPending(state); advanceDay(state);
  const mother = Object.values(state.people).find(p => p.pregnancy);
  assert.ok(mother);
  assert.equal(mother.pregnancy.remainingDays, 270);
});

test('only root blood descendants can inherit in the daily engine', () => {
  const state = createGame({ seed: 6 });
  // Inject a child only through the real pregnancy path.
  selectActivity(state, 'marry');
  for (let i = 0; i < 15; i++) { clearPending(state); advanceDay(state); }
  selectActivity(state, 'child'); clearPending(state); advanceDay(state);
  runDays(state, 270);
  const child = Object.values(state.people).find(p => p.role === 'child');
  const spouse = Object.values(state.people).find(p => p.role === 'spouse');
  assert.ok(child && spouse);
  __test.killPerson(state, state.playerId, '测试');
  assert.ok(listSuccessors(state).some(p => p.id === child.id));
  assert.ok(!listSuccessors(state).some(p => p.id === spouse.id));
});

test('RNG and exact day round-trip through save data', () => {
  const a = createGame({ seed: 7 });
  selectActivity(a, 'trade');
  runDays(a, 20);
  const saved = serializeState(a);
  const b = deserializeState(saved);
  clearPending(a); clearPending(b);
  if (!a.currentActivity) selectActivity(a, 'trade');
  if (!b.currentActivity) selectActivity(b, 'trade');
  advanceDay(a); advanceDay(b);
  assert.equal(serializeState(a), serializeState(b));
});

test('350-01-01 is the inclusive demo endpoint', () => {
  const state = createGame({ seed: 8 });
  selectActivity(state, 'study');
  __test.setDate(state, 349, 12, 31);
  const result = advanceDay(state);
  assert.equal(result.endpoint, true);
  assert.equal(state.year, 350);
  assert.equal(state.month, 1);
  assert.equal(state.day, 1);
  assert.equal(state.phase, 'ended');
});
