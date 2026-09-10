import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const E = await import('../dist/engine-v15.js?v=1.5.1');

function game(seed = 1501) {
  const s = E.createGame({ surname: '沈', origin: 'peasant', seed });
  E.selectActivity(s, 'rest');
  return s;
}

test('marriage and child are no longer direct action cards', () => {
  const s = game();
  const ids = E.getActions(s).map(action => action.id);
  assert.ok(!ids.includes('marry'));
  assert.ok(!ids.includes('child'));
  assert.ok(ids.includes('longfarm'));
});

test('V1.5.1 matchmaker requires reputation 15 or household assets 120', () => {
  const poor = game(1510);
  poor.resources.reputation = 5;
  poor.resources.money = 45;
  const poorStatus = E.getMarriageMarketStatus(poor);
  assert.equal(poorStatus.eligible, false);
  assert.equal(poorStatus.reputationRequired, 15);
  assert.equal(poorStatus.assetRequired, 120);
  assert.equal(E.__v15Test.queueMatchmaker(poor, { bridePrice: 18 }), null);

  const reputable = game(1511);
  reputable.resources.reputation = 15;
  reputable.resources.money = 10;
  assert.equal(E.getMarriageMarketStatus(reputable).eligible, true);
  assert.ok(E.__v15Test.queueMatchmaker(reputable, { bridePrice: 18 }));

  const wealthy = game(1512);
  wealthy.resources.reputation = 0;
  // Peasant opening family property contains a 24-money thin-field asset.
  wealthy.resources.money = 96;
  const wealthyStatus = E.getMarriageMarketStatus(wealthy);
  assert.equal(wealthyStatus.assetValue, 120);
  assert.equal(wealthyStatus.eligible, true);
  assert.ok(E.__v15Test.queueMatchmaker(wealthy, { bridePrice: 18 }));
});

test('marriage market rises from ordinary to affluent to elite with reputation or assets', () => {
  const ordinary = game(1513);
  ordinary.resources.reputation = 15;
  ordinary.resources.money = 10;
  assert.equal(E.getMarriageMarketStatus(ordinary).band, 'ordinary');

  const affluent = game(1514);
  affluent.resources.reputation = 30;
  affluent.resources.money = 10;
  assert.equal(E.getMarriageMarketStatus(affluent).band, 'affluent');

  const elite = game(1515);
  elite.resources.reputation = 50;
  elite.resources.money = 10;
  assert.equal(E.getMarriageMarketStatus(elite).band, 'elite');

  const wealthyElite = game(1516);
  wealthyElite.resources.reputation = 0;
  wealthyElite.resources.money = 376;
  const status = E.getMarriageMarketStatus(wealthyElite);
  assert.equal(status.assetValue, 400);
  assert.equal(status.band, 'elite');

  const event = E.__v15Test.queueMatchmaker(wealthyElite, { bridePrice: 24 });
  assert.equal(event.familyData.candidate.marketBand, 'elite');
  assert.ok(event.familyData.candidate.profileTier >= 2);
});

test('matchmaker proposal pauses, charges bride price, and starts a 15-day wedding', () => {
  const s = game(1502);
  s.resources.money = 100;
  s.resources.reputation = 15;
  const event = E.__v15Test.queueMatchmaker(s, { bridePrice: 24, name: '李氏', age: 19, sex: '女' });
  assert.equal(s.pendingEvent.source, 'family-marriage');
  assert.match(event.text, /李氏/);
  assert.match(event.text, /24/);
  assert.equal(s.pendingEvent.options.find(o => o.id === 'accept').disabled, false);
  const before = s.resources.money;
  const accepted = E.resolveEvent(s, event.id, 'accept');
  assert.equal(accepted.ok, true);
  assert.equal(s.resources.money, before - 24);
  assert.equal(s.familyLife.wedding.remainingDays, 15);
  assert.equal(s.people[s.playerId].married, false);

  E.__v15Test.setWeddingDays(s, 1);
  s.rngState = 1;
  E.setRunning(s, true);
  const tick = E.advanceDay(s);
  assert.equal(tick.ok, true);
  const protagonist = s.people[s.rootId];
  assert.equal(protagonist.married, true);
  const spouse = s.people[protagonist.spouseId];
  assert.equal(spouse.name, '李氏');
  assert.equal(spouse.spouseId, protagonist.id);
  assert.equal(s.familyLife.wedding, null);
  assert.equal(s.relations[`${protagonist.id}:${spouse.id}`].type, '婚姻');
});

test('insufficient bride price disables acceptance and rejection starts a cooldown', () => {
  const s = game(1503);
  s.resources.reputation = 15;
  s.resources.money = 8;
  const event = E.__v15Test.queueMatchmaker(s, { bridePrice: 24 });
  assert.equal(event.options.find(o => o.id === 'accept').disabled, true);
  const rejected = E.resolveEvent(s, event.id, 'reject');
  assert.equal(rejected.ok, true);
  assert.ok(s.familyLife.matchmakerCooldownUntil > s.elapsedDays);
  assert.equal(s.people[s.playerId].married, false);
});

test('pregnancy is a random life event with care choices rather than a direct action', () => {
  const s = game(1504);
  E.__v15Test.makeMarriedCouple(s, { spouseName: '王氏', spouseAge: 20 });
  const event = E.__v15Test.queuePregnancy(s);
  assert.ok(event);
  assert.equal(event.source, 'family-pregnancy');
  assert.equal(s.running, false);
  assert.deepEqual(event.options.map(o => o.id), ['rest', 'normal', 'doctor']);
  const result = E.resolveEvent(s, event.id, 'rest');
  assert.equal(result.ok, true);
  assert.equal(s.familyLife.pregnancy.care, 'rest');
  const motherId = s.familyLife.pregnancy.motherId;
  const motherWork = E.getFamilyWorkAssignments(s).find(job => job.personId === motherId);
  assert.equal(motherWork.assignment, 'rest');
  assert.equal(motherWork.reason, 'pregnancy');
});

test('doctor pregnancy care costs money and reduces birth risk', () => {
  const s = game(1505);
  s.resources.money = 50;
  E.__v15Test.makeMarriedCouple(s, { spouseName: '赵氏', spouseAge: 22 });
  const event = E.__v15Test.queuePregnancy(s);
  const before = s.resources.money;
  const normalRisk = E.getPregnancyRisk(s);
  const result = E.resolveEvent(s, event.id, 'doctor');
  assert.equal(result.ok, true);
  assert.equal(s.resources.money, before - 8);
  assert.ok(E.getPregnancyRisk(s) < normalRisk);
});

test('pregnancy reaches a birth event and creates the child only when resolved', () => {
  const s = game(1506);
  E.__v15Test.makeMarriedCouple(s, { spouseName: '郭氏', spouseAge: 21 });
  const event = E.__v15Test.queuePregnancy(s);
  E.resolveEvent(s, event.id, 'normal');
  const beforeChildren = Object.values(s.people).filter(p => p.role === 'child').length;
  E.__v15Test.setPregnancyDays(s, 1);
  E.__v15Test.forceBirthOutcome(s, 'healthy');
  s.rngState = 1;
  E.setRunning(s, true);
  const tick = E.advanceDay(s);
  assert.equal(tick.ok, true);
  assert.equal(tick.paused, true);
  assert.equal(s.pendingEvent.source, 'family-birth');
  assert.match(s.pendingEvent.title, /临盆|添丁/);
  assert.equal(Object.values(s.people).filter(p => p.role === 'child').length, beforeChildren);
  const birth = s.pendingEvent;
  const resolved = E.resolveEvent(s, birth.id, 'welcome');
  assert.equal(resolved.ok, true);
  assert.equal(Object.values(s.people).filter(p => p.role === 'child').length, beforeChildren + 1);
  assert.equal(s.familyLife.pregnancy, null);
  const mother = s.people[birth.familyData.motherId];
  assert.ok(mother.birthCooldownDays >= 359);
});

test('V1.5.1 page and event UI expose marriage market progress and disabled paid choices', () => {
  const index = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const ui = fs.readFileSync(new URL('../dist/v15-ui.js', import.meta.url), 'utf8');
  assert.match(index, /V1\.5\.1/);
  assert.match(index, /engine-v15\.js\?v=1\.5\.1/);
  assert.match(ui, /option\.disabled/);
  assert.match(ui, /说媒资格/);
  assert.match(ui, /家产/);
});
