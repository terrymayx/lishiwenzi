import {
  ORIGINS, REGIONS, createGame, deserializeState, serializeState, performAction,
  resolveEvent, continueAs, performGuardianAction, listSuccessors, listGuardians,
  getActions, getChapter, getDateLabel, getFamilyTree, getRelations, getTimeline, selectPerson,
  QUARTER_NAMES
} from './engine.js';

const $ = selector => document.querySelector(selector);
let state = null;
let activeTab = 'family';
const storageKey = 'luanshi-jia-shu-v2';
const PROFESSION_LABELS = { farmer: '耕作者', trader: '商旅', clerk: '文书幕僚', soldier: '军旅', artisan: '工匠' };

function save() {
  if (!state) return;
  try { localStorage.setItem(storageKey, serializeState(state)); } catch (error) { setNotice(`本机存档失败：${error.message}`); }
}
function setNotice(message, kind = 'info') {
  const node = $('#notice'); if (!node) return;
  node.textContent = message; node.dataset.kind = kind;
  window.clearTimeout(setNotice.timer); setNotice.timer = window.setTimeout(() => { node.textContent = ''; }, 5200);
}
function startNewGame(event) {
  event?.preventDefault();
  const surname = $('#surname').value.trim() || '沈';
  const origin = $('#origin').value;
  try { state = createGame({ surname, origin, seed: Date.now() }); } catch (error) { setNotice(error.message, 'error'); return; }
  $('#setup').hidden = true; $('#game').hidden = false; render(); save();
}
function loadSaved() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return false;
    state = deserializeState(saved); $('#setup').hidden = true; $('#game').hidden = false; render(); return true;
  } catch { localStorage.removeItem(storageKey); return false; }
}
function actionOptions(actionId) {
  if (actionId !== 'migrate') return { confirmRisk: true };
  const destination = $('#destination')?.value;
  return { destination, confirmRisk: true };
}
function onAction(event) {
  const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
  const id = button.dataset.action;
  const action = getActions(state).find(item => item.id === id);
  if (action?.risk && !window.confirm(`${action.risk}\n\n仍要执行吗？`)) return;
  const result = performAction(state, id, actionOptions(id));
  if (!result.ok) { setNotice(result.message, 'error'); render(); return; }
  setNotice(result.message); save(); render();
}
function renderHeader() {
  const current = state.playerId ? state.people[state.playerId] : null;
  $('#date').textContent = getDateLabel(state);
  $('#chapter').textContent = `第${getChapter(state).id}章 · ${getChapter(state).title}`;
  $('#money').textContent = `${state.resources.money}`;
  $('#grain').textContent = `${state.resources.grain}`;
  $('#land').textContent = `${state.resources.land}`;
  $('#reputation').textContent = `${state.resources.reputation}`;
  $('#health').textContent = current ? `${Math.round(current.health)}` : '—';
  $('#unrest').textContent = `${state.unrest}`;
  $('#preparation').textContent = `${state.household.preparation}`;
  $('#current-name').textContent = current ? `${current.name} · ${Math.floor(current.age)}岁` : '等待家族接续';
  $('#current-place').textContent = current ? `${current.location} · ${PROFESSION_LABELS[current.profession] || current.profession}` : '请从血缘后代中选择接续人';
  $('#status-line').textContent = state.endpoint ? '350年春 · 第一版纪事收束' : (state.pendingEvent ? '本章家书待选择' : (state.phase === 'succession' ? '家书暂停 · 等待接续' : state.phase === 'guardian' ? '家书暂停 · 等待监护' : '本季可各执行一项主行动与家务'));
}
function createActionCard(action) {
  const card = document.createElement('button'); card.type = 'button'; card.className = 'action-card'; card.dataset.action = action.id; card.disabled = action.disabled;
  const title = document.createElement('strong'); title.textContent = `${action.icon} ${action.label}`;
  const description = document.createElement('span'); description.textContent = action.desc;
  const meta = document.createElement('small'); meta.textContent = action.risk || action.cost;
  card.append(title, description, meta); return card;
}
function renderActions() {
  const actions = getActions(state);
  const main = $('#main-actions'); const family = $('#family-actions'); main.replaceChildren(); family.replaceChildren();
  actions.filter(action => action.slot === 'main').forEach(action => main.append(createActionCard(action)));
  actions.filter(action => action.slot === 'family').forEach(action => family.append(createActionCard(action)));
  const destination = $('#destination'); const previousDestination = destination.value; destination.replaceChildren();
  Object.keys(REGIONS).filter(name => name !== state.region).forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = `${name} · 安全${REGIONS[name].safety}`; destination.append(option); });
  if ([...destination.options].some(option => option.value === previousDestination)) destination.value = previousDestination;
  destination.disabled = state.actionSlots.main !== null || state.phase !== 'playing';
}
function renderTree() {
  const tree = $('#tree'); tree.replaceChildren();
  const people = getFamilyTree(state); if (!people.length) return;
  const maxGeneration = Math.max(0, ...people.map(person => person.generation)); const width = Math.max(600, people.length * 150); const height = Math.max(270, 100 + maxGeneration * 88); tree.setAttribute('viewBox', `0 0 ${width} ${height}`); tree.setAttribute('width', width); tree.setAttribute('height', height); tree.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const positions = new Map(); const levels = new Map(); people.forEach(person => { const list = levels.get(person.generation) || []; list.push(person); levels.set(person.generation, list); });
  for (const [generation, list] of levels) list.forEach((person, index) => positions.set(person.id, { x: ((index + 1) * width) / (list.length + 1), y: 50 + generation * 72 }));
  const lines = document.createElementNS('http://www.w3.org/2000/svg', 'g'); lines.setAttribute('class', 'tree-lines');
  people.forEach(person => { const from = positions.get(person.id); (person.parentIds || []).forEach(parentId => { const to = positions.get(parentId); if (!from || !to) return; const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); line.setAttribute('x1', from.x); line.setAttribute('y1', from.y - 19); line.setAttribute('x2', to.x); line.setAttribute('y2', to.y + 19); lines.append(line); }); }); tree.append(lines);
  people.forEach(person => { const pos = positions.get(person.id); const group = document.createElementNS('http://www.w3.org/2000/svg', 'g'); group.setAttribute('class', `tree-node ${person.alive ? '' : 'dead'} ${person.id === state.selectedPersonId ? 'selected' : ''}`); group.setAttribute('transform', `translate(${pos.x} ${pos.y})`); group.dataset.person = person.id; const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); circle.setAttribute('r', '21'); const text = document.createElementNS('http://www.w3.org/2000/svg', 'text'); text.setAttribute('y', '39'); text.setAttribute('text-anchor', 'middle'); const nameLine = document.createElementNS('http://www.w3.org/2000/svg', 'tspan'); nameLine.setAttribute('x', '0'); nameLine.textContent = person.name; const ageLine = document.createElementNS('http://www.w3.org/2000/svg', 'tspan'); ageLine.setAttribute('x', '0'); ageLine.setAttribute('dy', '13'); ageLine.textContent = `${person.age}岁`; text.append(nameLine, ageLine); group.append(circle, text); group.addEventListener('click', () => { selectPerson(state, person.id); renderTree(); renderPerson(); }); tree.append(group); });
}
function renderPerson() {
  const person = state.people[state.selectedPersonId] || state.people[state.playerId]; const panel = $('#person-detail'); panel.replaceChildren(); if (!person) return;
  const heading = document.createElement('h3'); heading.textContent = person.name; const body = document.createElement('p'); body.textContent = `${person.alive ? '在世' : '已故'} · ${Math.floor(person.age)}岁 · ${person.location} · ${PROFESSION_LABELS[person.profession] || person.profession}`; const relation = document.createElement('p'); relation.textContent = person.spouseId ? `配偶：${state.people[person.spouseId]?.name || '关系待查'}` : '未见婚姻关系'; const skills = document.createElement('p'); skills.textContent = `学识 ${person.skills.knowledge.toFixed(1)} · 武艺 ${person.skills.martial.toFixed(1)} · 商才 ${person.skills.trade.toFixed(1)}`; panel.append(heading, body, relation, skills);
}
function renderRelations() {
  const node = $('#relations'); node.replaceChildren(); const list = getRelations(state); if (!list.length) { node.textContent = '家门尚无姻亲记录。'; return; }
  list.filter(relation => relation.from < relation.to).forEach(relation => { const p = document.createElement('p'); p.textContent = `${state.people[relation.from]?.name || '—'} ↔ ${state.people[relation.to]?.name || '—'} · ${relation.type} · 信任 ${relation.trust}`; node.append(p); });
}
function renderAssets() {
  const node = $('#assets'); node.replaceChildren(); const title = document.createElement('h3'); title.textContent = '产业与家门'; node.append(title); const summary = document.createElement('p'); summary.textContent = `田产 ${state.household.land} 亩 · 钱 ${state.resources.money} · 粮 ${state.resources.grain} · 凝聚 ${Math.round(state.family.cohesion)}`; node.append(summary); state.assets.forEach(asset => { const p = document.createElement('p'); p.textContent = `${asset.name} · ${asset.location} · 估值 ${asset.value}`; node.append(p); });
}
function renderTimeline() {
  const node = $('#timeline'); node.replaceChildren(); getTimeline(state).forEach(event => { const row = document.createElement('div'); row.className = `timeline-row ${event.occurred ? 'occurred' : ''}`; const year = document.createElement('strong'); year.textContent = `${event.year}`; const title = document.createElement('span'); title.textContent = event.title; const status = document.createElement('small'); status.textContent = event.occurred ? '已发生' : '未到'; row.append(year, title, status); node.append(row); });
}
function renderLog() {
  const node = $('#log'); node.replaceChildren(); state.eventLog.slice(-8).reverse().forEach(event => { const row = document.createElement('article'); row.className = `log-row ${event.kind}`; const meta = document.createElement('small'); meta.textContent = `${event.year}${QUARTER_NAMES[event.quarter - 1] || ''} · ${event.title}`; const text = document.createElement('p'); text.textContent = event.text; row.append(meta, text); node.append(row); });
}
function renderSuccession() {
  const panel = $('#succession'); panel.hidden = !(state.phase === 'succession' || state.phase === 'guardian'); panel.replaceChildren(); if (panel.hidden) return;
  const title = document.createElement('h2'); title.textContent = state.phase === 'guardian' ? '先完成监护' : '家书等待接续'; panel.append(title); const hint = document.createElement('p'); hint.textContent = state.phase === 'guardian' ? '幼年后代已获血缘资格，请选择一位成年家人完成一项监护行动。' : '只有始祖血缘后代可以接过家书，配偶与母亲会留在家谱中但不能继承。'; panel.append(hint);
  const people = state.phase === 'guardian' ? listGuardians(state) : listSuccessors(state); people.forEach(person => { const row = document.createElement('div'); row.className = 'succession-row'; const label = document.createElement('span'); label.textContent = `${person.name} · ${Math.floor(person.age)}岁 · ${person.location}`; const button = document.createElement('button'); button.type = 'button'; button.textContent = state.phase === 'guardian' ? '由此人保护' : '让此人接续'; button.addEventListener('click', () => { const result = state.phase === 'guardian' ? performGuardianAction(state, person.id, 'protect') : continueAs(state, person.id); setNotice(result.message, result.ok ? 'info' : 'error'); if (result.ok) save(); render(); }); row.append(label, button); panel.append(row); });
}
function renderEvent() {
  const panel = $('#event'); panel.hidden = !state.pendingEvent; panel.replaceChildren(); if (!state.pendingEvent) return; const event = state.pendingEvent; const title = document.createElement('h2'); title.textContent = event.title; const text = document.createElement('p'); text.textContent = event.text; panel.append(title, text); event.options.forEach(option => { const button = document.createElement('button'); button.type = 'button'; button.className = 'event-option'; const strong = document.createElement('strong'); strong.textContent = option.label; const consequence = document.createElement('span'); consequence.textContent = option.consequence; button.append(strong, consequence); button.addEventListener('click', () => { const result = resolveEvent(state, event.id, option.id); setNotice(result.message, result.ok ? 'info' : 'error'); if (result.ok) save(); render(); }); panel.append(button); });
}
function renderTabs() {
  document.querySelectorAll('[data-tab]').forEach(button => button.classList.toggle('active', button.dataset.tab === activeTab));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.hidden = panel.id !== `tab-${activeTab}`);
  if (activeTab === 'family') { renderTree(); renderPerson(); } else if (activeTab === 'relations') renderRelations(); else if (activeTab === 'assets') renderAssets(); else renderTimeline();
}
function render() {
  if (!state) return; renderHeader(); renderActions(); renderTabs(); renderLog(); renderEvent(); renderSuccession(); $('#game').classList.toggle('ended', state.endpoint);
}
function exportSave() {
  try { const blob = new Blob([serializeState(state)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `乱世家书-${state.surname}-${state.year}.json`; link.click(); URL.revokeObjectURL(link.href); setNotice('家书 JSON 已导出。'); } catch (error) { setNotice(`导出失败：${error.message}`, 'error'); }
}
function importSave(event) {
  const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { state = deserializeState(String(reader.result)); $('#setup').hidden = true; $('#game').hidden = false; save(); render(); setNotice('家书已导入并通过严格校验。'); } catch (error) { setNotice(`导入失败：${error.message}`, 'error'); } event.target.value = ''; }; reader.readAsText(file);
}
function showSetup() { state = null; $('#game').hidden = true; $('#setup').hidden = false; }

function init() {
  Object.entries(ORIGINS).forEach(([id, origin]) => { const option = document.createElement('option'); option.value = id; option.textContent = `${origin.label} · ${origin.desc}`; $('#origin').append(option); });
  $('#setup-form').addEventListener('submit', startNewGame); $('#main-actions').addEventListener('click', onAction); $('#family-actions').addEventListener('click', onAction); $('#export').addEventListener('click', exportSave); $('#import').addEventListener('change', importSave); $('#new-game').addEventListener('click', showSetup);
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => { activeTab = button.dataset.tab; renderTabs(); }));
  loadSaved();
}

window.addEventListener('DOMContentLoaded', init);

