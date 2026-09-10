import * as E from './engine-v14.js?v=1.4.0';
const $=s=>document.querySelector(s);
let signature='';
function notice(text){$('#notice').textContent=text;}
function save(s){try{localStorage.setItem('luanshi-jia-shu-v3',E.serializeState(s));}catch(e){notice('存档失败：'+e.message);}}
function element(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function update(){
 const s=window.__luanshiState;if(!s||$('#game').hidden)return;
 let panel=$('#economy-panel');if(!panel){panel=element('section',undefined,'economy-panel');panel.id='economy-panel';$('.main-panel').prepend(panel);}
 if(panel.contains(document.activeElement)&&document.activeElement.matches('input[type=number],select'))return;
 const ag=E.ensureFamilyWork(s),b=E.getHouseholdBudget(s),f=E.getFarmSummary(s);
 const key=JSON.stringify([s.year,s.month,s.day,s.phase,s.running,s.pendingEvent,s.resources,ag,s.currentActivity,s.economy]);
 if(key===signature)return;signature=key;
 panel.replaceChildren(element('h2','家计账簿 · '+s.year+'年'));
 const stats=element('div',undefined,'budget-grid');
 for(const [name,value] of [['每日口粮',b.actual.dailyFood+'粮'],['现粮可撑',b.actual.stockDays+'天'],['距离收获季',b.forecast.daysToHarvest+'天'],['收获前缺粮',b.forecast.preharvestGap+'粮'],['当前日收入',b.actual.dailyIncome+'钱'],['已照料田地预计待收',b.forecast.expectedHarvest+'粮']]){
  const cell=element('div');cell.append(element('small',name),element('strong',value));stats.append(cell);
 }
 panel.append(stats,element('p','收获日期是季节参考，未播种或未安排收割时不保证收获；预测未计未来工资买粮。','fine-print'));
 const enabled=s.phase==='playing'&&!s.endpoint&&!s.running&&!s.pendingEvent;
 const act=(label,fn)=>{const button=element('button',label);button.type='button';button.disabled=!enabled;button.onclick=()=>{const r=fn();notice(r?.message||'设置已保存');save(s);signature='';document.activeElement?.blur();update();};return button;};
 const check=(label,value,fn)=>{const line=element('label');const input=element('input');input.type='checkbox';input.checked=value;input.disabled=!enabled;input.onchange=()=>{fn(input.checked);save(s);signature='';input.blur();update();};line.append(input,document.createTextNode(label));return line;};
 const work=element('details');work.open=true;work.append(element('summary','家庭分工'));
 for(const j of b.assignments){
  const row=element('div',undefined,'work-row');row.append(element('span',j.name+' · '+Math.floor(j.age)+'岁'));
  if(j.personId===s.playerId)row.append(element('span','跟随主要行动 → '+j.label));
  else{
   const select=element('select');select.disabled=!enabled;
   for(const job of E.V14_RULES.FAMILY_ASSIGNMENTS){const option=element('option',E.getAssignmentLabel(job));option.value=job;option.selected=ag.work.assignments[j.personId]===job;if(j.age<16&&!['study','rest'].includes(job))option.disabled=true;select.append(option);}
   select.onchange=()=>{const r=E.setFamilyWorkAssignment(s,j.personId,select.value);notice(r.message);save(s);signature='';select.blur();update();};row.append(select,element('small','今天：'+j.label));
  }work.append(row);
 }
 work.append(check('农闲自动短工，下个农忙季回田',ag.work.autoShortwork,v=>ag.work.autoShortwork=v));panel.append(work);
 const farm=element('details');farm.append(element('summary','农田与雇工'));
 farm.append(element('p','春耕 '+f.springWorkDays+'/20 · 夏管 '+f.summerWorkDays+'/20 · 秋收 '+f.harvestWorkDays+'/5（按全田完成比例折算）'));
 farm.append(element('p','当前务农容量 '+f.familyCapacity+'亩；雇工 '+ag.hiredWorkers+'人，共 '+f.hiredCapacity+'亩。每人每自然月6钱含食宿。'));
 farm.append(act('雇1人 · 6钱',()=>E.hireFarmWorkers(s,1)),act('遣散1人',()=>E.dismissFarmWorkers(s,1)),check('下月自动续雇',ag.autoRenew,v=>ag.autoRenew=v));panel.append(farm);
 const market=element('details');market.open=true;market.append(element('summary','粮食市场'));
 for(const n of [1,10,30])market.append(act('买'+n+'粮 · '+E.getBuyQuote(s,n).total+'钱',()=>E.buyGrain(s,n)));
 market.append(act('补足30天口粮',()=>E.fillThirtyDays(s)));
 for(const n of [10,50,100])market.append(act('卖'+n+'粮 · '+E.round(n*E.getGrainSellPrice(s))+'钱',()=>{
  const days=Math.max(0,E.round((s.resources.grain-n)/b.actual.dailyFood));
  if(n<=s.resources.grain&&days<b.forecast.daysToHarvest&&!window.confirm('出售后剩'+days+'天口粮，距收获季'+b.forecast.daysToHarvest+'天。仍然出售？'))return {message:'已取消出售。'};
  return E.sellGrain(s,n);
 }));
 const auto=s.market?.autoBuy||{enabled:false,reserveMoney:10};
 market.append(check('低于7天口粮自动补至30天',auto.enabled,v=>E.setAutoBuy(s,v,auto.reserveMoney)));
 const reserve=element('input');reserve.type='number';reserve.min='0';reserve.step='1';reserve.value=auto.reserveMoney;reserve.disabled=!enabled;reserve.setAttribute('aria-label','自动买粮保留现金');
 reserve.onchange=()=>{E.setAutoBuy(s,auto.enabled,Math.max(0,Number(reserve.value)||0));save(s);signature='';reserve.blur();update();};
 const lab=element('label','保留现金：');lab.append(reserve);market.append(lab,element('p','余额不足以补满30天或低于保留额时，不会自动购买；仍可手动少量买粮。','fine-print'));panel.append(market);
 const annual=element('details');annual.append(element('summary','年度实账与预测'));
 for(const [year,a] of Object.entries(s.economy.years).slice(-3)){
  annual.append(element('h3',year+'年 · 已记录'+a.days+'天'));
  annual.append(element('p','现金：劳动 +'+a.workIncome+'，卖粮 +'+a.saleIncome+'，买粮 −'+a.buyCost+'，工资 −'+a.wages+'，购田 −'+a.investment+'，其他净额 '+a.otherMoney));
  annual.append(element('p','粮食：秋收 +'+a.harvest+'，购入 +'+a.bought+'，吃饭 −'+a.foodConsumed+'，售出 −'+a.sold+'，其他净额 '+a.otherGrain));
 }
 annual.append(element('p','当前人口全年口粮参考 '+b.forecast.annualFood+'粮；当前日收入年化 '+b.forecast.annualIncome+'钱（未扣未来农忙、疾病、涨价与人口变化，不是保证收入）。'));
 panel.append(annual);
 $('#money').textContent=s.resources.money.toFixed(2);$('#grain').textContent=s.resources.grain.toFixed(2);$('#food-rate').textContent=b.actual.dailyFood.toFixed(2)+'/日';
}
window.setInterval(update,200);
update();
