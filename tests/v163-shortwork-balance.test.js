import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v163.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'V1.6.3 current engine wrapper must exist');
  return import('../dist/engine-v163.js?v=1.6.3');
}

function game(E, seed = 1630) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  state.resources.grain = 1000;
  state.household.grain = 1000;
  state.resources.money = 100;
  state.household.money = 100;
  E.selectActivity(state, 'trade');
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

test('V1.6.3 shortwork uses seasonal job availability and lower day wages', async () => {
  const E = await currentEngine();
  assert.deepEqual(E.V163_SHORTWORK_TERMS.spring, { availability: 0.8, wage: 0.6 });
  assert.deepEqual(E.V163_SHORTWORK_TERMS.summer, { availability: 0.65, wage: 0.6 });
  assert.deepEqual(E.V163_SHORTWORK_TERMS.autumn, { availability: 0.85, wage: 0.7 });
  assert.deepEqual(E.V163_SHORTWORK_TERMS.winter, { availability: 0.45, wage: 0.5 });
});

test('shortwork availability is deterministic for a person and date and includes no-work days', async () => {
  const E = await currentEngine();
  const state = game(E, 1631);
  state.year = 290;
  state.month = 1;

  const first = E.isShortworkAvailable(state, state.playerId);
  assert.equal(E.isShortworkAvailable(state, state.playerId), first);
  assert.notEqual(findDay(E, state, 1, true), null, 'winter must still contain some days with work');
  assert.notEqual(findDay(E, state, 1, false), null, 'winter must contain days when no shortwork is found');
});

test('an available spring shortwork day pays only 0.6 money instead of the old 0.9', async () => {
  const E = await currentEngine();
  const state = game(E, 1632);
  state.year = 290;
  const day = findDay(E, state, 4, true);
  assert.notEqual(day, null);
  state.day = day;
  state.month = 4;

  const beforeMoney = state.resources.money;
  const beforeWorkIncome = E.ledger(state).workIncome;
  E.setRunning(state, true);
  const result = E.advanceDay(state);

  assert.equal(result.ok, true);
  assert.equal(Number((E.ledger(state).workIncome - beforeWorkIncome).toFixed(2)), 0.6);
  assert.equal(Number((state.resources.money - beforeMoney).toFixed(2)), 0.6);
});

test('a no-work shortwork day earns nothing and does not consume shortwork health', async () => {
  const E = await currentEngine();
  const state = game(E, 1633);
  state.year = 290;
  const day = findDay(E, state, 1, false);
  assert.notEqual(day, null);
  state.day = day;
  state.month = 1;
  state.people[state.playerId].health = 80;

  const beforeMoney = state.resources.money;
  const beforeHealth = state.people[state.playerId].health;
  const beforeWorkIncome = E.ledger(state).workIncome;
  E.setRunning(state, true);
  const result = E.advanceDay(state);

  assert.equal(result.ok, true);
  assert.equal(Number((E.ledger(state).workIncome - beforeWorkIncome).toFixed(2)), 0);
  assert.equal(Number((state.resources.money - beforeMoney).toFixed(2)), 0);
  assert.equal(state.people[state.playerId].health, beforeHealth);
});

test('a no-work day near the recovery threshold does not falsely force the worker into recovery', async () => {
  const E = await currentEngine();
  const state = game(E, 1634);
  state.year = 290;
  const day = findDay(E, state, 1, false);
  assert.notEqual(day, null);
  state.day = day;
  state.month = 1;
  state.people[state.playerId].health = 35.2;
  state.agriculture.work.recovering[state.playerId] = false;
  const beforeLogs = state.eventLog.length;

  E.setRunning(state, true);
  const result = E.advanceDay(state);

  assert.equal(result.ok, true);
  assert.equal(state.people[state.playerId].health, 35.2);
  assert.equal(state.agriculture.work.recovering[state.playerId], false);
  assert.equal(state.eventLog.slice(beforeLogs).some(entry => entry.title === '开始休养'), false);
});

test('current page keeps V1.6.3 seasonal availability while V1.6.5 raises wages', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(index, /V1\.6\.5/);
  assert.match(index, /engine-v165\.js\?v=1\.6\.5/);
  assert.match(index, /短工/);
  assert.match(index, /80%/);
  assert.match(index, /65%/);
  assert.match(index, /85%/);
  assert.match(index, /45%/);
  assert.match(index, /0\.8钱/);
  assert.match(index, /0\.9钱/);
});
