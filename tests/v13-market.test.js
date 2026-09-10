import test from 'node:test';
import assert from 'node:assert/strict';
import { getGrainBuyPrice, getBuyQuote, buyGrain } from '../dist/v13-market.js';
import { getGrainSellPrice } from '../dist/v13-rules.js';

function makeState(overrides = {}) {
  return {
    year: 290,
    month: 3,
    day: 1,
    phase: 'playing',
    endpoint: false,
    running: false,
    pendingEvent: null,
    grainPrice: 1,
    household: { money: 100, grain: 20 },
    resources: { money: 100, grain: 20 },
    eventLog: [],
    ...overrides
  };
}

test('grain market offers a buy price above the normal sell price', () => {
  const state = makeState();
  assert.ok(getGrainBuyPrice(state) > getGrainSellPrice(state));
  assert.deepEqual(getBuyQuote(state, 50), { amount: 50, unitPrice: 0.9, total: 45 });
});

test('buying grain updates money and grain immediately', () => {
  const state = makeState();
  const result = buyGrain(state, 50);
  assert.equal(result.ok, true);
  assert.equal(state.resources.money, 55);
  assert.equal(state.resources.grain, 70);
  assert.equal(state.household.money, 55);
  assert.equal(state.household.grain, 70);
  assert.equal(state.market.lastTrade.type, 'buy');
  assert.equal(state.market.lastTrade.total, 45);
});

test('grain buying is blocked when time is running or money is insufficient', () => {
  assert.equal(buyGrain(makeState({ running: true }), 10).ok, false);
  const poor = makeState({ resources: { money: 1, grain: 20 }, household: { money: 1, grain: 20 } });
  assert.equal(buyGrain(poor, 10).ok, false);
});
