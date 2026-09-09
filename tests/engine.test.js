import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, selectActivity, advanceDay, resolveEvent, serializeState, deserializeState,
  listSuccessors, continueAs, performGuardianAction, getDailyFoodCost,
  getLandPrice, buyLand, __test
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
  assert.equal(state.pendingEvent, null);
});

test('chapter story does not interrupt immediately and pauses after 30 lived days', () => {
  const state = createGame({ seed: 9 });
  assert.equal(selectActivity(state, 'study').ok, true);
  for (let i = 0; i < 29; i++) {
    const result = advanceDay(state);
    assert.equal(result.ok, true);
    if (state.pendingEvent) {
      assert.notEqual(state.pendingEvent.source, 'story', `chapter event fired too early on lived day ${state.elapsedDays}`);
      clearPending(state);
    }
  }
  assert.equal(state.chapterSeen[1], undefined);
  const result = advanceDay(state);
  assert.equal(result.paused, true);
  assert.equal(state.elapsedDays, 30);
  assert.equal(state.pendingEvent?.source, 'story');
  assert.equal(state.pendingEvent?.id, 'chapter-1');
});

test('every simulated day consumes food for every living household member', () => {
  const state = createGame({ seed: 2 });
  const daily = getDailyFoodCost(state);
  const before = state.resources.grain;
  selectActivity(state, 'study');
  advanceDay(state);
  assert.equal(state.resources.grain, Math.round((before - daily) * 10) / 10);
});

test('food crisis only allows buying grain with money', () => {
  const state = createGame({ seed: 20 });
  state.resources.money = 20;
  state.resources.grain = 0.1;
  assert.equal(selectActivity(state, 'study').ok, true);
  const result = advanceDay(state);
  assert.equal(result.paused, true);
  assert.equal(state.pendingEvent?.title, '家中断粮');
  assert.deepEqual(state.pendingEvent?.options.map(option => option.id), ['buy']);
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

test('cultivation yield scales with owned land after daily food is paid', () => {
  const state = createGame({ seed: 2 });
  state.resources.grain = 50;
  state.household.grain = 50;
  const before = state.resources.grain;
  const daily = getDailyFoodCost(state);
  assert.equal(selectActivity(state, 'cultivate').ok, true);
  const result = advanceDay(state);
  assert.equal(result.ok, true);
  assert.equal(state.resources.grain, Math.round((before + state.household.land * 0.4 - daily) * 10) / 10);
});

test('buying land charges an escalating per-mu price and creates an asset', () => {
  const state = createGame({ seed: 12 });
  const beforeMoney = state.resources.money;
  const oneMu = getLandPrice(state, 1);
  assert.equal(oneMu, 26);
  const result = buyLand(state, 1);
  assert.equal(result.ok, true);
  assert.equal(result.cost, oneMu);
  assert.equal(state.resources.money, beforeMoney - oneMu);
  assert.equal(state.household.land, 3);
  assert.equal(state.assets.at(-1).type, '田产');
  assert.equal(state.assets.at(-1).area, 1);
});

test('buying multiple mu uses the escalating price for each new mu', () => {
  const state = createGame({ seed: 13 });
  state.resources.money = 100;
  const cost = getLandPrice(state, 3);
  assert.equal(cost, 90);
  assert.equal(buyLand(state, 3).ok, true);
  assert.equal(state.household.land, 5);
  assert.equal(state.resources.money, 100 - cost);
});

test('land purchase rejects insufficient money and pending decisions', () => {
  const state = createGame({ seed: 14 });
  state.resources.money = 0;
  assert.equal(buyLand(state, 1).ok, false);
  assert.equal(state.household.land, 2);
  __test.queueRandomEvent(state, 0);
  assert.equal(buyLand(state, 1).ok, false);
});

test('each person tracks hunger and full meals reduce it', () => {
  const state = createGame({ seed: 15 });
  const people = Object.values(state.people).filter(person => person.alive);
  people.forEach(person => { person.hunger = 42; });
  selectActivity(state, 'study');
  advanceDay(state);
  people.forEach(person => assert.equal(person.hunger, 30));
});

test('starvation raises hunger, damages health, and can kill a person', () => {
  const state = createGame({ seed: 16 });
  const protagonist = state.people[state.playerId];
  protagonist.hunger = 99;
  protagonist.health = 3;
  state.resources.grain = 0;
  selectActivity(state, 'study');
  advanceDay(state);
  assert.equal(protagonist.hunger, 100);
  assert.equal(protagonist.alive, false);
  assert.match(protagonist.notes.at(-1), /饥饿/);
});
