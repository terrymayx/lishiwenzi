import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v165.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'V1.6.5 current engine wrapper must exist');
  return import('../dist/engine-v165.js?v=1.6.5');
}

function makeGame(E, seed = 1650) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  state.resources.grain = 1000;
  state.household.grain = 1000;
  state.resources.money = 100;
  state.household.money = 100;
  state.chapterSeen[1] = true;
  return state;
}

function findDay(E, state, month, available) {
  const days = E.MONTH_DAYS[month - 1];
  state.month = month;
  for (let day = 1; day <= days; day += 1) {
    state.day = day;
    if (E.isShortworkAvailable(state, state.playerId) === available) return day;
  }
  return null;
}

test('V1.6.5 raises actual shortwork wages by 0.2 while keeping availability unchanged', async () => {
  const E = await currentEngine();
  assert.deepEqual(E.V165_SHORTWORK_TERMS.spring, { availability: 0.8, wage: 0.8 });
  assert.deepEqual(E.V165_SHORTWORK_TERMS.summer, { availability: 0.65, wage: 0.8 });
  assert.deepEqual(E.V165_SHORTWORK_TERMS.autumn, { availability: 0.85, wage: 0.9 });
  assert.deepEqual(E.V165_SHORTWORK_TERMS.winter, { availability: 0.45, wage: 0.7 });
});

test('manual farming actions are removed and cannot be selected', async () => {
  const E = await currentEngine();
  const state = makeGame(E, 1651);
  const ids = E.getActions(state).map(action => action.id);
  assert.equal(ids.includes('longfarm'), false);
  assert.equal(ids.includes('cultivate'), false);
  assert.equal(ids.includes('trade'), true);
  assert.equal(E.selectActivity(state, 'longfarm').ok, false);
  assert.equal(E.selectActivity(state, 'cultivate').ok, false);
});

test('an available spring shortwork day now pays 0.8 money', async () => {
  const E = await currentEngine();
  const state = makeGame(E, 1652);
  assert.equal(E.selectActivity(state, 'trade').ok, true);
  const day = findDay(E, state, 4, true);
  assert.notEqual(day, null);
  state.month = 4;
  state.day = day;
  const beforeMoney = state.resources.money;
  const beforeWorkIncome = E.ledger(state).workIncome;
  E.setRunning(state, true);
  const result = E.advanceDay(state);
  assert.equal(result.ok, true);
  assert.equal(Number((state.resources.money - beforeMoney).toFixed(2)), 0.8);
  assert.equal(Number((E.ledger(state).workIncome - beforeWorkIncome).toFixed(2)), 0.8);
});

test('land remains operated by automatic farm workers while protagonist does shortwork', async () => {
  const E = await currentEngine();
  const state = makeGame(E, 1653);
  state.household.land = 3;
  const auto = E.ensureAutoFarmWorkers(state);
  auto.requiredWorkers = 1;
  auto.paidWorkers = 1;
  state.agriculture.hiredWorkers = 1;
  state.month = 3;
  state.day = 1;
  state.agriculture.weather['290-spring'] = { yieldModifier: 1, label: '测试天气' };
  assert.equal(E.selectActivity(state, 'trade').ok, true);
  const beforeSown = Number(state.agriculture.work.sown || 0);
  E.setRunning(state, true);
  const result = E.advanceDay(state);
  assert.equal(result.ok, true);
  assert.ok(Number(state.agriculture.work.sown || 0) > beforeSown);
});

test('legacy manual-farming activity migrates to shortwork on load', async () => {
  const E = await currentEngine();
  const state = makeGame(E, 1654);
  state.currentActivity = { id: 'longfarm', kind: 'routine', elapsed: 0, duration: null, destination: null, charged: false };
  state.agriculture.work.assignments[state.playerId] = 'longfarm';
  const loaded = E.deserializeState(E.serializeState(state));
  assert.equal(loaded.currentActivity?.id, 'trade');
  assert.notEqual(loaded.agriculture.work.assignments[loaded.playerId], 'longfarm');
  assert.notEqual(loaded.agriculture.work.assignments[loaded.playerId], 'agriculture');
});

test('current page is V1.6.5 and explains work-only livelihood', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(index, /V1\.6\.5/);
  assert.match(index, /engine-v165\.js\?v=1\.6\.5/);
  assert.match(index, /春季80%.*0\.8钱/s);
  assert.match(index, /秋季85%.*0\.9钱/s);
  assert.match(index, /田地.*自动农工/s);
});
