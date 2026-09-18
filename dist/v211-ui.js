const VERSION = '1.11.2';

const VIEW_DEFS = Object.freeze([
  { id:'livelihood', label:'谋生', icon:'🔨', title:'谋生之道', hint:'一分耕耘，一分收获。选择合适的谋生方式，为家族积累财富。', actions:['trade'] },
  { id:'study', label:'求学', icon:'📖', title:'求学问道', hint:'读书明理，积累学识，为仕途与家门声望打下根基。', actions:['study'] },
  { id:'farming', label:'农耕', icon:'🌱', title:'田庄农事', hint:'经营田地、农工与收成，让一家人的口粮有稳定来源。', tab:'assets', focus:'farm' },
  { id:'military', label:'军旅', icon:'⚔️', title:'军旅建功', hint:'乱世从军，习武立功；机遇与风险始终相伴。', actions:['enlist'] },
  { id:'household', label:'家事', icon:'🏮', title:'家门内务', hint:'料理家门、婚育与传承，让家族在乱世中延续。', actions:['manage','marry','child'] },
  { id:'assets', label:'产业', icon:'🏪', title:'产业经营', hint:'经营田地与各类产业，积累可以传给后人的家业。', tab:'assets' },
  { id:'relations', label:'关系', icon:'🤝', title:'人际往来', hint:'查看亲疏、往来与态度变化，经营乱世中的人情网络。', tab:'relations' },
  { id:'family', label:'家族树', icon:'🌳', title:'家族传承', hint:'查看血缘、婚姻与后代接续，让家书代代相传。', tab:'family' },
  { id:'timeline', label:'历史', icon:'📜', title:'乱世纪年', hint:'个人命运之外，是不会停下来的时代。', tab:'timeline' },
  { id:'rest', label:'休养', icon:'🍵', title:'休养生息', hint:'暂缓奔波，恢复体力，为下一段路积蓄力量。', actions:['rest'] },
  { id:'migration', label:'迁徙', icon:'🐎', title:'迁徙远行', hint:'筹备路费和干粮，再选择目的地举家迁移。', actions:['prepare','migrate'] }
]);

let activeView = 'livelihood';
let mounted = false;
let renderQueued = false;

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const textOf = node => String(node?.textContent || '').trim();

function create(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function currentState() {
  return window.__luanshiState || null;
}

function createPrimaryNavigation() {
  let nav = $('#v211-primary-nav');
  if (nav) return nav;

  nav = create('aside', 'v211-nav wood-panel');
  nav.id = 'v211-primary-nav';

  const heading = create('header', 'v211-nav-heading');
  heading.append(
    create('small', '', '乱 世 家 书'),
    create('h2', '', '家族事务'),
    create('p', '', '修身齐家 · 立业传世')
  );

  const list = create('nav', 'v211-nav-list');
  list.setAttribute('aria-label', '家族事务导航');

  VIEW_DEFS.forEach(def => {
    const button = create('button', 'v211-nav-button');
    button.type = 'button';
    button.dataset.v211View = def.id;
    button.setAttribute('aria-pressed', 'false');

    const icon = create('span', 'v211-nav-icon', def.icon);
    icon.setAttribute('aria-hidden', 'true');
    const copy = create('span', 'v211-nav-copy');
    copy.append(create('strong', '', def.label), create('small', '', def.hint));
    const arrow = create('span', 'v211-nav-arrow', '›');
    arrow.setAttribute('aria-hidden', 'true');
    button.append(icon, copy, arrow);
    button.addEventListener('click', () => setView(def.id, true));
    list.append(button);
  });

  const foot = create('div', 'v211-nav-foot');
  foot.append(create('strong', '', '积 厚 流 光'), create('small', '', '一门家业 · 代代相承'));

  nav.append(heading, list, foot);
  return nav;
}

function ensureDetailHeader() {
  let header = $('#v211-detail-header');
  if (header) return header;

  header = create('header', 'v211-detail-header');
  header.id = 'v211-detail-header';

  const icon = create('span', 'v211-detail-icon');
  icon.id = 'v211-detail-icon';
  const copy = create('div', 'v211-detail-copy');
  copy.append(create('h2', '', ''), create('p', '', ''));
  const seal = create('span', 'v211-seal', '家书');
  const art = create('div', 'v211-banner-art');
  art.setAttribute('aria-hidden', 'true');

  header.append(icon, copy, seal, art);
  return header;
}

function ensureEmbeddedTabs() {
  let host = $('#v211-tab-host');
  if (!host) {
    host = create('div', 'v211-tab-host');
    host.id = 'v211-tab-host';
  }
  for (const id of ['family','relations','assets','timeline']) {
    const panel = $('#tab-' + id);
    if (panel && panel.parentElement !== host) host.append(panel);
  }
  return host;
}

function ensureActionView() {
  let host = $('#v211-action-host');
  if (!host) {
    host = create('div', 'v211-action-host');
    host.id = 'v211-action-host';
  }
  const actions = $('#actions');
  const section = actions?.closest('section');
  if (section && section.parentElement !== host) host.append(section);

  const destination = $('.destination-label');
  if (destination && destination.parentElement !== host) host.append(destination);
  return host;
}

function ensureSupportView() {
  let host = $('#v211-support-host');
  if (!host) {
    host = create('div', 'v211-support-host');
    host.id = 'v211-support-host';
  }
  for (const selector of ['#event','#succession','#month-report','.chronicle']) {
    const node = $(selector);
    if (node && node.parentElement !== host) host.append(node);
  }
  return host;
}

function createPaperCard(id, title, icon) {
  const card = create('section', 'v211-paper-card');
  card.id = id;
  const head = create('header', 'v211-paper-card-head');
  head.append(create('span', 'v211-paper-icon', icon), create('h2', '', title));
  const body = create('div', 'v211-paper-card-body');
  card.append(head, body);
  return card;
}

function ensureRightColumn() {
  let right = $('#v211-right');
  if (right) return right;
  right = create('aside', 'v211-right');
  right.id = 'v211-right';

  const taskRail = createPaperCard('v211-task-rail', '当前任务', '主');
  const preview = createPaperCard('v211-preview', '本次行动预览', '⌕');
  const turnRail = createPaperCard('v211-turn-rail', '下个月', '⏳');

  right.append(taskRail, preview, turnRail);
  return right;
}

function createDashboardCard(id, title, buttonLabel, viewId) {
  const card = create('section', 'v211-dashboard-card');
  card.id = id;
  const head = create('header', 'v211-dashboard-head');
  head.append(create('h2', '', title));
  if (buttonLabel && viewId) {
    const button = create('button', 'v211-dashboard-link', buttonLabel);
    button.type = 'button';
    button.addEventListener('click', () => setView(viewId, true));
    head.append(button);
  }
  card.append(head, create('div', 'v211-dashboard-body'));
  return card;
}

function ensureDashboard() {
  let dash = $('#v211-bottom-dashboard');
  if (dash) return dash;

  dash = create('section', 'v211-bottom-dashboard');
  dash.id = 'v211-bottom-dashboard';

  dash.append(
    createDashboardCard('v211-family-card', '家族树', '查看族谱 ›', 'family'),
    createDashboardCard('v211-relations-card', '人际关系', '查看关系 ›', 'relations'),
    createDashboardCard('v211-assets-card', '产业一览', '进入产业 ›', 'assets')
  );
  return dash;
}

function ensureShell() {
  if (mounted) return true;

  const game = $('#game');
  const status = $('#compact-status');
  if (!game || !status || !$('#actions') || !$('#detail-tabs-shell')) return false;

  document.body.classList.add('v211-ui');

  const shell = create('section', 'v211-shell');
  shell.id = 'v211-layout';

  const left = createPrimaryNavigation();
  const main = create('main', 'v211-main paper-panel');
  main.id = 'v211-main';
  const right = ensureRightColumn();
  const dashboard = ensureDashboard();

  main.append(
    ensureDetailHeader(),
    create('div', 'v211-alerts'),
    ensureActionView(),
    ensureEmbeddedTabs(),
    ensureSupportView()
  );

  shell.append(left, main, right, dashboard);
  status.insertAdjacentElement('afterend', shell);

  const oldWorkspace = $('#primary-workspace');
  if (oldWorkspace) oldWorkspace.hidden = true;
  const oldTabs = $('#detail-tabs-shell');
  if (oldTabs) oldTabs.classList.add('v211-source-tabs');

  mounted = true;
  return true;
}

function ensureTopbar() {
  const status = $('#compact-status');
  const topbar = status?.querySelector('.topbar');
  const resources = status?.querySelector('.resource-strip');
  if (!status || !topbar || !resources) return;

  status.classList.add('v211-top-frame');
  topbar.classList.add('v211-topbar');
  topbar.firstElementChild?.classList.add('v211-date-block');

  const existingMenu = $('#v211-settings');
  if (!existingMenu) {
    const tools = create('div', 'v211-top-tools');
    const journal = create('button', 'v211-top-tool');
    journal.type = 'button';
    journal.innerHTML = '<span>📖</span><small>日志</small>';
    journal.addEventListener('click', () => {
      $('.chronicle')?.setAttribute('open','');
      $('.chronicle')?.scrollIntoView({behavior:'smooth',block:'center'});
    });
    const achievement = create('button', 'v211-top-tool');
    achievement.type = 'button';
    achievement.innerHTML = '<span>🏆</span><small>成就</small>';
    achievement.addEventListener('click', () => setView('timeline', true));

    const settings = document.createElement('details');
    settings.id = 'v211-settings';
    settings.className = 'v211-settings';
    const summary = create('summary', 'v211-top-tool');
    summary.innerHTML = '<span>⚙️</span><small>设置</small>';
    settings.append(summary);
    const topActions = topbar.querySelector('.top-actions');
    if (topActions) settings.append(topActions);

    tools.append(journal, achievement, settings);
    topbar.append(tools);
  }

  const tools = $('.v211-top-tools', topbar);
  if (resources.parentElement !== topbar) {
    if (tools) topbar.insertBefore(resources, tools);
    else topbar.append(resources);
  }
  resources.classList.add('v211-resource-row');

  $('#compact-person-summary')?.classList.add('v211-hidden-secondary');
  $('.compact-extra-row')?.classList.add('v211-hidden-secondary');
}

function applyVersion() {
  const title = '乱世家书 · V1.11.2 右栏优化版';
  if (document.title !== title) document.title = title;
  $$('.topbar .eyebrow, #setup .eyebrow').forEach(node => {
    node.textContent = node.closest('#setup')
      ? 'V1.11.2 右栏优化版 · 290年1月1日'
      : '乱世家书 · V1.11.2';
  });
}

function hiddenTabButton(tab) {
  return $('#detail-tabs-shell .tabs [data-tab="' + tab + '"]');
}

function viewDef(id=activeView) {
  return VIEW_DEFS.find(item => item.id === id) || VIEW_DEFS[0];
}

function decorateActions(def) {
  const cards = $$('#actions .action-card');
  const allowed = new Set(def.actions || []);
  cards.forEach(card => {
    card.classList.add('v211-action-row');
    card.hidden = !allowed.has(card.dataset.action);
    ensureActionThumb(card);
  });
  $('.destination-label')?.toggleAttribute('hidden', activeView !== 'migration');
}

function ensureActionThumb(card) {
  if (card.querySelector('.v211-action-thumb')) return;
  const title = textOf(card.querySelector('strong'));
  const thumb = create('span', 'v211-action-thumb');
  thumb.setAttribute('aria-hidden','true');
  thumb.textContent =
    /短工|谋生/.test(title) ? '🔨' :
    /求学|读书/.test(title) ? '📚' :
    /军旅|从军/.test(title) ? '⚔️' :
    /休养/.test(title) ? '🍵' :
    /迁徙|筹备/.test(title) ? '🐎' :
    /家门|婚|添丁/.test(title) ? '🏮' : '📜';
  card.prepend(thumb);
}

function showActionView(def) {
  $('#v211-action-host').hidden = false;
  $('#v211-tab-host').hidden = true;
  decorateActions(def);
}

function showTabView(def) {
  $('#v211-action-host').hidden = true;
  $('#v211-tab-host').hidden = false;

  const tabButton = hiddenTabButton(def.tab);
  if (tabButton && !tabButton.classList.contains('active')) tabButton.click();

  $$('#v211-tab-host .tab-panel').forEach(panel => {
    panel.hidden = panel.id !== 'tab-' + def.tab;
  });
}

function setView(id, focus=false) {
  activeView = VIEW_DEFS.some(v => v.id === id) ? id : 'livelihood';
  syncView();
  if (focus && matchMedia('(max-width: 900px)').matches) {
    $('#v211-main')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
}

function syncView() {
  if (!mounted) return;
  const def = viewDef();

  $$('#v211-primary-nav [data-v211-view]').forEach(button => {
    const active = button.dataset.v211View === activeView;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const header = $('#v211-detail-header');
  if (header) {
    text(header.querySelector('#v211-detail-icon'), def.icon);
    text(header.querySelector('h2'), def.title);
    text(header.querySelector('p'), def.hint);
    text(header.querySelector('.v211-seal'), def.label);
    header.dataset.view = def.id;
  }

  if (def.tab) showTabView(def);
  else showActionView(def);

  updateRightCards();
}

function text(node, value) {
  if (node && node.textContent !== String(value)) node.textContent = String(value);
}

function selectedActionCard() {
  return $('#actions .action-card.selected') || $('#actions .action-card:not([hidden])');
}

function estimateMonthlyIncome(card) {
  const source = textOf(card);
  let match = source.match(/长期平均约\s*(\d+(?:\.\d+)?)钱\/日/);
  if (match) return '约 ' + (Number(match[1]) * 30).toFixed(1) + '钱';
  match = source.match(/收入\s*(\d+(?:\.\d+)?)钱\/日/);
  if (match) return '约 ' + (Number(match[1]) * 30).toFixed(1) + '钱';
  return '按日结算';
}

function updateRightCards() {
  const preview = $('#v211-preview .v211-paper-card-body');
  if (!preview) return;

  preview.replaceChildren();
  const card = selectedActionCard();
  const selected = card?.classList.contains('selected');
  const actionName = textOf(card?.querySelector('strong')) || viewDef().title;
  const rows = [
    ['🔨','行动类型', actionName],
    ['◉','预计月收入', estimateMonthlyIncome(card)],
    ['♥','体力影响', selected ? '按当前计划结算' : '选择后显示'],
    ['☯','可能事件', '关键事件会自动暂停']
  ];
  rows.forEach(([icon,label,value]) => {
    const row = create('div','v211-preview-row');
    row.append(create('span','v211-preview-icon',icon), create('span','v211-preview-label',label), create('strong','',value));
    preview.append(row);
  });
  const scene = create('div','v211-preview-scene');
  scene.append(create('span','', '世间生计千万种'), create('strong','', '但行好事 · 莫问前程'));
  preview.append(scene);
}

function updateDashboard() {
  updateTaskCard();
  updateFamilyCard();
  updateRelationsCard();
  updateAssetsCard();
  updateTurnCard();
}

function dashboardBody(id) {
  return $('#' + id + ' .v211-dashboard-body');
}

function updateTaskCard() {
  const body = $('#v211-task-rail .v211-paper-card-body');
  const goal = $('#next-goal-panel');
  if (!body || !goal) return;
  if (goal.parentElement !== body) body.append(goal);
  goal.classList.add('v211-task-inner');
}

function player() {
  const s=currentState();
  return s?.people?.[s.playerId] || null;
}

function updateFamilyCard() {
  const body = dashboardBody('v211-family-card');
  if (!body) return;
  body.replaceChildren();
  const s=currentState(), p=player();
  if (!s || !p) { body.textContent='等待开局'; return; }

  const main=create('div','v211-family-main');
  main.append(create('span','', '👤'), create('strong','', p.name), create('small','', Math.floor(p.age||0)+'岁 · 家主'));
  body.append(main);

  const ids = [...new Set([...(p.parentIds||[]), p.parentId, p.spouseId, ...(p.childrenIds||[])].filter(Boolean))].slice(0,4);
  const row=create('div','v211-family-row');
  ids.forEach(id=>{
    const person=s.people?.[id]; if(!person)return;
    const node=create('div','v211-family-node');
    node.append(create('strong','',person.name),create('small','',(person.alive?'在世':'已故')+' · '+Math.floor(person.age||0)+'岁'));
    row.append(node);
  });
  if (!row.children.length) row.append(create('div','v211-empty','尚无其他家人'));
  body.append(row);
}

function updateRelationsCard() {
  const body=dashboardBody('v211-relations-card');
  if(!body)return;
  body.replaceChildren();
  const s=currentState(),p=player();
  if(!s||!p){body.textContent='等待开局';return;}
  const ids=[p.spouseId,...(p.parentIds||[]),...(p.childrenIds||[])].filter(Boolean).slice(0,4);
  ids.forEach((id,index)=>{
    const person=s.people?.[id]; if(!person)return;
    const row=create('div','v211-relation-row');
    row.append(create('span','v211-avatar','👤'));
    const copy=create('span','v211-relation-copy');
    copy.append(create('strong','',person.name),create('small','',(person.location||'同地')+' · '+(person.alive?'在世':'已故')));
    row.append(copy,create('span','v211-mood',['🙂','🟢','😐','🟡'][index%4]));
    body.append(row);
  });
  if(!body.children.length)body.append(create('div','v211-empty','尚无已建立关系'));
}

function updateAssetsCard() {
  const body=dashboardBody('v211-assets-card');
  if(!body)return;
  body.replaceChildren();
  const s=currentState();
  if(!s){body.textContent='等待开局';return;}
  const rows=[
    ['🌿','田地',(s.household?.land ?? s.resources?.land ?? 0)+'亩'],
    ['◉','现金',Number(s.resources?.money||0).toFixed(1)],
    ['🌾','粮食',Number(s.resources?.grain||0).toFixed(1)]
  ];
  const counts=new Map();
  (s.assets||[]).forEach(asset=>{
    const name=asset.name||asset.type||'产业';
    counts.set(name,(counts.get(name)||0)+1);
  });
  for(const [name,count] of counts){ if(rows.length>=5)break; rows.push(['🏠',name,String(count)]); }
  rows.forEach(([icon,name,value])=>{
    const row=create('div','v211-asset-row');
    row.append(create('span','',icon),create('strong','',name),create('b','',value));
    body.append(row);
  });
}

function updateTurnCard() {
  const body = $('#v211-turn-rail .v211-paper-card-body');
  if (!body) return;
  const controls = $('#v180-month-controls');
  if (controls && controls.parentElement !== body) body.append(controls);
  const guide = $('#v182-early-guide');
  if (guide && guide.parentElement !== body) body.prepend(guide);
  const button = $('#advance-month');
  if (button) {
    button.classList.add('v211-next-month');
    const value = textOf(button);
    if (/度过\d+月|度过本月/.test(value)) button.textContent = '⏳ 下个月 ›';
  }
}

function moveSupportPanels() {
  const support=$('#v211-support-host');
  if(!support)return;
  for(const selector of ['#event','#succession','#month-report','.chronicle']){
    const node=$(selector);
    if(node && node.parentElement!==support)support.append(node);
  }
  const destination=$('.destination-label');
  if(destination && destination.parentElement!==$('#v211-action-host'))$('#v211-action-host').append(destination);
}

function enforceVersionLater() {
  applyVersion();
  window.setTimeout(applyVersion, 40);
}

function renderShell() {
  if (!ensureShell()) return;
  ensureTopbar();
  ensureEmbeddedTabs();
  ensureActionView();
  moveSupportPanels();
  syncView();
  updateDashboard();
  enforceVersionLater();
}

function queueRender() {
  if(renderQueued)return;
  renderQueued=true;
  requestAnimationFrame(()=>{
    renderQueued=false;
    renderShell();
  });
}

function init() {
  renderShell();
  [0,80,240,600].forEach(delay => window.setTimeout(renderShell, delay));
  window.addEventListener('luanshi:rendered', queueRender);
  window.addEventListener('luanshi:statechange', queueRender);
  document.addEventListener('click', event=>{
    const target=event.target instanceof Element ? event.target : null;
    if(!target)return;
    if(target.closest('.action-card') || target.closest('.event-option') || target.closest('.business-buy') || target.closest('.land-buy') || target.closest('#advance-month')){
      window.setTimeout(queueRender,0);
    }
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
