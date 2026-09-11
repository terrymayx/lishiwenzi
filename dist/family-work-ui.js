import { getFamilyWorkAssignments, getAssignmentLabel, setFamilyWorkAssignment,
  V14_RULES, WORK_DESCRIPTIONS } from './engine-v14.js?v=1.4.2';

const NS = 'http://www.w3.org/2000/svg';
const CARD_WIDTH = 116, CARD_HEIGHT = 88, SPOUSE_GAP = 20, FAMILY_GAP = 34, GENERATION_GAP = 52, PAD = 12;
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
const pairKey = (a, b) => [a, b].sort().join('|');

function collectSpousePairs(people, state) {
  const ids = new Set(people.map(person => person.id));
  const seen = new Set();
  const pairs = [];
  const add = (a, b) => {
    if (!a || !b || a === b || !ids.has(a) || !ids.has(b)) return;
    const key = pairKey(a, b);
    if (seen.has(key)) return;
    seen.add(key); pairs.push({ a, b, key });
  };
  for (const person of people) add(person.id, person.spouseId);
  for (const relation of Object.values(state.relations || {})) {
    if (relation?.type === '婚姻') add(relation.from, relation.to);
  }
  return pairs;
}

function buildGenerationUnits(list, spouseMap) {
  const ids = new Set(list.map(person => person.id));
  const byId = new Map(list.map(person => [person.id, person]));
  const used = new Set();
  const units = [];
  for (const person of list) {
    if (used.has(person.id)) continue;
    const spouseId = spouseMap.get(person.id);
    if (spouseId && ids.has(spouseId) && !used.has(spouseId)) {
      used.add(person.id); used.add(spouseId);
      units.push({ people: [person, byId.get(spouseId)], width: CARD_WIDTH * 2 + SPOUSE_GAP });
    } else {
      used.add(person.id);
      units.push({ people: [person], width: CARD_WIDTH });
    }
  }
  return units;
}

function relationPath(layer, className, d, relatives, selectedId) {
  const ids = [...new Set(relatives.filter(Boolean))];
  const path = svg('path', { class: `relation-line ${className}`, d, 'data-relatives': ids.join(' ') });
  if (selectedId && ids.includes(selectedId)) path.classList.add('related');
  layer.append(path);
  return path;
}

function buildChildGroups(people, positions) {
  const visible = new Set(people.map(person => person.id));
  const groups = new Map();
  for (const child of people) {
    const parents = [...new Set((child.parentIds || []).filter(id => visible.has(id) && positions.has(id)))];
    if (!parents.length) continue;
    const key = parents.slice().sort().join('|');
    const entry = groups.get(key) || { parents, children: [] };
    entry.children.push(child.id); groups.set(key, entry);
  }
  return [...groups.values()];
}

export function getFamilyBranchGeometry({ anchorX, anchorY, childCenters, childTop }) {
  const children = (childCenters || []).map(Number).filter(Number.isFinite);
  const parentX = Number(anchorX);
  const top = Number(childTop);
  const startY = Number(anchorY);
  const busY = Math.max(startY + 12, top - 16);
  const xs = [parentX, ...children].filter(Number.isFinite);
  const busMinX = xs.length ? Math.min(...xs) : parentX;
  const busMaxX = xs.length ? Math.max(...xs) : parentX;
  return {
    busY,
    busMinX,
    busMaxX,
    needsHorizontalBus: Number.isFinite(busMinX) && Number.isFinite(busMaxX) && Math.abs(busMaxX - busMinX) > 0.5
  };
}

/** One UI controller; only the current protagonist exposes manual work assignment controls. */
export function createFamilyWorkView(hooks) {
  const tree = document.querySelector('#tree');
  let menu = null, menuPerson = null;
  function closeMenu(focus = false) {
    const id = menuPerson; menu?.remove(); menu = null; menuPerson = null;
    if (focus && id) tree.querySelector(`[data-person="${CSS.escape(id)}"]`)?.focus();
  }
  function openMenu(id, x, y) {
    const state = hooks.getState(); const person = state?.people?.[id];
    if (!person || person.id !== state.playerId) return;
    closeMenu();
    hooks.select(id);
    hooks.pause();
    hooks.render();
    menuPerson = id;
    menu = el('div', 'work-context-menu'); menu.id = 'work-context-menu';
    menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', `${person.name}工作指派`);
    const title = el('strong', 'work-menu-title', `${person.name} · 健康 ${healthLabel(person.health)}`);
    menu.append(title);
    const locked = state.phase !== 'playing' || state.endpoint || Boolean(state.pendingEvent) || !person.alive;
    menu.append(el('p','work-menu-hint',!person.alive ? '已故成员不能指派工作。'
      : locked ? '请先处理重大事件或完成继承，再安排工作。'
      : '只有当前执笔人可以指派挣钱和务农工作；修改后同步左侧主要行动，时间保持暂停。'));
    for (const job of V14_RULES.FAMILY_ASSIGNMENTS) {
      const button = el('button','work-menu-option'); button.type = 'button'; button.dataset.job = job;
      button.setAttribute('role','menuitem');
      button.disabled = locked || (person.age < 16 && !['study','rest'].includes(job));
      button.append(el('strong','',getAssignmentLabel(job)),el('small','',WORK_DESCRIPTIONS[job]));
      button.addEventListener('click', () => {
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
    const state = hooks.getState();
    event.preventDefault();
    if (node.dataset.person !== state?.playerId) {
      hooks.select(node.dataset.person); hooks.render();
      return;
    }
    openMenu(node.dataset.person,event.clientX,event.clientY);
  });
  tree.addEventListener('keydown', event => {
    const node = event.target.closest('[data-person]'); if (!node) return;
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      const state = hooks.getState();
      if (node.dataset.person !== state?.playerId) return;
      const box=node.getBoundingClientRect();openMenu(node.dataset.person,box.x,box.y+box.height);
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
    tree.classList.toggle('has-selection', Boolean(state.selectedPersonId));
    if (!people.length) return;
    const jobs=new Map(getFamilyWorkAssignments(state).map(j=>[j.personId,j]));
    const spousePairs=collectSpousePairs(people,state);
    const spouseMap=new Map();
    const spouseKeys=new Set();
    for(const pair of spousePairs){spouseMap.set(pair.a,pair.b);spouseMap.set(pair.b,pair.a);spouseKeys.add(pair.key);}

    const levels=new Map();
    for (const p of people) {const gen=Number(p.generation)||0;if(!levels.has(gen))levels.set(gen,[]);levels.get(gen).push(p);}
    const rows=[...levels.keys()].sort((a,b)=>a-b);
    const rowUnits=new Map(rows.map(gen=>[gen,buildGenerationUnits(levels.get(gen),spouseMap)]));
    const rowWidths=rows.map(gen=>{
      const units=rowUnits.get(gen);return units.reduce((sum,unit)=>sum+unit.width,0)+Math.max(0,units.length-1)*FAMILY_GAP;
    });
    const width=Math.max(300,Math.max(...rowWidths)+PAD*2);
    const height=rows.length*(CARD_HEIGHT+GENERATION_GAP)-GENERATION_GAP+PAD*2;
    tree.setAttribute('viewBox',`0 0 ${width} ${height}`);tree.setAttribute('width',width);tree.setAttribute('height',height);
    tree.style.minWidth=width+'px';tree.style.height=height+'px';
    const positions=new Map();
    rows.forEach((gen,row)=>{
      const units=rowUnits.get(gen);let x=(width-rowWidths[row])/2;const y=PAD+row*(CARD_HEIGHT+GENERATION_GAP);
      for(const unit of units){
        unit.people.forEach((person,index)=>positions.set(person.id,{x:x+index*(CARD_WIDTH+SPOUSE_GAP),y}));
        x+=unit.width+FAMILY_GAP;
      }
    });

    const relationshipLayer=svg('g',{class:'relationship-layer'});
    const bloodLayer=svg('g',{class:'blood-lines'});
    const spouseLayer=svg('g',{class:'spouse-lines'});
    relationshipLayer.append(bloodLayer,spouseLayer);

    for(const pair of spousePairs){
      const a=positions.get(pair.a),b=positions.get(pair.b);if(!a||!b||a.y!==b.y)continue;
      const left=a.x<=b.x?a:b,right=left===a?b:a;
      const y=left.y+CARD_HEIGHT/2;
      relationPath(spouseLayer,'spouse-line',`M${left.x+CARD_WIDTH} ${y} H${right.x}`,[pair.a,pair.b],state.selectedPersonId);
    }

    for(const branch of buildChildGroups(people,positions)){
      const parentPositions=branch.parents.map(id=>positions.get(id)).filter(Boolean);
      const childPositions=branch.children.map(id=>positions.get(id)).filter(Boolean);
      if(!parentPositions.length||!childPositions.length)continue;
      const isCouple=branch.parents.length===2&&spouseKeys.has(pairKey(branch.parents[0],branch.parents[1]));
      const anchorX=parentPositions.reduce((sum,pos)=>sum+pos.x+CARD_WIDTH/2,0)/parentPositions.length;
      const anchorY=isCouple?parentPositions[0].y+CARD_HEIGHT/2:Math.max(...parentPositions.map(pos=>pos.y+CARD_HEIGHT));
      const childCenters=childPositions.map(pos=>pos.x+CARD_WIDTH/2);
      const childTop=Math.min(...childPositions.map(pos=>pos.y));
      const geometry=getFamilyBranchGeometry({anchorX,anchorY,childCenters,childTop});
      const allRelatives=[...branch.parents,...branch.children];
      relationPath(bloodLayer,'parent-line',`M${anchorX} ${anchorY} V${geometry.busY}`,allRelatives,state.selectedPersonId);
      if(geometry.needsHorizontalBus){
        relationPath(bloodLayer,'family-bus-line sibling-line',`M${geometry.busMinX} ${geometry.busY} H${geometry.busMaxX}`,allRelatives,state.selectedPersonId);
      }
      branch.children.forEach((childId,index)=>{
        relationPath(bloodLayer,'child-line',`M${childCenters[index]} ${geometry.busY} V${childPositions[index].y}`,[...branch.parents,childId],state.selectedPersonId);
      });
    }
    tree.append(relationshipLayer);

    for(const p of people){
      const pos=positions.get(p.id),job=p.id===state.playerId?jobs.get(p.id):null;
      const group=svg('g',{class:`tree-node ${p.alive?'':'dead'} ${p.id===state.selectedPersonId?'selected':''}`,transform:`translate(${pos.x} ${pos.y})`,tabindex:0,role:'button'});
      group.dataset.person=p.id;
      const status=!p.alive?'已故':p.id===state.playerId?(job?.label||'等待安排'):(p.age<16?'成长中':'家属');
      const workHint=p.id===state.playerId?'。右键指派工作':'';
      group.setAttribute('aria-label',`${p.name}，${Math.floor(p.age)}岁，${status}，健康${healthLabel(p.health)}${workHint}`);
      const titleText=p.id===state.playerId
        ? `${p.name} · ${Math.floor(p.age)}岁\n长期安排：${getAssignmentLabel(job?.planned||'idle')}\n今日状态：${status}\n健康：${healthLabel(p.health)}\n日收入参考：${job?.dailyIncome||0}钱\n劳动健康变化：${job?.healthDelta||0}/日（恢复需足粮）`
        : `${p.name} · ${Math.floor(p.age)}岁\n身份：${status}\n健康：${healthLabel(p.health)}\n家属不参与工作指派和挣钱任务。`;
      group.append(svg('title',{},titleText));
      group.append(svg('rect',{class:'tree-person-card',width:CARD_WIDTH,height:CARD_HEIGHT,rx:8}));
      group.append(svg('text',{x:CARD_WIDTH/2,y:19,'text-anchor':'middle',class:'tree-person-name'},brief(p.name)));
      group.append(svg('text',{x:CARD_WIDTH/2,y:34,'text-anchor':'middle',class:'tree-person-age'},`${Math.floor(p.age)}岁${p.id===state.playerId?' · 执笔人':''}`));
      const icon=p.id===state.playerId?(icons[job?.assignment]||''):'';
      const statusNode=svg('text',{x:CARD_WIDTH/2,y:52,'text-anchor':'middle',class:'tree-work-label'},`${icon} ${status}`);
      statusNode.dataset.job=p.id===state.playerId?(job?.assignment||'idle'):'family';group.append(statusNode);
      group.append(svg('rect',{x:14,y:61,width:CARD_WIDTH-28,height:4,rx:2,class:'tree-health-track'}));
      const bar=svg('rect',{x:14,y:61,width:(CARD_WIDTH-28)*Math.max(0,Math.min(100,p.health||0))/100,height:4,rx:2,class:'tree-health-fill'});
      bar.dataset.health=p.health<=35?'low':p.health<60?'tired':'good';group.append(bar);
      group.append(svg('text',{x:CARD_WIDTH/2,y:79,'text-anchor':'middle',class:'tree-health-value'},`健康 ${healthLabel(p.health)}`));
      group.addEventListener('click',()=>{hooks.select(p.id);hooks.render();});tree.append(group);
    }
  }
  function renderDetail(panel, person, state) {
    if(person.id !== state.playerId){
      const info=el('p','person-work-detail',person.alive
        ? `家属不参与工作指派和挣钱任务；健康 ${healthLabel(person.health)}`
        : `已故 · 最终健康 ${healthLabel(person.health)}`);
      panel.append(info);
      return;
    }
    const job=getFamilyWorkAssignments(state).find(j=>j.personId===person.id);
    const info=el('p','person-work-detail',person.alive
      ? `长期安排：${getAssignmentLabel(job?.planned||'idle')}；今日：${job?.label||'等待安排'}；健康 ${healthLabel(person.health)}`
      : `已故 · 最终健康 ${healthLabel(person.health)}`);
    panel.append(info);
    if(!person.alive)return;
    const button=el('button','assign-work-button','指派工作');button.type='button';
    button.addEventListener('click',()=>{const box=button.getBoundingClientRect();openMenu(person.id,box.x,box.y+box.height);});
    panel.append(button,el('small','work-detail-help','仅当前执笔人可以指派工作；也可右键执笔人，或键盘 Shift+F10。'));
  }
  return {renderTree,renderDetail,closeMenu};
}
