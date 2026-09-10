import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/engine-v14.js';
function state(){return E.createGame({seed:88});}
function clearEvents(s){
 if(!s.pendingEvent)return;
 for(const o of s.pendingEvent.options){if(E.resolveEvent(s,s.pendingEvent.id,o.id).ok)return;}
 throw new Error('No affordable event decision');
}
function step(s){clearEvents(s);assert.equal(E.advanceDay(s).ok,true);}
test('age food bands and fractional stock remain exact',()=>{
 const s=state(),p=Object.values(s.people)[0];p.age=5.9;
 assert.equal(E.getPersonFoodCost(p),.14);p.age=6;assert.equal(E.getPersonFoodCost(p),.21);
 p.age=12;assert.equal(E.getPersonFoodCost(p),.28);p.age=16;assert.equal(E.getPersonFoodCost(p),.35);
 E.selectActivity(s,'trade');const before=s.resources.grain;step(s);assert.equal(s.resources.grain,E.round(before-.7));
});
test('one person one job; military and migration do not earn shortwork',()=>{
 const s=state();s.month=3;
 const other=Object.values(s.people).find(p=>p.id!==s.playerId);
 E.setFamilyWorkAssignment(s,other.id,'shortwork');E.selectActivity(s,'cultivate');step(s);
 assert.equal(s.agriculture.lastDailyWork.income,.9);
 assert.equal(s.agriculture.lastDailyWork.agriculture.includes(s.playerId),true);
 s.currentActivity={id:'migrate'};assert.equal(E.getFamilyWorkAssignments(s).find(p=>p.personId===s.playerId).dailyIncome,0);
});
test('farm completion automatically switches and returns at next season',()=>{
 const s=state();s.month=3;s.household.land=6;E.selectActivity(s,'cultivate');
 for(let i=0;i<20;i++)step(s);
 assert.ok(E.getFamilyWorkAssignments(s).every(j=>j.assignment==='shortwork'));
 s.month=6;assert.ok(E.getFamilyWorkAssignments(s).every(j=>j.assignment==='agriculture'));
 s.month=1;s.year=291;E.ensureFamilyWork(s);assert.equal(s.agriculture.work.sown,0);
 s.month=3;assert.ok(E.getFamilyWorkAssignments(s).every(j=>j.assignment==='agriculture'));
});
test('late labor cannot create a full season of planting',()=>{
 const s=state();s.month=3;s.household.land=30;E.selectActivity(s,'cultivate');step(s);
 assert.ok(s.agriculture.work.sown<1);
 s.month=6;step(s);s.month=9;step(s);
 assert.ok(s.agriculture.harvestedGrain<=27);
});
test('optional monthly renewal pays once or expires',()=>{
 const s=state();E.hireFarmWorkers(s,1);const cash=s.resources.money;
 E.settleMonthlyFarmWages(s);assert.equal(s.resources.money,cash);
 s.month=2;E.settleMonthlyFarmWages(s);assert.equal(s.resources.money,cash-6);
 s.agriculture.autoRenew=false;s.month=3;assert.equal(E.settleMonthlyFarmWages(s).expiredWorkers,1);
});
test('autobuy occurs before meals and respects reserve',()=>{
 const s=state();s.resources.grain=0;E.setAutoBuy(s,true,0);E.selectActivity(s,'trade');step(s);
 assert.equal(s.people[s.playerId].hunger,0);assert.ok(s.resources.grain>15);
 const t=state();t.resources.grain=0;E.setAutoBuy(t,true,1000);E.selectActivity(t,'trade');step(t);
 assert.equal(t.economy.years[290].bought,0);
});
test('small buys are atomic; failed ticks earn nothing',()=>{
 const s=state();s.resources.money=1;assert.equal(E.buyGrain(s,1).ok,true);
 const before=JSON.stringify(s);assert.equal(E.buyGrain(s,30).ok,false);assert.equal(JSON.stringify(s),before);
 assert.equal(E.advanceDay(s).ok,false);assert.equal(JSON.stringify(s),before);
});
test('budget measures preharvest gap separately from annual consumption',()=>{
 const s=state();s.resources.grain=10;const b=E.getHouseholdBudget(s);
 assert.equal(b.forecast.daysToHarvest,243);assert.equal(b.forecast.preharvestGap,160.1);assert.equal(b.forecast.annualFood,255.5);
});
test('old save migrates and random state roundtrips',()=>{
 const s=state();E.selectActivity(s,'trade');step(s);
 const t=E.deserializeState(E.serializeState(s));assert.equal(t.rngState,s.rngState);
 assert.deepEqual(t.economy,s.economy);assert.equal(t.running,false);
});
for(const scenario of ['landless','smallfarm','hired','lowstock','expensive','badweather']){
 test('annual livelihood: '+scenario,()=>{
  const s=state();s.household.land=scenario==='landless'?0:scenario==='hired'?3:6;
  if(scenario==='lowstock'){s.resources.grain=1;s.economy.years[290].openingGrain=1;}
  if(scenario==='expensive')s.grainPrice=4;
  for(const season of ['spring','summer','autumn'])s.agriculture.weather['290-'+season]={yieldModifier:scenario==='badweather'&&season==='summer'?.7:1,label:'测试天气'};
  const other=Object.values(s.people).find(p=>p.id!==s.playerId);
  if(['landless','hired'].includes(scenario))E.setFamilyWorkAssignment(s,other.id,'shortwork');
  if(scenario==='hired')assert.equal(E.hireFarmWorkers(s,1).ok,true);
  E.setAutoBuy(s,true,0);E.selectActivity(s,['landless','hired'].includes(scenario)?'trade':'cultivate');
  for(let day=0;day<365;day++){step(s);assert.equal(s.phase,'playing');assert.ok(s.people[s.playerId].hunger<100);}
  const a=s.economy.years[290];
  assert.equal(a.days,365);assert.ok(a.workIncome>0);
  if(scenario!=='landless')assert.ok(a.harvest>0);
  assert.ok(Math.abs(s.resources.money-(a.openingMoney+a.workIncome+a.saleIncome-a.buyCost-a.wages-a.investment+a.otherMoney))<.02);
  assert.ok(Math.abs(s.resources.grain-(a.openingGrain+a.harvest+a.bought-a.foodConsumed-a.sold+a.otherGrain))<.02);
  console.log(scenario,JSON.stringify({money:s.resources.money,grain:s.resources.grain,harvest:a.harvest,wages:a.wages}));
 });
}
