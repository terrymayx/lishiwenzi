import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v182.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'V1.8.2 engine wrapper must exist');
  return import('../dist/engine-v182.js?v=1.8.2-early-guide-test');
}

function game(E, seed = 1820) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  state.chapterSeen[1] = true;
  state.pendingEvent = null;
  state.running = false;
  state.phase = 'playing';
  return state;
}

function setCash(state, amount) {
  state.resources.money = amount;
  state.household.money = amount;
}

test('V1.8.2 lowers only the first four cash thresholds', async () => {
  const E = await currentEngine();
  assert.deepEqual(
    {
      landPurchase: E.V181_GUIDE_CASH_THRESHOLDS.landPurchase,
      mill: E.V181_GUIDE_CASH_THRESHOLDS.mill,
      grainShop: E.V181_GUIDE_CASH_THRESHOLDS.grainShop,
      clothShop: E.V181_GUIDE_CASH_THRESHOLDS.clothShop,
      oilPress: E.V181_GUIDE_CASH_THRESHOLDS.oilPress
    },
    {
      landPurchase: 40,
      mill: 100,
      grainShop: 220,
      clothShop: 500,
      oilPress: 1000
    }
  );
});

test('lowered early thresholds really enable the current guide purchase instead of the old locks', async () => {
  const E = await currentEngine();
  const state = game(E, 1822);

  setCash(state, 39);
  assert.equal(E.getV174GuideStatus(state).current.thresholdReady, false);
  setCash(state, 40);
  assert.equal(E.getV174GuideStatus(state).current.thresholdReady, true);
  const land = E.buyLand(state, 1);
  assert.equal(land.ok, true, '40 cash should be enough to clear the new land guide gate when the actual land price is affordable');
  assert.equal(E.getV174GuideStatus(state).current.id, 'mill');

  state.household.land = 3;
  state.resources.land = 3;
  setCash(state, 119);
  assert.equal(E.getV174GuideStatus(state).current.thresholdReady, true, 'mill guide gate should be ready from 100 cash plus 3 mu');
  const short = E.buyBusiness(state, 'mill');
  assert.equal(short.ok, false, 'the real 120-money build cost still applies after the guide gate is met');

  setCash(state, 120);
  const mill = E.buyBusiness(state, 'mill');
  assert.equal(mill.ok, true, 'the old 180-money unlock must not block a 120-money mill build in V1.8.2');
  assert.equal(E.getV174GuideStatus(state).current.id, 'grainShop');
});

test('the first five monthly turns expose ordered onboarding hints and turn six has none', async () => {
  const E = await currentEngine();
  assert.equal(typeof E.getEarlyGuideHint, 'function');
  const state = game(E, 1821);

  const expected = [
    ['先谋生', /短工|现金|粮/],
    ['置办新田', /置办|40钱|真实购买/],
    ['田庄产粮', /母亲|3亩|粮食/],
    ['第一份产业', /磨坊|被动|收入/],
    ['产业扩张', /粮铺|产业|收入/]
  ];

  for (let index = 0; index < expected.length; index += 1) {
    state.v180MonthTurn.turn = index;
    state.v180MonthTurn.active = false;
    const hint = E.getEarlyGuideHint(state);
    assert.ok(hint, `turn ${index + 1} should have a hint`);
    assert.equal(hint.turn, index + 1);
    assert.equal(hint.title, expected[index][0]);
    assert.match(`${hint.text} ${hint.detail || ''}`, expected[index][1]);
  }

  state.v180MonthTurn.turn = 5;
  state.v180MonthTurn.active = false;
  assert.equal(E.getEarlyGuideHint(state), null, 'fixed onboarding should end after five turns');
});

test('V1.8.2 page publishes the early-guide version and renders a dedicated hint card', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const ui = fs.readFileSync(new URL('../dist/v182-ui.js', import.meta.url), 'utf8');

  assert.match(index, /V1\.8\.2/);
  assert.match(index, /engine-v182\.js\?v=1\.8\.2/);
  assert.match(index, /game\.js\?v=1\.8\.2/);
  assert.match(index, /v180-ui\.js\?v=1\.8\.2/);
  assert.match(index, /v182-ui\.js\?v=1\.8\.2/);
  assert.match(ui, /getEarlyGuideHint/);
  assert.match(ui, /v182-early-guide/);
});
