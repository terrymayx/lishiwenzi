import test from 'node:test';
import assert from 'node:assert/strict';
import { applyStarvationRules, getLandPrice, buyLand } from '../dist/v12-rules.js';

function sampleState() {
  return {
    year: 290, month: 1, day: 7,
    running: true, phase: 'playing', endpoint: false,
    playerId: 'p1', activeId: 'p1', currentActivity: { id: 'study' },
    pendingSuccession: true, pendingGuardian: { successorId: 'p2' }, pendingEvent: { id: 'x' },
    pauseReason: null, ending: null, nextId: 10,
    region: '洛阳近郊',
    resources: { money: 100, grain: 0, land: 2, hunger: 50 },
    household: { land: 2, money: 100 },
    family: { id: 'family-1', households: [{ assets: [] }] },
    people: {
      p1: { id: 'p1', name: '沈氏', alive: true, hunger: 100, familyId: 'family-1', notes: [] },
      p2: { id: 'p2', name: '母亲', alive: true, hunger: 20, familyId: 'family-1', notes: [] }
    },
    assets: [], eventLog: []
  };
}

test('current protagonist reaching 100 hunger ends the game immediately without succession', () => {
  const state = sampleState();
  const result = applyStarvationRules(state, { playerIdBefore: 'p1', dateLabel: '290年1月7日' });
  assert.equal(result.gameOver, true);
  assert.equal(state.people.p1.alive, false);
  assert.equal(state.phase, 'ended');
  assert.equal(state.running, false);
  assert.equal(state.pendingSuccession, false);
  assert.equal(state.pendingGuardian, null);
  assert.equal(state.pendingEvent, null);
  assert.equal(state.ending.type, 'starvation');
  assert.equal(state.ending.date, '290年1月7日');
  assert.match(state.pauseReason, /饥饿.*100/);
});

test('non-player family member reaching 100 hunger dies but does not end the game', () => {
  const state = sampleState();
  state.people.p1.hunger = 40;
  state.people.p2.hunger = 100;
  state.pendingSuccession = false;
  state.pendingGuardian = null;
  state.pendingEvent = null;
  const result = applyStarvationRules(state, { playerIdBefore: 'p1', dateLabel: '290年1月7日' });
  assert.equal(result.gameOver, false);
  assert.equal(state.people.p2.alive, false);
  assert.equal(state.phase, 'playing');
  assert.match(state.people.p2.notes.at(-1), /饥饿/);
});

test('land price follows 20 + current land * 5 for each newly purchased mu', () => {
  const state = sampleState();
  assert.equal(getLandPrice(state, 1), 30);
  assert.equal(getLandPrice(state, 3), 105);
});

test('buying land deducts money, increases land, and records a new land asset', () => {
  const state = sampleState();
  state.running = false;
  state.pendingEvent = null;
  state.pendingSuccession = false;
  state.pendingGuardian = null;
  const result = buyLand(state, 1);
  assert.equal(result.ok, true);
  assert.equal(result.cost, 30);
  assert.equal(state.resources.money, 70);
  assert.equal(state.household.land, 3);
  assert.equal(state.resources.land, 3);
  assert.equal(state.assets.at(-1).type, '田产');
  assert.equal(state.assets.at(-1).area, 1);
});

test('land purchase is blocked while time is running', () => {
  const state = sampleState();
  state.pendingEvent = null;
  state.pendingSuccession = false;
  state.pendingGuardian = null;
  const result = buyLand(state, 1);
  assert.equal(result.ok, false);
  assert.equal(state.household.land, 2);
});
