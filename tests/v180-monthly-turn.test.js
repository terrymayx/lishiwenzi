import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v180.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'V1.8.0 monthly-turn engine must exist');
  return import('../dist/engine-v180.js?v=1.8.0');
}

function game(E, seed = 1800) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  state.resources.money = 10000;
  state.household.money = 10000;
  state.resources.grain = 10000;
  state.household.grain = 10000;
  state.chapterSeen[1] = true;
  state.pendingEvent = null;
  state.running = false;
  const selected = E.selectActivity(state, 'trade');
  assert.equal(selected.ok, true);
  return state;
}

function finishMonth(E, state, firstResult) {
  let result = firstResult;
  let guard = 0;
  while (!result.completedMonth && guard < 12) {
    guard += 1;
    if (state.pendingEvent) {
      const event = state.pendingEvent;
      const option = event.options?.[0];
      assert.ok(option, 'interrupting event should have a resolvable option');
      const resolved = E.resolveEvent(state, event.id, option.id);
      assert.equal(resolved.ok, true);
    }
    result = E.advanceMonth(state);
  }
  return result;
}

test('advanceMonth simulates daily rules until the next calendar month', async () => {
  const E = await currentEngine();
  const state = game(E, 1801);
  const beforeFood = state.resources.grain;
  const result = finishMonth(E, state, E.advanceMonth(state));

  assert.equal(result.ok, true);
  assert.equal(result.completedMonth, true);
  assert.equal(state.year, 290);
  assert.equal(state.month, 2);
  assert.equal(state.day, 1);
  assert.equal(state.running, false);
  assert.ok(result.report.daysAdvanced >= 28 && result.report.daysAdvanced <= 31);
  assert.ok(state.resources.grain < beforeFood, 'daily food consumption should still happen inside the monthly turn');
});

test('a blocking event interrupts the month and the same turn can continue after resolution', async () => {
  const E = await currentEngine();
  const state = game(E, 1802);
  E.__test.queueRandomEvent(state, 0);

  const blocked = E.advanceMonth(state);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.interrupted, true);
  assert.equal(blocked.completedMonth, false);
  assert.equal(E.getMonthTurnStatus(state).active, false, 'a pre-existing decision must be handled before a month begins');

  const event = state.pendingEvent;
  assert.ok(event);
  assert.equal(E.resolveEvent(state, event.id, event.options[0].id).ok, true);

  const started = E.advanceMonth(state);
  if (!started.completedMonth) {
    assert.equal(E.getMonthTurnStatus(state).active, true, 'an in-month interruption must preserve the original month target');
  }
  const finished = finishMonth(E, state, started);
  assert.equal(finished.completedMonth, true);
  assert.equal(state.month, 2);
  assert.equal(state.day, 1);
});

test('monthly report keeps resource and person changes for the finished turn', async () => {
  const E = await currentEngine();
  const state = game(E, 1803);
  const beforeMoney = state.resources.money;
  const beforeGrain = state.resources.grain;
  const result = finishMonth(E, state, E.advanceMonth(state));
  const report = result.report;

  assert.equal(report.start.year, 290);
  assert.equal(report.start.month, 1);
  assert.equal(report.end.month, 2);
  assert.equal(report.end.day, 1);
  assert.equal(report.resources.money.before, beforeMoney);
  assert.equal(report.resources.money.after, state.resources.money);
  assert.equal(report.resources.grain.before, beforeGrain);
  assert.equal(report.resources.grain.after, state.resources.grain);
  assert.equal(report.player.name, state.people[state.playerId].name);
  assert.ok(Array.isArray(report.events));
});

test('V1.8.0 page exposes one monthly-turn button and removes continuous-time controls', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const game = fs.readFileSync(new URL('../dist/game.js', import.meta.url), 'utf8');

  assert.match(index, /V1\.8\.0/);
  assert.match(index, /度过本月/);
  assert.match(index, /月报/);
  assert.doesNotMatch(index, /id="pause-time"/);
  assert.doesNotMatch(index, /id="speed"/);
  assert.match(game, /advanceMonth/);
  assert.doesNotMatch(game, /setInterval\(stepOneDay/);
});
