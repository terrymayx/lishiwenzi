import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v168.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'V1.6.8 stamina/health engine must exist');
  return import('../dist/engine-v168.js?v=1.6.8');
}

function game(E, seed = 1680) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  state.chapterSeen[1] = true;
  state.resources.grain = 1000;
  state.household.grain = 1000;
  return state;
}

test('V1.6.8 converts the old work-health value into stamina and starts real health at 100', async () => {
  const E = await currentEngine();
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed: 1681 });
  const protagonist = state.people[state.playerId];
  const mother = Object.values(state.people).find(person => person.role === 'mother');

  assert.equal(protagonist.stamina, 78);
  assert.equal(protagonist.health, 100);
  assert.equal(mother.stamina, 62);
  assert.equal(mother.health, 100);
  assert.equal(state.resources.stamina, 78);
  assert.equal(state.resources.health, 100);
  assert.equal(state.vitals.version, 168);
});

test('rest restores stamina but does not directly restore real health', async () => {
  const E = await currentEngine();
  const state = game(E, 1682);
  const person = state.people[state.playerId];
  person.stamina = 40;
  person.health = 55;
  assert.equal(E.selectActivity(state, 'rest').ok, true);

  E.setRunning(state, true);
  const result = E.advanceDay(state);

  assert.equal(result.ok, true);
  assert.equal(person.stamina, 41.2);
  assert.equal(person.health, 55);
});

test('an actual shortwork day consumes stamina instead of real health', async () => {
  const E = await currentEngine();
  const state = game(E, 1683);
  const person = state.people[state.playerId];
  person.stamina = 80;
  person.health = 90;
  assert.equal(E.selectActivity(state, 'trade').ok, true);

  state.year = 290;
  state.month = 4;
  let found = null;
  for (let day = 1; day <= E.MONTH_DAYS[3]; day += 1) {
    state.day = day;
    if (E.isShortworkAvailable(state, state.playerId)) { found = day; break; }
  }
  assert.notEqual(found, null);
  state.day = found;

  E.setRunning(state, true);
  const result = E.advanceDay(state);

  assert.equal(result.ok, true);
  assert.equal(Number(person.stamina.toFixed(2)), 79.65);
  assert.equal(person.health, 90);
});

test('hunger reaching 100 no longer directly kills the protagonist; it damages health instead', async () => {
  const E = await currentEngine();
  const state = game(E, 1684);
  const person = state.people[state.playerId];
  person.hunger = 95;
  person.health = 100;
  state.resources.grain = 0;
  state.household.grain = 0;
  state.resources.money = 0;
  state.household.money = 0;
  assert.equal(E.selectActivity(state, 'trade').ok, true);

  E.setRunning(state, true);
  const result = E.advanceDay(state);

  assert.equal(result.ok, true);
  assert.equal(person.hunger, 100);
  assert.equal(person.alive, true);
  assert.notEqual(state.phase, 'ended');
  assert.ok(person.health < 100);
});

test('health death probability follows the approved danger bands', async () => {
  const E = await currentEngine();
  assert.equal(E.getHealthDeathChance(100), 0);
  assert.equal(E.getHealthDeathChance(70), 0);
  assert.equal(E.getHealthDeathChance(69), 0.0002);
  assert.equal(E.getHealthDeathChance(40), 0.0002);
  assert.equal(E.getHealthDeathChance(39), 0.0015);
  assert.equal(E.getHealthDeathChance(20), 0.0015);
  assert.equal(E.getHealthDeathChance(19), 0.005);
  assert.equal(E.getHealthDeathChance(10), 0.005);
  assert.equal(E.getHealthDeathChance(9), 0.02);
  assert.equal(E.getHealthDeathChance(1), 0.02);
  assert.equal(E.getHealthDeathChance(0), 1);
});

test('very low health can deterministically kill a person on a daily mortality roll', async () => {
  const E = await currentEngine();
  const state = game(E, 1685);
  const person = state.people[state.playerId];
  person.health = 9;
  state.rngState = 1972;
  assert.equal(E.selectActivity(state, 'rest').ok, true);

  E.setRunning(state, true);
  const result = E.advanceDay(state);

  assert.equal(result.ok, true);
  assert.equal(result.paused, true);
  assert.equal(person.alive, false);
  assert.match(state.pauseReason, /健康|离世|接续/);
});

test('loading a V1.6.7 save maps old health to stamina and grants 100 real health', async () => {
  const E = await currentEngine();
  const Old = await import('../dist/engine-v167.js?v=1.6.7');
  const old = Old.createGame({ surname: '沈', origin: 'peasant', seed: 1686 });
  old.people[old.playerId].health = 43;
  const loaded = E.deserializeState(Old.serializeState(old));
  assert.equal(loaded.people[loaded.playerId].stamina, 43);
  assert.equal(loaded.people[loaded.playerId].health, 100);
});

test('current page shows separate stamina and health values and routes through V1.6.8', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(index, /V1\.6\.8/);
  assert.match(index, /engine-v168\.js\?v=1\.6\.8/);
  assert.match(index, /<span>体力<\/span>/);
  assert.match(index, /id="stamina"/);
  assert.match(index, /<span>健康<\/span>/);
  assert.match(index, /id="health"/);
  assert.match(index, /健康越低|死亡概率|死亡风险/);
});
