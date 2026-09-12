import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const engine = () => import('../dist/engine-v165.js?v=1.6.5-test');

function makeGame(E, seed = 1650) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  state.pendingEvent = null;
  state.chapterSeen[1] = true;
  state.resources.grain = 10000;
  state.household.grain = 10000;
  state.resources.money = 1000;
  state.household.money = 1000;
  return state;
}

test('manual farming actions are removed and cannot be selected', async () => {
  const E = await engine();
  const state = makeGame(E, 1651);
  const ids = E.availableActivities(state).map(activity => activity.id);
  assert.doesNotMatch(ids.join(','), /longfarm|cultivate|farm/);
  assert.equal(E.selectActivity(state, 'longfarm').ok, false);
  assert.equal(E.selectActivity(state, 'cultivate').ok, false);
});

test('an available spring shortwork day now pays 0.8 money', async () => {
  const E = await engine();
  const state = makeGame(E, 1652);
  state.year = 290;
  state.month = 3;
  state.day = 1;
  const player = state.people[state.playerId];
  let date = null;
  for (let day = 1; day <= 31; day += 1) {
    state.day = day;
    if (E.getShortworkDay(state, player).available) {
      date = day;
      break;
    }
  }
  assert.ok(date);
  state.day = date;
  assert.equal(E.selectActivity(state, 'trade').ok, true);
  state.running = true;
  const before = state.resources.money;
  E.advanceDay(state);
  assert.equal(Number((state.resources.money - before).toFixed(2)), 0.8);
});

test('land remains operated by automatic farm workers while protagonist does shortwork', async () => {
  const E = await engine();
  const state = makeGame(E, 1653);
  state.resources.land = 6;
  state.household.land = 6;
  E.__v162Test.reconcileAutoFarmWorkers(state, { chargeNew: false });
  const beforeLand = state.resources.land;
  assert.equal(E.selectActivity(state, 'trade').ok, true);
  state.running = true;
  E.advanceDay(state);
  assert.equal(state.resources.land, beforeLand);
  assert.ok(E.getV162FarmSummary(state).requiredWorkers >= 1);
});

test('legacy manual-farming activity migrates to shortwork on load', async () => {
  const E = await engine();
  const state = makeGame(E, 1654);
  state.currentActivity = { id: 'longfarm', kind: 'routine', elapsed: 0, duration: null, destination: null, charged: false };
  state.agriculture.work.assignments[state.playerId] = 'longfarm';
  const loaded = E.deserializeState(E.serializeState(state));
  assert.equal(loaded.currentActivity?.id, 'trade');
  assert.notEqual(loaded.agriculture.work.assignments[loaded.playerId], 'longfarm');
  assert.notEqual(loaded.agriculture.work.assignments[loaded.playerId], 'agriculture');
});

test('current page preserves V1.6.5 work-only livelihood rules under later releases', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(index, /V1\.6\.7/);
  assert.match(index, /engine-v167\.js\?v=1\.6\.7/);
  assert.match(index, /春季80%概率找到活、0\.8钱\/实际工作日|春80%·0\.8钱\/工作日/);
  assert.match(index, /秋季85%·0\.9钱|秋85%·0\.9钱/);
  assert.match(index, /田地不需要本人下田，继续由自动农工打理|母亲务农属于家庭被动劳力|母亲健在时免费照看前3亩/);
});
