import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const E = await import('../dist/engine-v16.js?v=1.6.0');

function game(seed = 1600) {
  const s = E.createGame({ surname: '沈', origin: 'peasant', seed });
  E.selectActivity(s, 'rest');
  return s;
}

test('V1.6.0 exposes the three fixed-price passive businesses', () => {
  assert.deepEqual(Object.keys(E.V160_BUSINESSES), ['grainShop', 'clothShop', 'caravan']);
  assert.deepEqual(E.V160_BUSINESSES.grainShop, { id: 'grainShop', label: '粮铺', price: 180, dailyIncome: 0.7 });
  assert.deepEqual(E.V160_BUSINESSES.clothShop, { id: 'clothShop', label: '布庄', price: 300, dailyIncome: 1.2 });
  assert.deepEqual(E.V160_BUSINESSES.caravan, { id: 'caravan', label: '商队', price: 600, dailyIncome: 2.5 });
});

test('buying a business deducts cash, increments ownership and preserves total household assets at purchase time', () => {
  const s = game(1601);
  s.resources.money = 1000;
  const beforeAssets = E.getHouseholdAssetValue(s);
  const beforeInvestment = E.ledger(s).investment;
  const result = E.buyBusiness(s, 'grainShop');
  assert.equal(result.ok, true);
  assert.equal(s.resources.money, 820);
  assert.equal(E.getIndustrySummary(s).businesses.grainShop.count, 1);
  assert.equal(E.getHouseholdAssetValue(s), beforeAssets);
  assert.equal(E.ledger(s).investment - beforeInvestment, 180);
  const asset = s.assets.find(item => item.businessType === 'grainShop');
  assert.equal(asset.value, 180);
  assert.equal(asset.units, 1);
});

test('repeated purchases aggregate the business asset instead of creating endless rows', () => {
  const s = game(1602);
  s.resources.money = 1000;
  assert.equal(E.buyBusiness(s, 'grainShop').ok, true);
  assert.equal(E.buyBusiness(s, 'grainShop').ok, true);
  assert.equal(E.getIndustrySummary(s).businesses.grainShop.count, 2);
  const assets = s.assets.filter(item => item.businessType === 'grainShop');
  assert.equal(assets.length, 1);
  assert.equal(assets[0].units, 2);
  assert.equal(assets[0].value, 360);
});

test('business purchase rejects insufficient money, running time and invalid ids without mutation', () => {
  const s = game(1603);
  s.resources.money = 100;
  const before = JSON.stringify(s);
  assert.equal(E.buyBusiness(s, 'grainShop').ok, false);
  assert.equal(JSON.stringify(s), before);
  s.resources.money = 1000;
  E.setRunning(s, true);
  const money = s.resources.money;
  assert.equal(E.buyBusiness(s, 'clothShop').ok, false);
  assert.equal(s.resources.money, money);
  E.setRunning(s, false);
  assert.equal(E.buyBusiness(s, 'unknown').ok, false);
});

test('owned businesses add their passive income on top of the same normal day economy', () => {
  const s = game(1604);
  const control = game(1604);
  s.resources.money = 2000;
  control.resources.money = 2000;
  E.buyBusiness(s, 'grainShop');
  E.buyBusiness(s, 'clothShop');
  control.resources.money = s.resources.money;
  control.household.money = s.household.money;

  E.setRunning(s, true);
  E.setRunning(control, true);
  const tick = E.advanceDay(s);
  const controlTick = E.advanceDay(control);

  assert.equal(tick.ok, true);
  assert.equal(controlTick.ok, true);
  assert.equal(Number((s.resources.money - control.resources.money).toFixed(1)), 1.9);
  assert.equal(Number((E.ledger(s).otherMoney - E.ledger(control).otherMoney).toFixed(1)), 1.9);
  assert.equal(E.getIndustrySummary(s).dailyIncome, 1.9);
  assert.equal(s.industry.lastDailyIncome, 1.9);
});

test('a pending decision blocks the day and cannot mint passive income', () => {
  const s = game(1605);
  s.resources.money = 1000;
  E.buyBusiness(s, 'grainShop');
  s.pendingEvent = { id: 'major' };
  const before = s.resources.money;
  const elapsed = s.elapsedDays;
  const tick = E.advanceDay(s);
  assert.equal(tick.ok, false);
  assert.equal(s.elapsedDays, elapsed);
  assert.equal(s.resources.money, before);
});

test('old V1.5.3 saves migrate with zero industries', async () => {
  const Base = await import('../dist/engine-v151.js?v=1.5.3');
  const old = Base.createGame({ surname: '沈', origin: 'peasant', seed: 1606 });
  delete old.industry;
  const loaded = E.deserializeState(Base.serializeState(old));
  assert.equal(E.getIndustrySummary(loaded).dailyIncome, 0);
  assert.deepEqual(loaded.industry.businesses, { grainShop: 0, clothShop: 0, caravan: 0 });
});

test('V1.6.1 page keeps V1.6.0 passive business management and routes through the current engine', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const gameUi = fs.readFileSync(new URL('../dist/game.js', import.meta.url), 'utf8');
  assert.match(index, /V1\.6\.1/);
  assert.match(index, /engine-v161\.js\?v=1\.6\.1/);
  assert.match(index, /v160\.css\?v=1\.6\.0/);
  assert.match(gameUi, /商业产业/);
  assert.match(gameUi, /产业总收入/);
  assert.match(gameUi, /buyBusiness/);
  assert.match(gameUi, /getIndustrySummary/);
});
