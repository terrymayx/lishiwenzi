import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const engineUrl = new URL('../dist/engine-v161.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(engineUrl), 'V1.6.1 current engine wrapper must exist');
  return import('../dist/engine-v161.js?v=1.6.1');
}

function makeState(E, { seed = 1, land = 20, hiredWorkers = 0, running = true } = {}) {
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
  const agriculture = E.ensureAgriculture(state);
  agriculture.hiredWorkers = hiredWorkers;
  return state;
}

test('major farm weather automatically applies its yield loss without pausing for a decision in V1.6.1', async () => {
  const E = await currentEngine();
  let majorState = null;
  let majorWeather = null;
  for (let seed = 1; seed <= 5000; seed += 1) {
    const state = makeState(E, { seed, running: true });
    const weather = E.rollSeasonWeather(state);
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

test('V1.6.1 farm summary tells exactly how many workers are missing and how many can still be hired', async () => {
  const E = await currentEngine();
  const state = makeState(E, { land: 20, hiredWorkers: 2, running: false });
  const summary = E.getFarmSummary(state);

  assert.equal(summary.hiredWorkers, 2);
  assert.equal(summary.hiredCapacity, 6);
  assert.equal(summary.workersNeeded, Math.ceil(summary.idleAcres / E.V13_RULES.HIRED_WORKER_ACRES));
  assert.equal(summary.maxHiredWorkers, E.V13_RULES.MAX_HIRED_WORKERS);
  assert.equal(summary.remainingWorkerSlots, E.V13_RULES.MAX_HIRED_WORKERS - 2);
});

test('V1.6.1 farm summary reports when the hired-worker limit still cannot cover all land', async () => {
  const E = await currentEngine();
  const state = makeState(E, { land: 120, hiredWorkers: E.V13_RULES.MAX_HIRED_WORKERS, running: false });
  const summary = E.getFarmSummary(state);

  assert.equal(summary.remainingWorkerSlots, 0);
  assert.ok(summary.idleAcres > 0);
  assert.ok(summary.workersNeeded > 0);
  assert.equal(summary.workerLimitReached, true);
});

test('V1.6.1 page hides secondary information and adds resource plus shortcuts', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const uiPath = new URL('../dist/v161-ui.js', import.meta.url);

  assert.match(index, /V1\.6\.1/);
  assert.match(index, /engine-v161\.js\?v=1\.6\.1/);
  assert.match(index, /data-resource-shortcut="money"/);
  assert.match(index, /data-resource-shortcut="grain"/);
  assert.match(index, /data-resource-shortcut="reputation"/);
  assert.match(index, /id="more-status"/);
  assert.match(index, /<details[^>]+id="reputation-donation"/);
  assert.match(index, /<details[^>]+class="[^"]*chronicle/);
  assert.doesNotMatch(index, /<details[^>]+class="[^"]*chronicle[^"]*"[^>]*\sopen(?:\s|>)/);

  assert.ok(fs.existsSync(uiPath), 'V1.6.1 UI controller must exist');
  const ui = fs.readFileSync(uiPath, 'utf8');
  assert.match(ui, /resource-shortcut/);
  assert.match(ui, /buyGrain/);
  assert.match(ui, /workersNeeded/);
  assert.match(ui, /remainingWorkerSlots/);
  assert.match(ui, /雇工上限|还能雇|还需/);
});
