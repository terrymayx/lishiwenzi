import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ensureAgriculture,
  getFarmSummary,
  rollSeasonWeather,
  V13_RULES
} from '../dist/v13-rules.js';

function makeState({ seed = 1, land = 20, hiredWorkers = 0, running = true } = {}) {
  const state = {
    seed,
    year: 304,
    month: 6,
    day: 1,
    phase: 'playing',
    endpoint: false,
    running,
    pendingEvent: null,
    pauseReason: null,
    region: '洛阳近郊',
    grainPrice: 1,
    playerId: 'p1',
    family: { id: 'family-1', households: [{ assets: [] }] },
    household: { land, money: 100, grain: 100 },
    resources: { money: 100, grain: 100, land, hunger: 0 },
    people: {
      p1: { id: 'p1', alive: true, age: 30, health: 80, hunger: 0, familyId: 'family-1' },
      p2: { id: 'p2', alive: true, age: 58, health: 80, hunger: 0, familyId: 'family-1' },
      p3: { id: 'p3', alive: true, age: 14, health: 80, hunger: 0, familyId: 'family-1' }
    },
    eventLog: []
  };
  const agriculture = ensureAgriculture(state);
  agriculture.hiredWorkers = hiredWorkers;
  return state;
}

test('major farm weather automatically applies its yield loss without pausing for a decision', () => {
  let majorState = null;
  let majorWeather = null;
  for (let seed = 1; seed <= 5000; seed += 1) {
    const state = makeState({ seed, running: true });
    const weather = rollSeasonWeather(state);
    if (weather.severity === 'major') {
      majorState = state;
      majorWeather = weather;
      break;
    }
  }

  assert.ok(majorState, 'expected to find a deterministic major-weather seed');
  assert.ok(majorWeather.yieldModifier < 1);
  assert.equal(majorState.pendingEvent, null);
  assert.equal(majorState.running, true);
  assert.ok(majorState.eventLog.some(entry => entry.kind === 'warning'));
});

test('farm summary tells the player exactly how many workers are missing and how many can still be hired', () => {
  const state = makeState({ land: 20, hiredWorkers: 2, running: false });
  const summary = getFarmSummary(state);

  assert.equal(summary.familyCapacity, 5);
  assert.equal(summary.hiredWorkers, 2);
  assert.equal(summary.hiredCapacity, 6);
  assert.equal(summary.idleAcres, 9);
  assert.equal(summary.workersNeeded, 3);
  assert.equal(summary.maxHiredWorkers, V13_RULES.MAX_HIRED_WORKERS);
  assert.equal(summary.remainingWorkerSlots, V13_RULES.MAX_HIRED_WORKERS - 2);
});

test('farm summary reports when the hired-worker limit still cannot cover all land', () => {
  const state = makeState({ land: 120, hiredWorkers: V13_RULES.MAX_HIRED_WORKERS, running: false });
  const summary = getFarmSummary(state);

  assert.equal(summary.remainingWorkerSlots, 0);
  assert.ok(summary.idleAcres > 0);
  assert.ok(summary.workersNeeded > 0);
  assert.equal(summary.workerLimitReached, true);
});

test('V1.6.1 page hides secondary information and adds resource plus shortcuts', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const game = fs.readFileSync(new URL('../dist/game.js', import.meta.url), 'utf8');
  const farmUi = fs.readFileSync(new URL('../dist/v13-ui.js', import.meta.url), 'utf8');

  assert.match(index, /V1\.6\.1/);
  assert.match(index, /data-resource-shortcut="money"/);
  assert.match(index, /data-resource-shortcut="grain"/);
  assert.match(index, /data-resource-shortcut="reputation"/);
  assert.match(index, /id="more-status"/);
  assert.match(index, /<details[^>]+id="reputation-donation"/);
  assert.match(index, /<details[^>]+class="[^"]*chronicle/);
  assert.doesNotMatch(index, /<details[^>]+class="[^"]*chronicle[^"]*"[^>]*\sopen(?:\s|>)/);

  assert.match(game, /resource-shortcut/);
  assert.match(game, /buyGrain/);
  assert.match(farmUi, /workersNeeded/);
  assert.match(farmUi, /remainingWorkerSlots/);
  assert.match(farmUi, /雇工上限|还能雇|还需/);
});
