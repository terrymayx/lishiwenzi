import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const enginePath = new URL('../dist/engine-v162.js', import.meta.url);

async function currentEngine() {
  assert.ok(fs.existsSync(enginePath), 'V1.6.2 current engine wrapper must exist');
  return import('../dist/engine-v162.js?v=1.6.2');
}

function game(E, seed = 1620) {
  const s = E.createGame({ surname: '沈', origin: 'peasant', seed });
  E.selectActivity(s, 'rest');
  return s;
}

test('V1.6.2 automatically requires one farm worker for every three mu with no 30-worker cap', async () => {
  const E = await currentEngine();
  const s = game(E);
  s.household.land = 100;
  s.resources.land = 100;
  const summary = E.getFarmSummary(s);

  assert.equal(summary.requiredWorkers, 34);
  assert.equal(summary.requiredMonthlyWage, 204);
  assert.equal(summary.workerAcres, 3);
  assert.equal(summary.hasWorkerCap, false);
});

test('more than 30 automatic workers can actually work a 100-mu farm', async () => {
  const E = await currentEngine();
  const s = game(E, 1625);
  s.household.land = 100;
  s.resources.land = 100;
  s.resources.grain = 5000;
  s.household.grain = 5000;
  s.year = 290;
  s.month = 3;
  s.day = 1;
  const auto = E.ensureAutoFarmWorkers(s);
  auto.requiredWorkers = 34;
  auto.paidWorkers = 34;
  auto.lastPayrollMonthKey = '290-3';
  for (const person of Object.values(s.people)) person.health = 20;

  for (let i = 0; i < 20; i += 1) {
    E.setRunning(s, true);
    const tick = E.advanceDay(s);
    assert.equal(tick.ok, true);
    if (s.pendingEvent) throw new Error(`unexpected blocking event: ${s.pendingEvent.title || s.pendingEvent.id}`);
  }

  assert.ok(s.agriculture.work.sown >= 99.9, `expected automatic workers to cover about 100 mu, got ${s.agriculture.work.sown}`);
});

test('buying land across a three-mu threshold automatically pays the new worker first-month wage', async () => {
  const E = await currentEngine();
  const s = game(E, 1621);
  s.household.land = 3;
  s.resources.land = 3;
  s.resources.money = 1000;
  s.household.money = 1000;
  E.ensureAutoFarmWorkers(s);

  const quote = E.getLandPurchaseQuote(s, 1);
  assert.equal(quote.landCost, 35);
  assert.equal(quote.newWorkers, 1);
  assert.equal(quote.workerWage, 6);
  assert.equal(quote.totalCost, 41);

  const before = s.resources.money;
  const result = E.buyLand(s, 1);
  assert.equal(result.ok, true);
  assert.equal(s.household.land, 4);
  assert.equal(Number((before - s.resources.money).toFixed(1)), 41);
  assert.equal(E.getFarmSummary(s).requiredWorkers, 2);
  assert.equal(E.getFarmSummary(s).paidWorkers, 2);
});

test('land purchase is rejected when cash covers the land but not the newly required worker wage', async () => {
  const E = await currentEngine();
  const s = game(E, 1622);
  s.household.land = 3;
  s.resources.land = 3;
  s.resources.money = 35;
  s.household.money = 35;
  E.ensureAutoFarmWorkers(s);

  const before = JSON.stringify(s);
  const result = E.buyLand(s, 1);
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(s), before);
});

test('monthly payroll automatically pays as many required workers as cash allows and retries next month', async () => {
  const E = await currentEngine();
  const s = game(E, 1623);
  s.household.land = 7;
  s.resources.land = 7;
  E.ensureAutoFarmWorkers(s);

  s.year = 290;
  s.month = 1;
  s.day = 31;
  s.resources.money = 13;
  s.household.money = 13;
  s.agriculture.lastWageMonthKey = '290-1';
  const febWagesBefore = E.ledger(s).wages;
  E.setRunning(s, true);
  const feb = E.advanceDay(s);
  assert.equal(feb.ok, true);
  let summary = E.getFarmSummary(s);
  assert.equal(s.month, 2);
  assert.equal(s.day, 1);
  assert.equal(summary.requiredWorkers, 3);
  assert.equal(summary.paidWorkers, 2);
  assert.equal(summary.unpaidWorkers, 1);
  assert.equal(Number((E.ledger(s).wages - febWagesBefore).toFixed(1)), 12);
  assert.ok(s.resources.money >= 0, 'payroll must never make cash negative');

  s.day = 28;
  s.resources.money = 50;
  s.household.money = 50;
  const marWagesBefore = E.ledger(s).wages;
  E.setRunning(s, true);
  const mar = E.advanceDay(s);
  assert.equal(mar.ok, true);
  summary = E.getFarmSummary(s);
  assert.equal(s.month, 3);
  assert.equal(s.day, 1);
  assert.equal(summary.requiredWorkers, 3);
  assert.equal(summary.paidWorkers, 3);
  assert.equal(summary.unpaidWorkers, 0);
  assert.equal(Number((E.ledger(s).wages - marWagesBefore).toFixed(1)), 18);
  assert.ok(s.resources.money >= 0, 'next-month retry must also avoid negative cash');
});

test('manual hire and dismiss operations are disabled under automatic farm management', async () => {
  const E = await currentEngine();
  const s = game(E, 1624);
  assert.equal(E.hireFarmWorkers(s, 1).ok, false);
  assert.equal(E.dismissFarmWorkers(s, 1).ok, false);
  assert.match(E.hireFarmWorkers(s, 1).message, /自动|田产/);
});

test('V1.6.2 UI removes manual worker controls and presents automatic payroll', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const uiPath = new URL('../dist/v162-ui.js', import.meta.url);
  const cssPath = new URL('../dist/v162.css', import.meta.url);

  assert.match(index, /V1\.6\.2/);
  assert.match(index, /engine-v162\.js\?v=1\.6\.2/);
  assert.match(index, /v162-ui\.js\?v=1\.6\.2/);
  assert.ok(fs.existsSync(uiPath));
  assert.ok(fs.existsSync(cssPath));

  const ui = fs.readFileSync(uiPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(ui, /自动农工/);
  assert.match(ui, /每3亩/);
  assert.match(ui, /每月工资/);
  assert.doesNotMatch(ui, /雇工 \+1|雇工 \+3|解雇 1人/);
  assert.match(css, /grain-market-buy/);
  assert.match(css, /economy-panel/);
});
