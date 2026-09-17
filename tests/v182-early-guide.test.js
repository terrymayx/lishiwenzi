import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v180.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'current monthly-turn engine must exist');
  return import('../dist/engine-v180.js?v=1.8.2-early-guide-test');
}

function game(E, seed = 1820) {
  const state = E.createGame({ surname: '沈', origin: 'peasant', seed });
  state.chapterSeen[1] = true;
  state.pendingEvent = null;
  state.running = false;
  state.phase = 'playing';
  return state;
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

test('the first five monthly turns expose ordered onboarding hints and turn six has none', async () => {
  const E = await currentEngine();
  assert.equal(typeof E.getEarlyGuideHint, 'function');
  const state = game(E, 1821);

  const expected = [
    ['先谋生', /短工|现金|粮/],
    ['置办新田', /置办|40钱|真实购买/],
    ['田庄产粮', /母亲|3亩|产粮/],
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
  const ui = fs.readFileSync(new URL('../dist/v180-ui.js', import.meta.url), 'utf8');

  assert.match(index, /V1\.8\.2/);
  assert.match(index, /engine-v180\.js\?v=1\.8\.2/);
  assert.match(index, /game\.js\?v=1\.8\.2/);
  assert.match(index, /v180-ui\.js\?v=1\.8\.2/);
  assert.match(ui, /getEarlyGuideHint/);
  assert.match(ui, /v182-early-guide/);
});
