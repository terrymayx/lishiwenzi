import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../dist/engine-v164.js?v=1.6.4';

function game(seed = 16450) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  state.running = false;
  state.pendingEvent = null;
  E.selectActivity(state, 'rest');
  return state;
}

function otherAdult(state) {
  return Object.values(state.people).find(person => person.id !== state.playerId && person.alive && person.age >= 16);
}

test('only the current protagonist can receive manual work assignments', () => {
  const state = game(16451);
  const other = otherAdult(state);
  assert.ok(other, 'expected at least one other adult household member');

  const rejected = E.setFamilyWorkAssignment(state, other.id, 'shortwork');
  assert.equal(rejected.ok, false);
  assert.match(rejected.message, /只有|执笔人|本人/);

  const accepted = E.setFamilyWorkAssignment(state, state.playerId, 'shortwork');
  assert.equal(accepted.ok, true);
  assert.equal(state.currentActivity.id, 'trade');
});

test('non-player adults do not earn wages or add family farm capacity', () => {
  const state = game(16452);
  const other = otherAdult(state);
  assert.ok(other);

  const jobs = E.getFamilyWorkAssignments(state);
  const otherJob = jobs.find(job => job.personId === other.id);
  assert.ok(otherJob);
  assert.equal(otherJob.dailyIncome, 0);
  assert.equal(otherJob.farmCapacity, 0);
  assert.ok(!['shortwork', 'homecraft', 'agriculture', 'longfarm'].includes(otherJob.assignment));

  const summary = E.getFarmSummary(state);
  assert.equal(summary.familyCapacity, 0, 'player is resting, so relatives must not add farm labor');
});

test('legacy non-player paid-work assignments are neutralized when a save is loaded', () => {
  const state = game(16453);
  const other = otherAdult(state);
  assert.ok(other);

  E.ensureFamilyWork(state).work.assignments[other.id] = 'shortwork';
  const loaded = E.deserializeState(E.serializeState(state));
  const loadedOther = E.getFamilyWorkAssignments(loaded).find(job => job.personId === other.id);

  assert.ok(loadedOther);
  assert.equal(loadedOther.dailyIncome, 0);
  assert.equal(loadedOther.farmCapacity, 0);
  assert.notEqual(loadedOther.assignment, 'shortwork');
});

test('family tree work UI exposes assignment controls only for the current protagonist', () => {
  const ui = fs.readFileSync(new URL('../dist/family-work-ui.js', import.meta.url), 'utf8');
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');

  assert.match(ui, /person\.id\s*!==\s*state\.playerId|id\s*!==\s*state\.playerId/);
  assert.match(ui, /只有.*执笔人|仅.*执笔人|家属不参与工作指派/);
  assert.match(index, /仅.*执笔人.*指派工作|只有.*执笔人.*指派工作/);
});
