import {getDailyFoodCost,getPersonFoodCost,MONTH_DAYS,selectActivity as baseSelectActivity} from './engine.js?base=1.4.1';
import {V13_RULES as OLD,ensureAgriculture,getSeason,getSeasonLabel,getPersonFarmCapacity,rollSeasonWeather,resolveAgricultureEvent} from './v13-rules.js?v=1.3.1';
export {getDailyFoodCost,getPersonFoodCost,getSeason,getSeasonLabel,rollSeasonWeather,resolveAgricultureEvent};
// Work policy is persistent; actual work is resolved once at the start of a day.
export const V14_RULES = Object.freeze({
 ...OLD, BASE_YIELD_PER_MU:90, SHORTWORK_DAILY_INCOME:0.9,
 FAMILY_ASSIGNMENTS:['longfarm','agriculture','shortwork','homecraft','study','rest'],
 AUTO_REST_HEALTH:35, RESUME_WORK_HEALTH:60, REST_RECOVERY:1.2,
 FARM_HEALTH_COST:0.25, HARVEST_HEALTH_COST:0.35,
 SHORTWORK_HEALTH_COST:0.35, HOMECRAFT_HEALTH_COST:0.15
});
export const round=n=>Math.round(n*100)/100||0;
const labels={longfarm:'长期务农',agriculture:'务农兼短工',shortwork:'长期短工',homecraft:'家庭副业',study:'求学',rest:'休养',idle:'无法劳动',other:'当前事务'};
export const getAssignmentLabel=id=>labels[id]||id;
const actionToJob={longfarm:'longfarm',cultivate:'agriculture',trade:'shortwork',manage:'homecraft',study:'study',rest:'rest'};
const jobToAction={longfarm:'longfarm',agriculture:'cultivate',shortwork:'trade',homecraft:'manage',study:'study',rest:'rest'};
const laborPlans=new Set(['longfarm','agriculture','shortwork','homecraft']);
export const WORK_DESCRIPTIONS = Object.freeze({
 longfarm:'长期负责家中农田，春耕、夏管、秋收；农闲休养，不转短工。农忙健康−0.25/日，秋收−0.35/日，足粮休养+1.20/日。',
 agriculture:'农忙种田，农闲自动短工，下季回田。春夏健康−0.25/日，秋收或短工−0.35/日；短工收入0.9钱/日。',
 shortwork:'长期做短工，工作日收入0.9钱，健康−0.35。健康≤35自动休养，恢复至60返回工作。',
 homecraft:'在家做副业，工作日收入0.6钱，健康−0.15。健康≤35自动休养，恢复至60返回工作。',
 study:'求学积累学识，无工资，不额外消耗劳动健康。未成年人可以选择。',
 rest:'停止劳动，不领工资。全家当日口粮充足时健康+1.20；缺粮不能靠休养抵消饥饿。'
});
function workLog(s,title,text){s.eventLog.push({year:s.year,month:s.month,day:s.day,kind:'message',title,text});}
export function ensureFamilyWork(s){
 const ag=ensureAgriculture(s);ag.work??={};const w=ag.work;
 w.assignments??={};w.autoShortwork??=true;w.lastDailyWork??={};w.recovering??={};ag.autoRenew??=true;
 if(w.policyVersion!==141){
  // Preserve V1.4's explicit no-shortwork choice without changing everyone's policy.
  if(w.autoShortwork===false){
   for(const id of Object.keys(w.assignments))if(w.assignments[id]==='agriculture')w.assignments[id]='longfarm';
   if(s.currentActivity?.id==='cultivate')s.currentActivity.id='longfarm';
  }
  w.policyVersion=141;
 }
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
 if(p.id===s.playerId)return s.currentActivity?(actionToJob[s.currentActivity.id]||'other'):'idle';
 return ensureFamilyWork(s).work.assignments[p.id];
}
function finished(s){
 const w=ensureFamilyWork(s).work,land=s.household.land,season=getSeason(s.month);
 return land<=0||season==='winter'||(season==='spring'?w.sown>=land-1e-8:season==='summer'?w.tended>=Math.min(land,w.sown)-1e-8:w.harvested>=Math.min(land,w.tended)-1e-8);
}
export function getFamilyWorkAssignments(s){
 const ag=ensureFamilyWork(s),season=getSeason(s.month),farmDone=finished(s);
 return Object.values(s.people).filter(p=>p.alive&&p.familyId===s.family.id).map(p=>{
  const original=planned(s,p);
  const recovering=laborPlans.has(original)&&(p.health<=V14_RULES.AUTO_REST_HEALTH||(ag.work.recovering[p.id]&&p.health<V14_RULES.RESUME_WORK_HEALTH));
  let assignment=original,reason='';
  if(recovering){assignment='rest';reason='recovery';}
  else if(original==='longfarm'||original==='agriculture'){
   if(farmDone){assignment=original==='longfarm'?'rest':'shortwork';reason='offseason';}
   else assignment='agriculture';
  }
  if(p.age<16&&!['study','rest','other','idle'].includes(assignment)){assignment='idle';reason='age';}
  let capacity=assignment==='agriculture'?getPersonFarmCapacity(p):0;
  let income=getShortworkIncome(p)*(assignment==='shortwork'?1:assignment==='homecraft'?2/3:0);
  if((assignment==='agriculture'&&capacity<=0)||(['shortwork','homecraft'].includes(assignment)&&income<=0)){
   assignment='idle';reason=p.hunger>=80?'hunger':'capacity';capacity=0;income=0;
  }
  const loss=assignment==='agriculture'?(season==='autumn'?V14_RULES.HARVEST_HEALTH_COST:V14_RULES.FARM_HEALTH_COST)
   :assignment==='shortwork'?V14_RULES.SHORTWORK_HEALTH_COST:assignment==='homecraft'?V14_RULES.HOMECRAFT_HEALTH_COST:0;
  const fed=s.resources.grain>=getDailyFoodCost(s);
  const healthDelta=assignment==='rest'?(fed&&p.health>0?V14_RULES.REST_RECOVERY:0):-loss;
  const label=assignment==='agriculture'?getSeasonLabel(s.month)+'中'
   :assignment==='rest'?(reason==='recovery'?'自动休养':reason==='offseason'?'农闲休养':'休养中')
   :assignment==='shortwork'?(reason==='offseason'?'农闲短工':'短工中')
   :assignment==='homecraft'?'副业中':assignment==='study'?'求学中'
   :assignment==='idle'?(reason==='hunger'?'缺粮停工':original==='idle'?'等待安排':'无法劳动')
   :({enlist:'军旅中',migrate:'迁徙中',marry:'筹办婚事',child:'商议添丁',prepare:'筹备迁徙'})[s.currentActivity?.id]||'当前事务';
  return {personId:p.id,name:p.name,age:p.age,planned:original,assignment,label,reason,recovering,
   farmCapacity:capacity,dailyIncome:round(income),foodCost:getPersonFoodCost(p),health:p.health,healthDelta};
 });
}
const manageable=s=>s&&s.phase==='playing'&&!s.endpoint&&!s.pendingEvent&&!s.running;
export function selectWorkActivity(s,id,options={}){
 if(!manageable(s))return {ok:false,message:'请先暂停时间并处理当前事件。'};
 const p=s.people?.[s.playerId];
 if(!p?.alive)return {ok:false,message:'当前没有可指派的执笔人。'};
 if(p.age<16&&!['study','rest'].includes(id))return {ok:false,message:'未成年成员仅安排求学或休养。'};
 const job=actionToJob[id];
 if(!job)return baseSelectActivity(s,id,options);
 if(!['longfarm','rest'].includes(id)){
  const r=baseSelectActivity(s,id,options);if(!r.ok)return r;
  s.pauseReason='已选择：'+labels[job];
  const entry=s.eventLog.at(-1);if(entry?.title==='安排下一段日子')entry.text=labels[job]+'。点击开始后按日执行。';
 }else{
  s.currentActivity={id,kind:'routine',elapsed:0,duration:null,destination:null,charged:false};
  s.pauseReason='已选择：'+labels[job];
  workLog(s,'安排下一段日子',labels[job]+'。点击开始后按日执行。');
 }
 ensureFamilyWork(s).work.assignments[p.id]=job;
 return {ok:true,message:'已安排'+labels[job]+'，时间保持暂停。'};
}
export function setFamilyWorkAssignment(s,id,job){
 if(!manageable(s)||!V14_RULES.FAMILY_ASSIGNMENTS.includes(job)||!s.people[id]?.alive||s.people[id].familyId!==s.family.id)return {ok:false,message:'请暂停时间，处理事件后安排本家成员。'};
 if(s.people[id].age<16&&!['study','rest'].includes(job))return {ok:false,message:'未成年成员仅安排求学或休养。'};
 if(id===s.playerId)return selectWorkActivity(s,jobToAction[job]);
 ensureFamilyWork(s).work.assignments[id]=job;
 return {ok:true,message:s.people[id].name+'已安排'+labels[job]+'。'};
}
// Recovery flags are changed only by day settlement, never by rendering/querying.
export function settleWorkHealth(s,jobs,{wellFed=false}={}){
 const w=ensureFamilyWork(s).work,changes={};
 for(const j of jobs){
  const p=s.people[j.personId];if(!p?.alive)continue;
  const wasRecovering=Boolean(w.recovering[p.id]);
  let delta=j.assignment==='rest'?(wellFed&&p.health>0?V14_RULES.REST_RECOVERY:0):Math.min(0,j.healthDelta);
  const before=p.health;
  if(delta)p.health=round(Math.min(100,Math.max(0,p.health+delta)));
  changes[p.id]=round(p.health-before);
  let recovery=wasRecovering;
  if(p.health>=V14_RULES.RESUME_WORK_HEALTH)recovery=false;
  else if(j.recovering||(laborPlans.has(j.planned)&&p.health<=V14_RULES.AUTO_REST_HEALTH))recovery=true;
  w.recovering[p.id]=recovery;
  if(!wasRecovering&&recovery)workLog(s,'开始休养',p.name+'健康偏低，自动停工休养；恢复至60后返回原工作。');
  if(wasRecovering&&!recovery)workLog(s,'恢复工作',p.name+'已恢复，可以按原安排继续工作。');
 }
 w.lastDailyWork.healthChanges=changes;
 return changes;
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
export function recordCultivationDay(s,jobs=getFamilyWorkAssignments(s)){
 const ag=ensureFamilyWork(s),w=ag.work,season=getSeason(s.month),capacity=jobs.reduce((n,j)=>n+j.farmCapacity,0)+ag.hiredWorkers*3,land=s.household.land;
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
 const ag=ensureFamilyWork(s),jobs=getFamilyWorkAssignments(s),work={agriculture:[],shortwork:[],homecraft:[],study:[],rest:[],idle:[],other:[],income:0,jobs};
 for(const j of jobs){
  const p=s.people[j.personId];work[j.assignment].push(j.personId);work.income+=j.dailyIncome;
  if(p.id!==s.playerId&&j.assignment==='study'&&p.skills)p.skills.knowledge+=.01;
 }
 work.income=round(work.income);s.resources.money+=work.income;ledger(s).workIncome=round(ledger(s).workIncome+work.income);
 const farm=recordCultivationDay(s,jobs);ag.work.lastDailyWork=work;ag.lastDailyWork=work;sync(s);return {...farm,work};
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
