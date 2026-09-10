import { getFamilyWorkAssignments, getAssignmentLabel, setFamilyWorkAssignment,
  V14_RULES, WORK_DESCRIPTIONS } from './engine-v14.js?v=1.4.1';

const NS = 'http://www.w3.org/2000/svg';
const CARD_WIDTH = 116, CARD_HEIGHT = 88, GAP_X = 12, GAP_Y = 22, PAD = 10;
const icons = { agriculture:'🌾', shortwork:'🔨', homecraft:'🧵', study:'📖', rest:'🛏', idle:'—', other:'◆' };
const svg = (tag, attrs = {}, text) => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
};
const el = (tag, cls, text) => {
  const node = document.createElement(tag); if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text; return node;
};
const brief = name => [...name].length > 7 ? [...name].slice(0, 6).join('') + '…' : name;
const healthLabel = health => Number(health || 0).toFixed(1);

/** One UI controller; work, health and save state remain exclusively in the engine. */
export function createFamilyWorkView(hooks) {
  const tree = document.querySelector('#tree');
  let menu = null, menuPerson = null;
  function closeMenu(focus = false) {
    const id = menuPerson; menu?.remove(); menu = null; menuPerson = null;
    if (focus && id) tree.querySelector(`[data-person="${CSS.escape(id)}"]`)?.focus();
  }
  function openMenu(id, x, y) {
    const state = hooks.getState(); const person = state?.people?.[id];
    if (!person) return;
    closeMenu();
    hooks.select(id);
    hooks.pause(); // Cancel the real timer; do not merely change its appearance.
    hooks.render();
    menuPerson = id;
    menu = el('div', 'work-context-menu'); menu.id = 'work-context-menu';
    menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', `${person.name}工作指派`);
    const title = el('strong', 'work-menu-title', `${person.name} · 健康 ${healthLabel(person.health)}`);
    menu.append(title);
    const locked = state.phase !== 'playing' || state.endpoint || Boolean(state.pendingEvent) || !person.alive;
    menu.append(el('p','work-menu-hint',!person.alive ? '已故成员不能指派工作。'
      : locked ? '请先处理重大事件或完成继承，再安排工作。'
      : person.id === state.playerId ? '修改后同步左侧主要行动；时间保持暂停。' : '只修改此人的长期安排；时间保持暂停。'));
    for (const job of V14_RULES.FAMILY_ASSIGNMENTS) {
      const button = el('button','work-menu-option'); button.type = 'button'; button.dataset.job = job;
      button.setAttribute('role','menuitem');
      button.disabled = locked || (person.age < 16 && !['study','rest'].includes(job));
      button.append(el('strong','',getAssignmentLabel(job)),el('small','',WORK_DESCRIPTIONS[job]));
      button.addEventListener('click', () => {
        // Validate again against the active state, including events/death since opening.
        const current = hooks.getState();
        const result = current === state ? setFamilyWorkAssignment(current,id,job) : {ok:false,message:'存档已切换，请重新选择人物。'};
        closeMenu();
        if (result.ok) hooks.save();
        hooks.render(); hooks.notice(result.message, result.ok ? 'info' : 'error');
      });
      menu.append(button);
    }
    document.body.append(menu);
    const box = menu.getBoundingClientRect();
    menu.style.left = Math.max(8,Math.min(x,window.innerWidth-box.width-8))+'px';
    menu.style.top = Math.max(8,Math.min(y,window.innerHeight-box.height-8))+'px';
    const focusTarget = menu.querySelector('button:not(:disabled)');
    if (focusTarget) focusTarget.focus({preventScroll:true});
    else {menu.tabIndex=-1;menu.focus({preventScroll:true});}
  }
  tree.addEventListener('contextmenu', event => {
    const node = event.target.closest('[data-person]'); if (!node) return;
    event.preventDefault(); openMenu(node.dataset.person,event.clientX,event.clientY);
  });
  tree.addEventListener('keydown', event => {
    const node = event.target.closest('[data-person]'); if (!node) return;
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault(); const box=node.getBoundingClientRect();openMenu(node.dataset.person,box.x,box.y+box.height);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();hooks.select(node.dataset.person);hooks.render();
    }
  });
  document.addEventListener('pointerdown', event => {if(menu&&!menu.contains(event.target))closeMenu();});
  document.addEventListener('keydown', event => {
    if (!menu) return;
    if (event.key === 'Escape') {event.preventDefault();closeMenu(true);return;}
    if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
      event.preventDefault();const buttons=[...menu.querySelectorAll('button:not(:disabled)')];if(!buttons.length)return;
      const index=buttons.indexOf(document.activeElement);
      const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
      buttons[next].focus();
    }
  });
  window.addEventListener('resize',()=>closeMenu());

  function renderTree(people, state) {
    tree.replaceChildren(); tree.classList.add('managed-tree');
    if (!people.length) return;
    const jobs=new Map(getFamilyWorkAssignments(state).map(j=>[j.personId,j]));
    const levels=new Map();
    for (const p of people) {const gen=Number(p.generation)||0;if(!levels.has(gen))levels.set(gen,[]);levels.get(gen).push(p);}
    const rows=[...levels.keys()].sort((a,b)=>a-b);
    const width=Math.max(260,Math.max(...[...levels.values()].map(a=>a.length))*(CARD_WIDTH+GAP_X)-GAP_X+PAD*2);
    const height=rows.length*(CARD_HEIGHT+GAP_Y)-GAP_Y+PAD*2;
    tree.setAttribute('viewBox',`0 0 ${width} ${height}`);tree.setAttribute('width',width);tree.setAttribute('height',height);
    tree.style.minWidth=width+'px';tree.style.height=height+'px';
    const positions=new Map();
    rows.forEach((gen,row)=>{
      const list=levels.get(gen),rowWidth=list.length*(CARD_WIDTH+GAP_X)-GAP_X;
      list.forEach((p,col)=>positions.set(p.id,{x:(width-rowWidth)/2+col*(CARD_WIDTH+GAP_X),y:PAD+row*(CARD_HEIGHT+GAP_Y)}));
    });
    const lines=svg('g',{class:'tree-lines'});
    for(const p of people){
      const to=positions.get(p.id);
      for(const parent of p.parentIds||[]){
        const from=positions.get(parent);if(!from)continue;
        const x1=from.x+CARD_WIDTH/2,y1=from.y+CARD_HEIGHT,x2=to.x+CARD_WIDTH/2,y2=to.y;
        lines.append(svg('path',{d:`M${x1} ${y1} V${(y1+y2)/2} H${x2} V${y2}`}));
      }
    }
    tree.append(lines);
    for(const p of people){
      const pos=positions.get(p.id),job=jobs.get(p.id);
      const group=svg('g',{class:`tree-node ${p.alive?'':'dead'} ${p.id===state.selectedPersonId?'selected':''}`,transform:`translate(${pos.x} ${pos.y})`,tabindex:0,role:'button'});
      group.dataset.person=p.id;
      const status=p.alive?(job?.label||'等待安排'):'已故';
      group.setAttribute('aria-label',`${p.name}，${Math.floor(p.age)}岁，${status}，健康${healthLabel(p.health)}。右键指派工作`);
      group.append(svg('title',{},`${p.name} · ${Math.floor(p.age)}岁\n长期安排：${getAssignmentLabel(job?.planned||'idle')}\n今日状态：${status}\n健康：${healthLabel(p.health)}\n日收入参考：${job?.dailyIncome||0}钱\n劳动健康变化：${job?.healthDelta||0}/日（恢复需足粮）`));
      group.append(svg('rect',{class:'tree-person-card',width:CARD_WIDTH,height:CARD_HEIGHT,rx:8}));
      group.append(svg('text',{x:CARD_WIDTH/2,y:19,'text-anchor':'middle',class:'tree-person-name'},brief(p.name)));
      group.append(svg('text',{x:CARD_WIDTH/2,y:34,'text-anchor':'middle',class:'tree-person-age'},`${Math.floor(p.age)}岁${p.id===state.playerId?' · 执笔人':''}`));
      const statusNode=svg('text',{x:CARD_WIDTH/2,y:52,'text-anchor':'middle',class:'tree-work-label'},`${p.alive?(icons[job?.assignment]||''):''} ${status}`);
      statusNode.dataset.job=job?.assignment||'dead';group.append(statusNode);
      group.append(svg('rect',{x:14,y:61,width:CARD_WIDTH-28,height:4,rx:2,class:'tree-health-track'}));
      const bar=svg('rect',{x:14,y:61,width:(CARD_WIDTH-28)*Math.max(0,Math.min(100,p.health||0))/100,height:4,rx:2,class:'tree-health-fill'});
      bar.dataset.health=p.health<=35?'low':p.health<60?'tired':'good';group.append(bar);
      group.append(svg('text',{x:CARD_WIDTH/2,y:79,'text-anchor':'middle',class:'tree-health-value'},`健康 ${healthLabel(p.health)}`));
      group.addEventListener('click',()=>{hooks.select(p.id);hooks.render();});tree.append(group);
    }
  }
  function renderDetail(panel, person, state) {
    const job=getFamilyWorkAssignments(state).find(j=>j.personId===person.id);
    const info=el('p','person-work-detail',person.alive
      ? `长期安排：${getAssignmentLabel(job?.planned||'idle')}；今日：${job?.label||'等待安排'}；健康 ${healthLabel(person.health)}`
      : `已故 · 最终健康 ${healthLabel(person.health)}`);
    panel.append(info);
    if(!person.alive)return;
    const button=el('button','assign-work-button','指派工作');button.type='button';
    button.addEventListener('click',()=>{const box=button.getBoundingClientRect();openMenu(person.id,box.x,box.y+box.height);});
    panel.append(button,el('small','work-detail-help','也可右键人物，或键盘 Shift+F10。时间暂停时，图中显示待执行安排。'));
  }
  return {renderTree,renderDetail,closeMenu};
}
