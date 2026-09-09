import {
  ORIGINS, REGIONS, createGame, deserializeState, serializeState,
  selectActivity, setRunning, advanceDay, resolveEvent, continueAs, performGuardianAction,
  listSuccessors, listGuardians, getActions, getChapter, getDateLabel, getFamilyTree,
  getRelations, getTimeline, getDailyFoodCost, getLandPrice, buyLand, selectPerson
} from './engine.js?v=1.2.0';

const $ = selector => document.querySelector(selector);
let state = null;
let activeTab = 'family';
let timer = null;
const storageKey = 'luanshi-jia-shu-v3';
const PROFESSION_LABELS = { farmer: '耕作者', trader: '商旅', clerk: '文书幕僚', soldier: '军旅', artisan: '工匠' };
const SPEEDS = { '1': 420, '5': 120, '20': 42 };
const HOURGLASS_SPEEDS = { '1': '1.8s', '5': '.9s', '20': '.38s' };

function save() {
  if (!state) return;
  try { localStorage.setItem(storageKey, serializeState(state)); }
  catch (error) { setNotice(`本机存档失败：${error.message}`, 'error'); }
}
function setNotice(message, kind = 'info') {
  const node = $('#notice'); if (!node) return;
  node.textContent = message; node.dataset.kind = kind;
  window.clearTimeout(setNotice.timer);
  setNotice.timer = window.setTimeout(() => { node.textContent = ''; }, 5200);
}
function stopTimer(reason = null) {
  if (timer) window.clearInterval(timer);
  timer = null;
  if (state) { state.running = false; if (reason) state.pauseReason = reason; }
}
function focusPendingDecision() {
  const target = state?.pendingEvent ? $('#event') : (state?.phase === 'succession' || state?.phase === 'guardian' ? $('#succession') : null);
  if (!target || target.hidden) return;
  window.requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }));
}
function startTimer() {
  if (!state) return;
  const result = setRunning(state, true);
  if (!result.ok) { setNotice(result.message, 'error'); render(); focusPendingDecision(); return; }
  stopTimer();
  state.running = true;
  const speed = $('#speed')?.value || '5';
  const interval = SPEEDS[speed] || SPEEDS['5'];
  timer = window.setInterval(stepOneDay, interval);
  setNotice('时间开始按天流逝。');
  render();
}
function stepOneDay() {
  if (!state || !state.running) { stopTimer(); return; }
  const result = advanceDay(state);
  save();
  render();
  if (!result.ok || result.paused || state.pendingEvent || state.phase !== 'playing' || state.endpoint) {
    stopTimer(result.reason || state.pauseReason || result.message || '时间暂停');
    render();
    focusPendingDecision();
  }
}
function pauseByPlayer() {
  if (!state || !state.running) return;
  stopTimer('玩家主动暂停');
  setRunning(state, false);
  setNotice('时间已手动暂停。');
  save(); render();
}
function startNewGame(event) {
  event?.preventDefault(); stopTimer();
  const surname = $('#surname').value.trim() || '沈';
  const origin = $('#origin').value;
  try { state = createGame({ surname, origin, seed: Date.now() }); }
  catch (error) { setNotice(error.message, 'error'); return; }
  $('#setup').hidden = true; $('#game').hidden = false; render(); save();
}
function loadSaved() {
  try {
    const saved = localStorage.getItem(storageKey) || localStorage.getItem('luanshi-jia-shu-v2');
    if (!saved) return false;
    state = deserializeState(saved); state.running = false;
    $('#setup').hidden = true; $('#game').hidden = false; render(); return true;
  } catch (error) {
    localStorage.removeItem(storageKey);
    setNotice(`旧存档未载入：${error.message}`, 'error');
    return false;
  }
}
function actionOptions(actionId) {
  return actionId === 'migrate' ? { destination: $('#destination')?.value } : {};
}
function onAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled || !state) return;
  stopTimer('重新选择行动');
  const id = button.dataset.action;
  const action = getActions(state).find(item => item.id === id);
  if (action?.risk && !window.confirm(`${action.risk}\n\n仍要把这项行动设为当前计划吗？`)) return;
  const result = selectActivity(state, id, actionOptions(id));
  setNotice(result.message, result.ok ? 'info' : 'error');
  if (result.ok) save(); render();
}

function renderHeader() {
  const current = state.playerId ? state.people[state.playerId] : null;
  $('#date').textContent = getDateLabel(state);
  $('#chapter').textContent = `第${getChapter(state).id}章 · ${getChapter(state).title}`;
  $('#money').textContent = state.resources.money.toFixed(1);
  $('#grain').textContent = state.resources.grain.toFixed(1);
  $('#land').textContent = `${state.resources.land}`;
  $('#reputation').textContent = state.resources.reputation.toFixed(1);
  $('#health').textContent = current ? `${Math.round(current.health)}` : '—';
  $('#hunger').textContent = state.resources.hunger.toFixed(1);
  $('#unrest').textContent = `${Math.round(state.unrest)}`;
  $('#preparation').textContent = `${Math.round(state.household.preparation)}`;
  $('#food-rate').textContent = `${getDailyFoodCost(state).toFixed(1)}/日`;
  $('#current-name').textContent = current ? `${current.name} · ${Math.floor(current.age)}岁` : '等待家族接续';
  $('#current-place').textContent = current ? `${current.location} · ${PROFESSION_LABELS[current.profession] || current.profession}` : '请从血缘后代中选择接续人';
  const action = getActions(state).find(item => item.id === state.currentActivity?.id);
  const progress = state.currentActivity?.duration ? ` · ${state.currentActivity.elapsed}/${state.currentActivity.duration}日` : '';
  $('#activity-line').textContent = action ? `当前行动：${action.icon} ${action.label}${progress}` : '当前行动：尚未选择';

  const blockedByEvent = Boolean(state.pendingEvent);
  $('#status-line').textContent = state.endpoint ? '350年1月1日 · 第一版纪事收束'
    : blockedByEvent ? `已自动暂停 · ${state.pauseReason || '事件发生'}。请先处理事件，再继续时间。`
    : state.phase === 'succession' ? '已自动暂停 · 等待血缘后代接续'
    : state.phase === 'guardian' ? '已自动暂停 · 等待监护安排'
    : state.running ? '时间正在按天流逝；可随时点击“暂停”'
    : (state.pauseReason || '选择行动后点击“开始时间”');

  const startButton = $('#start-time');
  const pauseButton = $('#pause-time');
  startButton.disabled = state.running || !state.currentActivity || state.phase !== 'playing' || blockedByEvent || state.endpoint;
  pauseButton.disabled = !state.running;
  startButton.textContent = blockedByEvent ? '先处理事件' : state.running ? '时间流逝中…' : '▶ 开始时间';
  pauseButton.textContent = state.running ? 'Ⅱ 暂停' : '已暂停';
  renderTimeFlow();
}
function renderTimeFlow() {
  const flow = $('#time-flow'); const flowDate = $('#flow-date'); const flowStatus = $('#flow-status');
  if (!flow || !flowDate || !flowStatus || !state) return;
  const speed = $('#speed')?.value || '5';
  flow.style.setProperty('--hourglass-speed', HOURGLASS_SPEEDS[speed] || HOURGLASS_SPEEDS['5']);
  flowDate.textContent = getDateLabel(state);
  const hasDecision = Boolean(state.pendingEvent) || state.phase === 'succession' || state.phase === 'guardian';
  flow.classList.toggle('running', Boolean(state.running));
  flow.classList.toggle('paused', !state.running && !hasDecision);
  flow.classList.toggle('event', hasDecision);
  if (state.endpoint) { flowStatus.textContent = '第一版纪事已经结束'; return; }
  if (state.pendingEvent) {
    flowStatus.textContent = state.pendingEvent.source === 'history' ? '重大历史发生 · 时间自动暂停'
      : state.pendingEvent.source === 'random' ? '事件发生 · 时间自动暂停' : '剧情事件发生 · 时间自动暂停';
    return;
  }
  if (state.phase === 'succession') { flowStatus.textContent = '等待后代继承 · 时间自动暂停'; return; }
  if (state.phase === 'guardian') { flowStatus.textContent = '等待监护安排 · 时间自动暂停'; return; }
  if (state.running) {
    const label = ({ '1': '1×', '5': '5×', '20': '20×' })[speed] || '5×';
    flowStatus.textContent = `时间流逝中 · ${label}`; return;
  }
  flowStatus.textContent = state.currentActivity ? '时间已暂停 · 点击开始继续' : '选择行动后开始时间';
}
function createActionCard(action) {
  const card = document.createElement('button');
  card.type = 'button'; card.className = `action-card ${action.selected ? 'selected' : ''}`;
  card.dataset.action = action.id; card.disabled = action.disabled;
  const title = document.createElement('strong'); title.textContent = `${action.icon} ${action.label}`;
  const description = document.createElement('span'); description.textContent = action.desc;
  const meta = document.createElement('small'); meta.textContent = action.risk || (action.kind === 'project' ? `计划用时：${action.duration}日` : '持续行动');
  card.append(title, description, meta); return card;
}
function renderActions() {
  const actions = getActions(state);
  const grid = $('#actions'); grid.replaceChildren();
  actions.forEach(action => grid.append(createActionCard(action)));
  const destination = $('#destination'); const previous = destination.value;
  destination.replaceChildren();
  Object.keys(REGIONS).filter(name => name !== state.region).forEach(name => {
    const option = document.createElement('option'); option.value = name; option.textContent = `${name} · 安全${REGIONS[name].safety}`; destination.append(option);
  });
  if ([...destination.options].some(option => option.value === previous)) destination.value = previous;
  destination.disabled = state.running || state.phase !== 'playing';
}
function renderTree() {
  const tree = $('#tree'); tree.replaceChildren();
  const people = getFamilyTree(state); if (!people.length) return;
  const maxGeneration = Math.max(0, ...people.map(person => person.generation));
  const width = Math.max(600, people.length * 150); const height = Math.max(270, 100 + maxGeneration * 88);
  tree.setAttribute('viewBox', `0 0 ${width} ${height}`); tree.setAttribute('width', width); tree.setAttribute('height', height); tree.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const positions = new Map(); const levels = new Map();
  people.forEach(person => { const list = levels.get(person.generation) || []; list.push(person); levels.set(person.generation, list); });
  for (const [generation, list] of levels) list.forEach((person, index) => positions.set(person.id, { x: ((index + 1) * width) / (list.length + 1), y: 50 + generation * 72 }));
  const lines = document.createElementNS('http://www.w3.org/2000/svg', 'g'); lines.setAttribute('class', 'tree-lines');
  people.forEach(person => { const from = positions.get(person.id); (person.parentIds || []).forEach(parentId => { const to = positions.get(parentId); if (!from || !to) return; const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); line.setAttribute('x1', from.x); line.setAttribute('y1', from.y - 19); line.setAttribute('x2', to.x); line.setAttribute('y2', to.y + 19); lines.append(line); }); });
  tree.append(lines);
  people.forEach(person => {
    const pos = positions.get(person.id); const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `tree-node ${person.alive ? '' : 'dead'} ${person.id === state.selectedPersonId ? 'selected' : ''}`); group.setAttribute('transform', `translate(${pos.x} ${pos.y})`); group.dataset.person = person.id;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); circle.setAttribute('r', '21');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text'); text.setAttribute('y', '39'); text.setAttribute('text-anchor', 'middle');
    const nameLine = document.createElementNS('http://www.w3.org/2000/svg', 'tspan'); nameLine.setAttribute('x', '0'); nameLine.textContent = person.name;
    const ageLine = document.createElementNS('http://www.w3.org/2000/svg', 'tspan'); ageLine.setAttribute('x', '0'); ageLine.setAttribute('dy', '13'); ageLine.textContent = `${person.age}岁`;
    text.append(nameLine, ageLine); group.append(circle, text); group.addEventListener('click', () => { selectPerson(state, person.id); renderTree(); renderPerson(); }); tree.append(group);
  });
}
function renderPerson() {
  const person = state.people[state.selectedPersonId] || state.people[state.playerId]; const panel = $('#person-detail'); panel.replaceChildren(); if (!person) return;
  const heading = document.createElement('h3'); heading.textContent = person.name;
  const body = document.createElement('p'); body.textContent = `${person.alive ? '在世' : '已故'} · ${Math.floor(person.age)}岁 · ${person.location} · ${PROFESSION_LABELS[person.profession] || person.profession}`;
  const relation = document.createElement('p'); relation.textContent = person.spouseId ? `配偶：${state.people[person.spouseId]?.name || '关系待查'}` : '未见婚姻关系';
  const hunger = Number(person.hunger) || 0;
  const hungerLabel = hunger >= 100 ? '濒临饿死' : hunger >= 80 ? '严重饥饿' : hunger >= 60 ? '饥饿' : hunger >= 30 ? '有些饿' : '温饱';
  const hungerLine = document.createElement('p'); hungerLine.textContent = `饥饿 ${Math.round(hunger)} · ${hungerLabel}`;
  const skills = document.createElement('p'); skills.textContent = `学识 ${person.skills.knowledge.toFixed(1)} · 武艺 ${person.skills.martial.toFixed(1)} · 商才 ${person.skills.trade.toFixed(1)}`;
  const pregnancy = person.pregnancy ? document.createElement('p') : null;
  if (pregnancy) pregnancy.textContent = `孕期：预计约 ${person.pregnancy.remainingDays} 日后生产`;
  panel.append(heading, body, relation, hungerLine, skills); if (pregnancy) panel.append(pregnancy);
}
function renderRelations() {
  const node = $('#relations'); node.replaceChildren(); const list = getRelations(state);
  if (!list.length) { node.textContent = '家门尚无姻亲记录。'; return; }
  list.filter(relation => relation.from < relation.to).forEach(relation => { const p = document.createElement('p'); p.textContent = `${state.people[relation.from]?.name || '—'} ↔ ${state.people[relation.to]?.name || '—'} · ${relation.type} · 信任 ${relation.trust}`; node.append(p); });
}
function renderAssets() {
  const node = $('#assets'); node.replaceChildren(); const title = document.createElement('h3'); title.textContent = '产业与家门'; node.append(title);
  const summary = document.createElement('p'); summary.textContent = `田产 ${state.household.land} 亩 · 钱 ${state.resources.money.toFixed(1)} · 粮 ${state.resources.grain.toFixed(1)} · 每日口粮 ${getDailyFoodCost(state).toFixed(1)} · 平均饥饿 ${state.resources.hunger.toFixed(1)} · 凝聚 ${Math.round(state.family.cohesion)}`; node.append(summary);
  const purchase = document.createElement('div'); purchase.className = 'land-purchase';
  const purchaseTitle = document.createElement('strong'); purchaseTitle.textContent = '购买田地 · 扩充田产'; purchase.append(purchaseTitle);
  [1, 3, 5].forEach(amount => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'land-buy';
    const price = getLandPrice(state, amount); button.textContent = `买${amount}亩 · ${price}钱`; button.disabled = !Number.isFinite(price) || state.resources.money < price || state.running || state.phase !== 'playing' || Boolean(state.pendingEvent);
    button.addEventListener('click', () => { const result = buyLand(state, amount); setNotice(result.message, result.ok ? 'info' : 'error'); if (result.ok) save(); render(); }); purchase.append(button);
  });
  node.append(purchase);
  state.assets.forEach(asset => { const p = document.createElement('p'); p.textContent = `${asset.name} · ${asset.location} · 估值 ${asset.value}`; node.append(p); });
}
function renderTimeline() {
  const node = $('#timeline'); node.replaceChildren(); getTimeline(state).forEach(event => { const row = document.createElement('div'); row.className = `timeline-row ${event.occurred ? 'occurred' : ''}`; const year = document.createElement('strong'); year.textContent = `${event.year}`; const title = document.createElement('span'); title.textContent = event.title; const status = document.createElement('small'); status.textContent = event.occurred ? '已发生' : '未到'; row.append(year, title, status); node.append(row); });
}
function renderLog() {
  const node = $('#log'); node.replaceChildren(); state.eventLog.slice(-12).reverse().forEach(event => { const row = document.createElement('article'); row.className = `log-row ${event.kind}`; const meta = document.createElement('small'); meta.textContent = `${event.year}年${event.month || 1}月${event.day || 1}日 · ${event.title}`; const text = document.createElement('p'); text.textContent = event.text; row.append(meta, text); node.append(row); });
}
function renderSuccession() {
  const panel = $('#succession'); panel.hidden = !(state.phase === 'succession' || state.phase === 'guardian'); panel.replaceChildren(); if (panel.hidden) return;
  const title = document.createElement('h2'); title.textContent = state.phase === 'guardian' ? '先完成监护' : '家书等待接续'; panel.append(title);
  const hint = document.createElement('p'); hint.textContent = state.phase === 'guardian' ? '幼年后代已获血缘资格，请选择一位成年家人完成监护安排。' : '只有始祖血缘后代可以接过家书，配偶与母亲会留在家谱中但不能继承。'; panel.append(hint);
  const people = state.phase === 'guardian' ? listGuardians(state) : listSuccessors(state);
  people.forEach(person => { const row = document.createElement('div'); row.className = 'succession-row'; const label = document.createElement('span'); label.textContent = `${person.name} · ${Math.floor(person.age)}岁 · ${person.location}`; const button = document.createElement('button'); button.type = 'button'; button.textContent = state.phase === 'guardian' ? '由此人保护' : '让此人接续'; button.addEventListener('click', () => { const result = state.phase === 'guardian' ? performGuardianAction(state, person.id, 'protect') : continueAs(state, person.id); setNotice(result.message, result.ok ? 'info' : 'error'); if (result.ok) save(); render(); }); row.append(label, button); panel.append(row); });
}
function renderEvent() {
  const panel = $('#event'); panel.hidden = !state.pendingEvent; panel.replaceChildren(); if (!state.pendingEvent) return;
  const event = state.pendingEvent; const title = document.createElement('h2'); title.textContent = event.title; const text = document.createElement('p'); text.textContent = event.text; panel.append(title, text);
  event.options.forEach(option => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'event-option';
    const strong = document.createElement('strong'); strong.textContent = option.label;
    const consequence = document.createElement('span'); consequence.textContent = option.consequence;
    button.append(strong, consequence);
    button.addEventListener('click', () => {
      const result = resolveEvent(state, event.id, option.id);
      if (result.ok) {
        setNotice('事件已处理，当前行动会保留；点击“开始时间”即可继续。');
        save();
      } else setNotice(result.message, 'error');
      render();
    });
    panel.append(button);
  });
}
function renderTabs() {
  document.querySelectorAll('[data-tab]').forEach(button => button.classList.toggle('active', button.dataset.tab === activeTab));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.hidden = panel.id !== `tab-${activeTab}`);
  if (activeTab === 'family') { renderTree(); renderPerson(); } else if (activeTab === 'relations') renderRelations(); else if (activeTab === 'assets') renderAssets(); else renderTimeline();
}
function render() {
  if (!state) return;
  renderHeader(); renderActions(); renderTabs(); renderLog(); renderEvent(); renderSuccession();
  $('#game').classList.toggle('ended', state.endpoint);
}
function exportSave() {
  try { const blob = new Blob([serializeState(state)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `乱世家书-${state.surname}-${state.year}-${state.month}-${state.day}.json`; link.click(); URL.revokeObjectURL(link.href); setNotice('家书 JSON 已导出。'); } catch (error) { setNotice(`导出失败：${error.message}`, 'error'); }
}
function importSave(event) {
  const file = event.target.files?.[0]; if (!file) return; stopTimer();
  const reader = new FileReader(); reader.onload = () => { try { state = deserializeState(String(reader.result)); $('#setup').hidden = true; $('#game').hidden = false; save(); render(); setNotice('家书已导入。时间保持暂停，请自行继续。'); } catch (error) { setNotice(`导入失败：${error.message}`, 'error'); } event.target.value = ''; }; reader.readAsText(file);
}
function showSetup() { stopTimer(); state = null; $('#game').hidden = true; $('#setup').hidden = false; }

function init() {
  Object.entries(ORIGINS).forEach(([id, origin]) => { const option = document.createElement('option'); option.value = id; option.textContent = `${origin.label} · ${origin.desc}`; $('#origin').append(option); });
  $('#setup-form').addEventListener('submit', startNewGame);
  $('#actions').addEventListener('click', onAction);
  $('#start-time').addEventListener('click', startTimer);
  $('#pause-time').addEventListener('click', pauseByPlayer);
  $('#speed').addEventListener('change', () => { if (state?.running) startTimer(); });
  $('#export').addEventListener('click', exportSave); $('#import').addEventListener('change', importSave); $('#new-game').addEventListener('click', showSetup);
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => { activeTab = button.dataset.tab; renderTabs(); }));
  loadSaved();
}
window.addEventListener('beforeunload', () => { if (state) save(); });
window.addEventListener('DOMContentLoaded', init);
