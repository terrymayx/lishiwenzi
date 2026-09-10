import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/engine-v14.js';

function make(month = 3) {
  const s = E.createGame({ seed: 88 });
  s.month = month; s.day = 1; s.resources.grain = 1000;
  for (const p of Object.values(s.people)) { p.age = 30; p.health = 78; p.hunger = 0; }
  for (const season of ['spring','summer','autumn']) s.agriculture.weather[`290-${season}`] = { yieldModifier: 1, label: '测试天气' };
  s.chapterSeen[1] = true;
  return s;
}
function member(s) { return Object.values(s.people).find(p => p.id !== s.playerId); }
function choose(s, id) { s.running = false; assert.equal(E.selectActivity(s, id).ok, true); }
function tick(s) {
  if (s.pendingEvent) {
    assert.ok(s.pendingEvent.options.some(o => E.resolveEvent(s, s.pendingEvent.id, o.id).ok));
  }
  assert.equal(E.advanceDay(s).ok, true);
}
function job(s, id = s.playerId) { return E.getFamilyWorkAssignments(s).find(j => j.personId === id); }

test('long-term farming is selectable, first, and does not become paid work in winter', () => {
  const s = make(1);
  assert.equal(E.getActions(s)[0].id, 'longfarm');
  choose(s, 'longfarm');
  s.running = false;
  assert.equal(E.setFamilyWorkAssignment(s, member(s).id, 'longfarm').ok, true);
  const money = s.resources.money;
  tick(s);
  assert.equal(s.resources.money, money);
  assert.equal(job(s).assignment, 'rest');
  assert.equal(job(s).planned, 'longfarm');
  assert.equal(s.people[s.playerId].health, 79.2);
});

test('shortwork pays once and consumes 0.35 health per actually worked day', () => {
  const s = make(); choose(s, 'trade');
  s.running = false; E.setFamilyWorkAssignment(s, member(s).id, 'study');
  const before = s.resources.money;
  tick(s);
  assert.equal(s.resources.money, E.round(before + .9));
  assert.equal(s.people[s.playerId].health, 77.65);
  assert.equal(member(s).health, 78);
});

test('spring farming costs 0.25 health and no wages on the completion day', () => {
  const s = make(); s.household.land = .3; choose(s, 'cultivate');
  const money = s.resources.money;
  tick(s);
  assert.equal(s.people[s.playerId].health, 77.75);
  assert.equal(member(s).health, 77.75);
  assert.equal(s.resources.money, money);
  assert.equal(job(s).assignment, 'shortwork');
  tick(s);
  assert.equal(s.resources.money, E.round(money + 1.8));
});

test('health 35 triggers unpaid rest, keeps original plan, resumes only at 60', () => {
  const s = make(); choose(s, 'trade');
  s.people[s.playerId].health = 35;
  s.running = false; E.setFamilyWorkAssignment(s, member(s).id, 'study');
  const before = s.resources.money;
  tick(s);
  assert.equal(s.resources.money, before);
  assert.equal(s.people[s.playerId].health, 36.2);
  assert.equal(s.currentActivity.id, 'trade');
  assert.equal(job(s).assignment, 'rest');
  const knowledge = s.people[s.playerId].skills.trade;
  for (let i = 0; i < 20; i++) tick(s);
  assert.ok(s.people[s.playerId].health >= 60);
  assert.equal(s.resources.money, before);
  assert.equal(s.people[s.playerId].skills.trade, knowledge);
  assert.equal(job(s).assignment, 'shortwork');
  tick(s);
  assert.equal(s.resources.money, E.round(before + .9));
  assert.equal(s.pendingEvent, null);
  assert.equal(s.running, true);
});

test('changing paid jobs and reloading cannot bypass a recovery break', () => {
  const s = make(); choose(s, 'trade'); s.people[s.playerId].health = 35; tick(s);
  s.running = false; choose(s, 'manage');
  const loaded = E.deserializeState(E.serializeState(s));
  assert.equal(loaded.running, false);
  assert.equal(job(loaded).assignment, 'rest');
  assert.equal(job(loaded).dailyIncome, 0);
});

test('manual rest and idle-farm rest recover 1.2 only when the full meal is available', () => {
  const s = make(); s.people[s.playerId].health = 50; choose(s, 'rest');
  const stock = s.resources.grain; tick(s);
  assert.equal(s.people[s.playerId].health, 51.2);
  assert.equal(s.resources.grain, E.round(stock - .7));
  const hungry = make(); choose(hungry, 'rest');
  hungry.resources.grain = 0; hungry.resources.money = 0;
  hungry.people[hungry.playerId].health = 50;
  tick(hungry);
  assert.ok(hungry.people[hungry.playerId].health <= 50);
  assert.ok(hungry.people[hungry.playerId].hunger > 0);
});

test('family homecraft uses its own 0.15 health cost; military keeps its original cost', () => {
  const s = make(); choose(s, 'enlist');
  s.running = false; E.setFamilyWorkAssignment(s, member(s).id, 'homecraft');
  tick(s);
  assert.ok(Math.abs(s.people[s.playerId].health - 77.975) < 1e-8);
  assert.equal(member(s).health, 77.85);
  assert.equal(s.agriculture.lastDailyWork.income, .6);
});

test('autumn actual harvesting costs 0.35 health and proceeds before eating', () => {
  const s = make(9); choose(s, 'longfarm');
  const w = E.ensureFamilyWork(s).work; w.sown = 2; w.tended = 2;
  tick(s);
  assert.equal(s.people[s.playerId].health, 77.65);
  assert.ok(s.agriculture.harvestedGrain > 0);
});

test('right-click assignment API changes protagonist main action, not another hidden paid job', () => {
  const s = make();
  assert.equal(E.setFamilyWorkAssignment(s, s.playerId, 'shortwork').ok, true);
  assert.equal(s.currentActivity.id, 'trade');
  assert.equal(E.setFamilyWorkAssignment(s, s.playerId, 'longfarm').ok, true);
  assert.equal(s.currentActivity.id, 'longfarm');
  const plan = s.currentActivity.id;
  assert.equal(E.setFamilyWorkAssignment(s, member(s).id, 'homecraft').ok, true);
  assert.equal(s.currentActivity.id, plan);
});

test('minors, dead people, pending events and running time reject work assignments', () => {
  const s = make(); const p = member(s); p.age = 12;
  assert.equal(E.setFamilyWorkAssignment(s,p.id,'shortwork').ok,false);
  assert.equal(E.setFamilyWorkAssignment(s,p.id,'longfarm').ok,false);
  assert.equal(E.setFamilyWorkAssignment(s,p.id,'study').ok,true);
  p.age=30;p.alive=false;assert.equal(E.setFamilyWorkAssignment(s,p.id,'rest').ok,false);
  p.alive=true;s.running=true;assert.equal(E.setFamilyWorkAssignment(s,p.id,'rest').ok,false);
  s.running=false;s.pendingEvent={id:'major'};assert.equal(E.setFamilyWorkAssignment(s,p.id,'rest').ok,false);
});

test('hired workers continue farming when both family members are resting', () => {
  const s = make(); E.hireFarmWorkers(s,1); choose(s,'rest');
  s.running=false;E.setFamilyWorkAssignment(s,member(s).id,'rest');
  tick(s);
  assert.ok(Math.abs(s.agriculture.work.sown-.15)<1e-8);
  assert.equal(s.agriculture.lastDailyWork.income,0);
});

test('new year clears crops but retains individual long-term farming and recovery state', () => {
  const s=make();choose(s,'longfarm');s.running=false;E.setFamilyWorkAssignment(s,member(s).id,'longfarm');
  s.people[s.playerId].health=35;tick(s);s.year=291;s.month=3;
  E.ensureFamilyWork(s);
  assert.equal(s.agriculture.work.sown,0);
  assert.equal(job(s).assignment,'rest');
  assert.equal(job(s,member(s).id).planned,'longfarm');
});

test('blocked day cannot pay wages, heal or cause work damage', () => {
  const s=make();choose(s,'trade');s.pendingEvent={id:'major'};
  const before=JSON.stringify(s);assert.equal(E.advanceDay(s).ok,false);assert.equal(JSON.stringify(s),before);
});

test('queries and choosing work while paused never settle health or wages', () => {
  const s=make();choose(s,'trade');s.people[s.playerId].health=35;
  E.ensureFamilyWork(s);const health=s.people[s.playerId].health,money=s.resources.money;
  for(let i=0;i<30;i++){E.getFamilyWorkAssignments(s);E.getHouseholdBudget(s);E.getFarmSummary(s);}
  assert.equal(s.people[s.playerId].health,health);assert.equal(s.resources.money,money);
  assert.equal(Boolean(s.agriculture.work.recovering[s.playerId]),false);
});

test('legacy no-farm-shortwork setting migrates to individual long-term farming', () => {
  const s=make();choose(s,'cultivate');
  delete s.agriculture.work.policyVersion;s.agriculture.work.autoShortwork=false;
  const t=E.deserializeState(E.serializeState(s));
  assert.equal(t.currentActivity.id,'longfarm');
  assert.equal(t.agriculture.work.assignments[member(t).id],'longfarm');
});

test('rest cannot avert a starvation ending without food', () => {
  const s=make();choose(s,'rest');s.running=false;E.setFamilyWorkAssignment(s,member(s).id,'rest');
  s.resources.grain=0;s.resources.money=0;
  for(let i=0;i<7&&s.phase==='playing';i++)tick(s);
  assert.equal(s.phase,'ended');assert.equal(s.ending.type,'starvation');
  assert.equal(s.pendingSuccession,false);assert.equal(s.running,false);
});

for(const route of ['one-worker-landless','two-mixed-two-mu','farmer-and-worker']){
 test(`365-day work/rest economy remains viable with explicit normal weather: ${route}`,()=>{
  const s=E.createGame({seed:88});s.household.land=route==='one-worker-landless'?0:2;
  const other=member(s);
  E.setFamilyWorkAssignment(s,other.id,route==='one-worker-landless'?'study':route==='farmer-and-worker'?'shortwork':'agriculture');
  E.selectActivity(s,route==='one-worker-landless'?'trade':route==='farmer-and-worker'?'longfarm':'cultivate');
  E.setAutoBuy(s,true,0);
  for(const season of ['spring','summer','autumn'])s.agriculture.weather[`290-${season}`]={yieldModifier:1,label:'测试天气'};
  let restingDays=0;
  for(let d=0;d<365;d++){
   if(job(s).assignment==='rest')restingDays++;
   tick(s);assert.equal(s.phase,'playing');
  }
  const a=s.economy.years[290];
  assert.equal(a.days,365);
  assert.ok(Math.abs(s.resources.money-(a.openingMoney+a.workIncome+a.saleIncome-a.buyCost-a.wages-a.investment+a.otherMoney))<.02);
  assert.ok(Math.abs(s.resources.grain-(a.openingGrain+a.harvest+a.bought-a.foodConsumed-a.sold+a.otherGrain))<.02);
  assert.ok(restingDays>0);
  if(route==='one-worker-landless')assert.ok(a.workIncome<365*.9);
  console.log('work/rest scenario',route,JSON.stringify({restingDays,workIncome:a.workIncome,harvest:a.harvest,money:s.resources.money,grain:s.resources.grain}));
 });
}
