import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  performAction,
  serializeState,
  deserializeState,
  listSuccessors,
  continueAs,
  resolveEvent,
  getActions,
  __test
} from './engine.js';

function resume(state) {
  if (state.pendingEvent) {
    const event = state.pendingEvent;
    resolveEvent(state, event.id, event.options[0].id);
  }
  if (state.phase === 'succession') {
    const successor = listSuccessors(state)[0];
    if (successor) continueAs(state, successor.id);
  }
  if (state.phase === 'guardian') {
    const guardian = Object.values(state.people).find(person => person.alive && person.id !== state.pendingGuardian.successorId && person.age >= 18);
    if (guardian) __test.performGuardianAction(state, guardian.id, 'protect');
    else __test.performGuardianAction(state, 'community-guardian', 'protect');
  }
}

function doTurn(state, main = 'study', family = 'cultivate') {
  resume(state);
  if (state.phase !== 'playing') return state;
  const first = performAction(state, main, { confirmRisk: true });
  assert.equal(first.ok, true, first.message);
  const second = performAction(state, family, { confirmRisk: true });
  assert.equal(second.ok, true, second.message);
  return second;
}

test('two action slots commit one quarter and reject duplicate slot atomically', () => {
  const state = createGame({ seed: 7 });
  const before = serializeState(state);
  const first = performAction(state, 'study');
  assert.equal(first.ok, true);
  assert.equal(state.tick, 0);
  const afterFirst = serializeState(state);
  const duplicate = performAction(state, 'trade');
  assert.equal(duplicate.ok, false);
  assert.equal(serializeState(state), afterFirst);
  assert.notEqual(afterFirst, before);
  const second = performAction(state, 'cultivate');
  assert.equal(second.ok, true);
  assert.equal(state.tick, 1);
  assert.equal(state.actionSlots.main, null);
  assert.equal(state.actionSlots.family, null);
});

test('failed risk confirmation is atomic including RNG state', () => {
  const state = createGame({ seed: 8 });
  const before = serializeState(state);
  const result = performAction(state, 'enlist');
  assert.equal(result.ok, false);
  assert.equal(result.needsRiskConfirmation, true);
  assert.equal(serializeState(state), before);
});

test('fixed historical entries trigger once', () => {
  const state = createGame({ seed: 9 });
  const expected = ['h291', 'h304', 'h311', 'h316', 'h317', 'h318', 'h329'];
  while (state.tick < 160) doTurn(state);
  assert.deepEqual(state.history, expected);
  while (state.tick < 240) {
    doTurn(state);
    if (state.phase === 'ended') break;
  }
  for (const id of expected) assert.equal(state.history.filter(x => x === id).length, 1, id);
  assert.equal(state.history.length, expected.length);
});

test('only root blood descendants can inherit; spouse and mother are excluded', () => {
  const state = createGame({ seed: 10 });
  doTurn(state, 'study', 'marry');
  // Pregnancy is three completed quarters, then a child enters the tree.
  doTurn(state, 'study', 'child');
  doTurn(state); doTurn(state); doTurn(state);
  const spouse = Object.values(state.people).find(p => p.role === 'spouse');
  const mother = Object.values(state.people).find(p => p.role === 'mother');
  const child = Object.values(state.people).find(p => p.role === 'child');
  assert.ok(spouse && mother && child);
  assert.ok(listSuccessors(state).some(p => p.id === child.id));
  assert.ok(!listSuccessors(state).some(p => p.id === spouse.id));
  assert.ok(!listSuccessors(state).some(p => p.id === mother.id));
});

test('minor succession requires a guardian action', () => {
  const state = createGame({ seed: 11 });
  doTurn(state, 'study', 'marry');
  doTurn(state, 'study', 'child');
  doTurn(state); doTurn(state); doTurn(state);
  const child = Object.values(state.people).find(p => p.role === 'child');
  assert.ok(child);
  __test.killPerson(state, state.playerId, '测试');
  const picked = continueAs(state, child.id);
  assert.equal(picked.ok, true);
  assert.equal(state.phase, 'guardian');
  const guardian = Object.values(state.people).find(p => p.alive && p.id !== child.id && p.age >= 18);
  assert.ok(guardian);
  const guarded = __test.performGuardianAction(state, guardian.id, 'protect');
  assert.equal(guarded.ok, true);
  assert.equal(state.phase, 'playing');
  assert.equal(state.playerId, child.id);
});

test('RNG state round trips exactly', () => {
  const first = createGame({ seed: 12 });
  performAction(first, 'trade');
  const saved = serializeState(first);
  const restored = deserializeState(saved);
  const a = performAction(first, 'cultivate');
  const b = performAction(restored, 'cultivate');
  assert.equal(a.message, b.message);
  assert.equal(serializeState(first), serializeState(restored));
});

test('pregnancy takes three quarters and enforces spacing', () => {
  const state = createGame({ seed: 13 });
  doTurn(state, 'study', 'marry');
  resume(state);
  const pregnant = performAction(state, 'child');
  assert.equal(pregnant.ok, true);
  assert.equal(Object.values(state.people).filter(p => p.role === 'child').length, 0);
  assert.equal(performAction(state, 'child').ok, false);
  const closing = performAction(state, 'study', { confirmRisk: true });
  assert.equal(closing.ok, true, closing.message);
  doTurn(state);
  assert.equal(Object.values(state.people).filter(p => p.role === 'child').length, 0);
  doTurn(state);
  assert.equal(Object.values(state.people).filter(p => p.role === 'child').length, 1);
});

test('350 spring is the inclusive endpoint after 240 quarters', () => {
  const state = createGame({ seed: 14 });
  while (state.tick < 240) {
    if (state.pendingEvent) resolveEvent(state, state.pendingEvent.id, state.pendingEvent.options[0].id);
    if (state.phase !== 'playing') break;
    doTurn(state);
  }
  assert.equal(state.tick, 240);
  assert.equal(state.year, 350);
  assert.equal(state.quarter, 1);
  assert.equal(state.endpoint, true);
  assert.equal(state.phase, 'ended');
  assert.ok(getActions(state).every(action => action.disabled));
});

