import * as Base from './engine-v12.js?v=1.4.1';
import * as Rules from './v14-rules.js?v=1.4.1';
import * as Market from './v14-market.js?v=1.4.1';
import {isMinorMessageEvent,convertPendingMinorEventToMessage} from './v13-rules.js?v=1.3.1';
export * from './engine-v12.js?v=1.4.1';
export * from './v14-rules.js?v=1.4.1';
export * from './v14-market.js?v=1.4.1';
export {V14_RULES as V13_RULES} from './v14-rules.js?v=1.4.1';
const expose=s=>{if(typeof window!=='undefined')window.__luanshiState=s;return s;};
function prepare(s){Rules.ensureFamilyWork(s);Rules.ledger(s);return expose(s);}
export function createGame(options){return prepare(Base.createGame(options));}
export function deserializeState(raw){return prepare(Base.deserializeState(raw));}
export function getActions(s){
 const actions=Base.getActions(s).map(a=>{
  if(a.id==='trade')return {...a,label:'短工谋生',risk:null,desc:Rules.WORK_DESCRIPTIONS.shortwork};
  if(a.id==='cultivate')return {...a,label:'务农兼短工',desc:'靠自己和家人按指派种田；'+Rules.WORK_DESCRIPTIONS.agriculture};
  if(a.id==='manage')return {...a,desc:Rules.WORK_DESCRIPTIONS.homecraft};
  if(a.id==='rest')return {...a,desc:Rules.WORK_DESCRIPTIONS.rest,disabled:!s.people?.[s.playerId]?.alive||s.phase!=='playing'||s.endpoint||Boolean(s.pendingEvent)};
  return a;
 });
 const cultivate=actions.find(a=>a.id==='cultivate');
 const longfarm={...cultivate,id:'longfarm',label:'长期务农',desc:'靠自己和家人按指派种田；'+Rules.WORK_DESCRIPTIONS.longfarm,selected:s.currentActivity?.id==='longfarm'};
 return [longfarm,cultivate,...actions.filter(a=>a.id!=='cultivate')];
}
export function selectActivity(s,id,options={}){return Rules.selectWorkActivity(s,id,options);}
function deltas(s,before,l,prior){
 const money=s.resources.money-before.money,grain=s.resources.grain-before.grain;
 const knownMoney=(l.workIncome-prior.workIncome)-(l.buyCost-prior.buyCost)+(l.saleIncome-prior.saleIncome)-(l.wages-prior.wages)-(l.investment-prior.investment);
 const knownGrain=(l.harvest-prior.harvest)+(l.bought-prior.bought)-(l.sold-prior.sold)-(l.foodConsumed-prior.foodConsumed);
 l.otherMoney=Rules.round(l.otherMoney+money-knownMoney);l.otherGrain=Rules.round(l.otherGrain+grain-knownGrain);
}
export function advanceDay(s){
 if(!s||s.phase!=='playing'||s.endpoint||s.pendingEvent||!s.currentActivity)return {ok:false,paused:true,message:'当前时间不能继续。'};
 prepare(s);const l=Rules.ledger(s),prior={...l},before={...s.resources};let eaten=0;
 s.__v14DailyWork=true;
 const playerWork=Rules.getFamilyWorkAssignments(s).find(j=>j.personId===s.playerId);
 s.__skipDailyActivity=playerWork?.assignment==='rest'||playerWork?.assignment==='idle';
 s.__beforeFood=()=>{
  Rules.settleMonthlyFarmWages(s);const work=Rules.processDailyFamilyWork(s);
  const running=s.running;s.running=false;Market.maybeAutoBuy(s);s.running=running;
  eaten=Math.min(s.resources.grain,Rules.getDailyFoodCost(s));
  Rules.settleWorkHealth(s,work.work.jobs,{wellFed:s.resources.grain>=Rules.getDailyFoodCost(s)});return work;
 };
 let result;try{result=Base.advanceDay(s);}finally{delete s.__beforeFood;delete s.__v14DailyWork;delete s.__skipDailyActivity;}
 if(!result.ok)return result;
 l.days++;l.foodConsumed=Rules.round(l.foodConsumed+eaten);
 if(isMinorMessageEvent(s.pendingEvent)){convertPendingMinorEventToMessage(s);if(s.phase==='playing'){s.running=true;result={...result,paused:false};}}
 if(s.pendingEvent?.title==='家中断粮'){
  const price=Market.getGrainBuyPrice(s);s.pendingEvent.options=[{id:'buy',label:'买入1粮',consequence:'钱 -'+price+'，粮 +1',effect:{money:-price,grain:1}}];
 }
 if(!s.pendingEvent&&s.phase==='playing'&&!s.endpoint&&Rules.getSeason(s.month)!=='winter'&&s.household.land>0)Rules.rollSeasonWeather(s);
 if(s.pendingEvent){s.running=false;result={...result,paused:true,reason:s.pauseReason};}
 deltas(s,before,l,prior);Rules.sync(s);expose(s);return result;
}
export function resolveEvent(s,id,option){
 const l=Rules.ledger(s),before={...s.resources},prior={...l};
 const r=s.pendingEvent?.source==='agriculture-major'?Rules.resolveAgricultureEvent(s,id,option):Base.resolveEvent(s,id,option);
 if(r.ok)deltas(s,before,l,prior);Rules.sync(s);return r;
}
export function buyLand(s,n){const l=Rules.ledger(s);const r=Base.buyLand(s,n);if(r.ok)l.investment+=r.cost;return r;}
export function sellGrain(s,n){
 if(s.phase!=='playing'||s.endpoint||s.running||s.pendingEvent||!Number.isInteger(n)||n<1||s.resources.grain<n)return {ok:false,message:'请暂停并确认库存足够。'};
 const l=Rules.ledger(s),total=Rules.round(n*Rules.getGrainSellPrice(s));l.saleIncome=Rules.round(l.saleIncome+total);l.sold+=n;s.resources.grain-=n;s.resources.money+=total;Rules.sync(s);
 return {ok:true,message:'售出'+n+'粮，收入'+total+'钱。',total};
}
