import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, selectActivity, advanceDay, getLandPrice, buyLand
} from '../dist/engine-v12.js';

test('V1.2 wrapper ends the game immediately when the current protagonist reaches 100 hunger', () => {
  const state = createGame({ seed: 1201 });
  const protagonist = state.people[state.playerId];
  protagonist.hunger = 99;
  state.resources.grain = 0;
  state.resources.money = 0;
  assert.equal(selectActivity(state, 'study').ok, true);
  const result = advanceDay(state);
  assert.equal(result.starvation, true);
  assert.equal(protagonist.hunger, 100);
  assert.equal(protagonist.alive, false);
  assert.equal(state.phase, 'ended');
  assert.equal(state.pendingSuccession, false);
  assert.equal(state.ending.type, 'starvation');
});

test('V1.2 land pricing uses 20 + current land * 5 and purchases raise farm capacity', () => {
  const state = createGame({ seed: 1202 });
  assert.equal(state.household.land, 2);
  assert.equal(getLandPrice(state, 1), 30);
  state.resources.money = 200;
  const purchase = buyLand(state, 3);
  assert.equal(purchase.ok, true);
  assert.equal(purchase.cost, 105);
  assert.equal(state.household.land, 5);
  assert.equal(state.resources.land, 5);
});
