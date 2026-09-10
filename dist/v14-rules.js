import {getDailyFoodCost,getPersonFoodCost,MONTH_DAYS} from './engine.js?base=1.4.0';
import {V13_RULES as OLD,ensureAgriculture,getSeason,getSeasonLabel,getPersonFarmCapacity,rollSeasonWeather,resolveAgricultureEvent} from './v13-rules.js?v=1.3.1';
export {getDailyFoodCost,getPersonFoodCost,getSeason,getSeasonLabel,rollSeasonWeather,resolveAgricultureEvent};
export const V14_RULES=Object.freeze({...OLD,BASE_YIELD_PER_MU:90,SHORTWORK_DAILY_INCOME:0.9,FAMILY_ASSIGNMENTS:['agriculture','shortwork','homecraft','study','rest']});
export const round=n=>Math.round(n*100)/100||0;
const labels={agriculture:'务农',shortwork:'短工',homecraft:'家庭副业',study:'求学',rest:'休养',other:'当前事务'};
export const getAssignmentLabel=id=>labels[id]||id;
export function ensureFamilyWork(s){
 const ag=ensureAgriculture(s);ag.work??={};const w=ag.work;
 w.assignments??={};w.autoShortwork??=true;w.lastDailyWork??={};ag.autoRenew??=true;
 if(w.cropYear!==s.year){
  w.cropYear=s.year;w.sown=(ag.sownAcres||0)*Math.min(1,ag.springWorkDays/20);
  w.tended=(ag.tendedAcres||0)*Math.min(1,ag.summerWorkDays/20);
  w.harvested=w.tended*Math.min(1,ag.harvestWorkDays/5);
 }
 for(const p of Object.values(s.people||{}))if(p.alive&&p.familyId===s.family.id&&!V14_RULES.FAMILY_ASSIGNMENTS.includes(w.assignments[p.id]))w.assignments[p.id]=p.age<16?'study':'agriculture';
 return ag;
}
export function getShortworkIncome(p){return p?.alive&&p.age>=16&&p.age<=65&&p.health>20&&p.hunger<80?0.9:0;}
function planned(s,p){
 if(p.id===s.playerId&&s.currentActivity)return ({cultivate:'agriculture',trade:'shortwork',study:'study',rest:'rest',manage:'homecraft'})[s.currentActivity.id]||'other';
 return ensureFamilyWork(s).work.assignments[p.id];
}
function finished(s){
 const w=ensureFamilyWork(s).work,land=s.household.land,season=getSeason(s.month);
 return land<=0||season==='winter'||(season==='spring'?w.sown>=land-1e-8:season==='summer'?w.tended>=Math.min(land,w.sown)-1e-8:w.harvested>=Math.min(land,w.tended)-1e-8);
}
export function getFamilyWorkAssignments(s){
 const ag=ensureFamilyWork(s);
 return Object.values(s.people).filter(p=>p.alive&&p.familyId===s.family.id).map(p=>{
  const original=planned(s,p),assignment=original==='agriculture'&&ag.work.autoShortwork&&finished(s)?'shortwork':original;
  const income=getShortworkIncome(p)*(assignment==='shortwork'?1:assignment==='homecraft'?2/3:0);
  return {personId:p.id,name:p.name,age:p.age,planned:original,assignment,label:labels[assignment],farmCapacity:assignment==='agriculture'?getPersonFarmCapacity(p):0,dailyIncome:round(income),foodCost:getPersonFoodCost(p)};
 });
}
const manageable=s=>s&&s.phase==='playing'&&!s.endpoint&&!s.pendingEvent&&!s.running;
export function setFamilyWorkAssignment(s,id,job){
 if(!manageable(s)||!V14_RULES.FAMILY_ASSIGNMENTS.includes(job)||!s.people[id]?.alive||s.people[id].familyId!==s.family.id)return {ok:false,message:'请暂停时间，处理事件后安排本家成员。'};
 if(s.people[id].age<16&&!['study','rest'].includes(job))return {ok:false,message:'未成年成员仅安排求学或休养。'};
 ensureFamilyWork(s).work.assignments[id]=job;return {ok:true,message:'家庭分工已更新。'};
}
export function getFamilyFarmCapacity(s){return getFamilyWorkAssignments(s).reduce((n,p)=>n+p.farmCapacity,0);}
export function getTotalFarmCapacity(s){return getFamilyFarmCapacity(s)+ensureFamilyWork(s).hiredWorkers*3;}
function weather(s){return ['spring','summer','autumn'].reduce((n,k)=>n*(s.agriculture.weather[s.year+'-'+k]?.yieldModifier??1),1);}
export function getGrainSellPrice(s){return Math.round(Math.min(2.5,Math.max(.4,.55+(s.grainPrice-1)*.18))*10)/10;}
export function ledger(s){
 s.economy??={years:{}};s.economy.years??={};
 return s.economy.years[s.year]??={openingMoney:s.resources.money,openingGrain:s.resources.grain,days:0,workIncome:0,foodConsumed:0,harvest:0,buyCost:0,bought:0,saleIncome:0,sold:0,wages:0,investment:0,otherMoney:0,otherGrain:0};
}
export function sync(s){s.resources.money=round(Math.max(0,s.resources.money));s.resources.grain=round(Math.max(0,s.resources.grain));s.household.money=s.resources.money;s.household.grain=s.resources.grain;}
export function hireFarmWorkers(s,count=1){
 if(!manageable(s)||!Number.isInteger(count)||count<1)return {ok:false,message:'请暂停后雇工。'};
 const ag=ensureFamilyWork(s),cost=count*6;if(ag.hiredWorkers+count>30||s.resources.money<cost)return {ok:false,message:'人数超限或工钱不足。'};
 ledger(s).wages+=cost;s.resources.money-=cost;ag.hiredWorkers+=count;ag.lastWageMonthKey=s.year+'-'+s.month;sync(s);
 return {ok:true,cost,message:'已雇'+count+'人至本月末，工钱'+cost+'钱含食宿；可关闭下月续雇。'};
}
export function dismissFarmWorkers(s,count=1){if(!manageable(s)||!Number.isInteger(count)||count<1)return {ok:false};const ag=ensureFamilyWork(s);ag.hiredWorkers=Math.max(0,ag.hiredWorkers-count);return {ok:true,message:'农工已遣散，本月工资不退。'};}
export function settleMonthlyFarmWages(s){
 const ag=ensureFamilyWork(s),key=s.year+'-'+s.month;
 if(ag.lastWageMonthKey===key)return {charged:0,expiredWorkers:0};
 ag.lastWageMonthKey=key;const old=ag.hiredWorkers;ag.hiredWorkers=ag.autoRenew?Math.min(old,Math.floor(s.resources.money/6)):0;
 const charged=ag.hiredWorkers*6;ledger(s).wages+=charged;s.resources.money-=charged;sync(s);
 if(old>ag.hiredWorkers)s.eventLog.push({year:s.year,month:s.month,day:s.day,kind:'economy',title:'农工合同到期',text:(old-ag.hiredWorkers)+'名农工到期离开。'});
 return {charged,expiredWorkers:old-ag.hiredWorkers};
}
export function getFarmSummary(s){
 const ag=ensureFamilyWork(s),w=ag.work,land=s.household.land,capacity=getTotalFarmCapacity(s),familyCapacity=getFamilyFarmCapacity(s);
 return {season:getSeason(s.month),seasonLabel:getSeasonLabel(s.month),land,familyCapacity,hiredWorkers:ag.hiredWorkers,hiredCapacity:ag.hiredWorkers*3,totalCapacity:capacity,productiveAcres:Math.min(land,capacity),idleAcres:Math.max(0,land-capacity),springWorkDays:round(land?w.sown/land*20:0),summerWorkDays:round(w.sown?w.tended/w.sown*20:0),harvestWorkDays:round(w.tended?w.harvested/w.tended*5:0),expectedHarvest:round(w.tended*90*weather(s)),grainSellPrice:getGrainSellPrice(s),monthlyWages:ag.hiredWorkers*6,assignments:getFamilyWorkAssignments(s),autoShortwork:w.autoShortwork};
}
export function recordCultivationDay(s){
 const ag=ensureFamilyWork(s),w=ag.work,season=getSeason(s.month),capacity=getTotalFarmCapacity(s),land=s.household.land;
 if(!capacity||!land||season==='winter')return {grainHarvested:0,season};
 if(season==='spring')w.sown=Math.min(land,w.sown+capacity/20);
 if(season==='summer')w.tended=Math.min(land,w.sown,w.tended+capacity/20);
 let grainHarvested=0;
 if(season==='autumn'){
  const area=Math.max(0,Math.min(capacity/5,Math.min(land,w.tended)-w.harvested));
  w.harvested+=area;grainHarvested=round(area*90*weather(s));s.resources.grain+=grainHarvested;ag.harvestedGrain=round(ag.harvestedGrain+grainHarvested);ledger(s).harvest=round(ledger(s).harvest+grainHarvested);
  if(w.harvested>=w.tended-1e-8&&w.tended>0)ag.harvestedYear=s.year;
 }
 ag.sownAcres=w.sown;ag.tendedAcres=w.tended;const summary=getFarmSummary(s);for(const k of ['springWorkDays','summerWorkDays','harvestWorkDays'])ag[k]=summary[k];
 sync(s);return {grainHarvested,season,productiveAcres:Math.min(land,capacity)};
}
export function processDailyFamilyWork(s){
 const ag=ensureFamilyWork(s),jobs=getFamilyWorkAssignments(s),work={agriculture:[],shortwork:[],homecraft:[],study:[],rest:[],other:[],income:0};
 for(const j of jobs){
  const p=s.people[j.personId];work[j.assignment].push(j.personId);work.income+=j.dailyIncome;
  if(p.id!==s.playerId){if(j.assignment==='study'&&p.skills)p.skills.knowledge+=.01;if(j.assignment==='rest')p.health=Math.min(100,p.health+.1);}
 }
 work.income=round(work.income);s.resources.money+=work.income;ledger(s).workIncome=round(ledger(s).workIncome+work.income);
 const farm=recordCultivationDay(s);ag.work.lastDailyWork=work;ag.lastDailyWork=work;sync(s);return {...farm,work};
}
export function getHouseholdBudget(s){
 const ag=ensureFamilyWork(s),food=getDailyFoodCost(s),stock=s.resources.grain,jobs=getFamilyWorkAssignments(s);
 const day=MONTH_DAYS.slice(0,s.month-1).reduce((a,b)=>a+b,0)+s.day;
 const remaining=Math.max(0,Math.min(s.household.land,ag.work.tended)-ag.work.harvested);
 const harvestDay=s.month<=8?244:s.month<=11&&remaining>1e-8?day+1:609;
 const daysToHarvest=harvestDay-day,preharvestGap=round(Math.max(0,daysToHarvest*food-stock));
 const income=round(jobs.reduce((n,j)=>n+j.dailyIncome,0)),yearly=ledger(s);
 return {actual:{money:s.resources.money,grain:stock,dailyFood:food,stockDays:food?round(stock/food):Infinity,dailyIncome:income,...yearly},
 forecast:{annualFood:round(food*365),annualIncome:round(income*365),annualWages:ag.hiredWorkers*6*12,daysToHarvest,preharvestGap,expectedHarvest:round(remaining*90*weather(s)),potentialHarvest:round(s.household.land*90),annualBasis:'按当前每日分工延续365日，未扣未来农忙，非保证收入'},
 assignments:jobs,harvestGap:preharvestGap};
}
