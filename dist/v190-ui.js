const VERSION = '1.9.0.1';

const NAV_ITEMS = Object.freeze([
  Object.freeze({ id: 'livelihood', label: '谋生', icon: '🔨', kind: 'action', patterns: ['谋生', '短工', '行商', '经商'] }),
  Object.freeze({ id: 'study', label: '求学', icon: '📜', kind: 'action', patterns: ['读书', '求学'] }),
  Object.freeze({ id: 'farming', label: '农耕', icon: '🌱', kind: 'action', patterns: ['耕作', '农耕', '田间'] }),
  Object.freeze({ id: 'military', label: '军旅', icon: '⚔️', kind: 'action', patterns: ['军旅', '投身军旅'] }),
  Object.freeze({ id: 'household', label: '家事', icon: '🏮', kind: 'action', patterns: ['料理家门', '婚事', '添丁', '家门'] }),
  Object.freeze({ id: 'rest', label: '休养', icon: '🍵', kind: 'action', patterns: ['休养'] }),
  Object.freeze({ id: 'migration', label: '迁徙', icon: '🐎', kind: 'action', patterns: ['迁徙'] }),
  Object.freeze({ id: 'assets', label: '产业', icon: '🏪', kind: 'tab', tab: 'assets' }),
  Object.freeze({ id: 'relations', label: '关系', icon: '🤝', kind: 'tab', tab: 'relations' }),
  Object.freeze({ id: 'family', label: '家族树', icon: '🌳', kind: 'tab', tab: 'family' }),
  Object.freeze({ id: 'timeline', label: '历史', icon: '📖', kind: 'tab', tab: 'timeline' })
]);

let currentView = 'livelihood';
let syncQueued = false;

function state() {
  return window.__luanshiState || null;
}

function applyVersionLabel() {
  const title = '乱世家书 · V1.9.0.1 古风经营台';
  if (document.title !== title) document.title = title;
  document.querySelectorAll('.topbar .eyebrow, #setup .eyebrow').forEach(node => {
    const text = node.textContent || '';
    if (!/乱世家书|V1\.8\.|V1\.9\./.test(text)) return;
    node.textContent = node.closest('#setup')
      ? 'V1.9.0.1 古风经营台 · 290年1月1日'
      : '乱世家书 · V1.9.0.1';
  });
}

function createNav() {
  let nav = document.querySelector('#v190-command-nav');
  if (nav) return nav;
  const grid = document.querySelector('.v184-command-grid');
  if (!grid) return null;

  nav = document.createElement('nav');
  nav.id = 'v190-command-nav';
  nav.className = 'v190-command-nav';
  nav.setAttribute('aria-label', '本月操作台导航');

  const title = document.createElement('div');
  title.className = 'v190-nav-title';
  title.innerHTML = '<strong>本月操作台</strong><small>选择一项，向右展开</small>';
  nav.append(title);

  const list = document.createElement('div');
  list.className = 'v190-nav-list';
  NAV_ITEMS.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'v190-nav-button';
    button.dataset.v190View = item.id;
    button.setAttribute('aria-pressed', 'false');

    const icon = document.createElement('span');
    icon.className = 'v190-nav-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = item.icon;

    const copy = document.createElement('span');
    copy.className = 'v190-nav-copy';
    const strong = document.createElement('strong');
    strong.textContent = item.label;
    const small = document.createElement('small');
    small.textContent = item.kind === 'tab'
      ? ({ assets: '经营产业，积累财富', relations: '经营人脉，查看关系', family: '查看族谱，传承家业', timeline: '回看乱世大事' }[item.id] || '查看详情')
      : ({ livelihood: '获取收入，维持生计', study: '提升学识与声望', farming: '经营田庄，准备收成', military: '从军习武，建立功业', household: '婚育家事，维系家门', rest: '恢复体力与健康', migration: '迁往他地，另谋发展' }[item.id] || '安排本月行动');
    copy.append(strong, small);

    const arrow = document.createElement('span');
    arrow.className = 'v190-nav-arrow';
    arrow.textContent = '›';

    button.append(icon, copy, arrow);
    button.addEventListener('click', () => setView(item.id, true));
    list.append(button);
  });
  nav.append(list);
  grid.prepend(nav);
  return nav;
}

function ensureDetailHeader() {
  const slot = document.querySelector('#v184-action-slot');
  if (!slot) return null;
  let header = slot.querySelector('#v190-detail-header');
  if (header) return header;
  header = document.createElement('header');
  header.id = 'v190-detail-header';
  header.className = 'v190-detail-header';
  const icon = document.createElement('span');
  icon.className = 'v190-detail-icon';
  const copy = document.createElement('div');
  const title = document.createElement('h2');
  const desc = document.createElement('p');
  copy.append(title, desc);
  header.append(icon, copy);
  slot.prepend(header);
  return header;
}

function ensureTabArea() {
  const slot = document.querySelector('#v184-action-slot');
  if (!slot) return null;
  let area = slot.querySelector('#v190-tab-area');
  if (!area) {
    area = document.createElement('div');
    area.id = 'v190-tab-area';
    area.className = 'v190-tab-area';
    slot.append(area);
  }
  ['family', 'relations', 'assets', 'timeline'].forEach(tab => {
    const panel = document.querySelector('#tab-' + tab);
    if (panel && panel.parentElement !== area) area.append(panel);
  });
  return area;
}

function actionSection() {
  return document.querySelector('#actions')?.closest('section') || null;
}

function itemById(id) {
  return NAV_ITEMS.find(item => item.id === id) || NAV_ITEMS[0];
}

function cardMatches(card, patterns) {
  const text = (card.textContent || '').replace(/\s+/g, '');
  return patterns.some(pattern => text.includes(pattern));
}

function showActionGroup(item) {
  const section = actionSection();
  const area = ensureTabArea();
  if (area) area.hidden = true;
  if (!section) return;
  section.hidden = false;
  const cards = [...document.querySelectorAll('#actions .action-card')];
  let visible = 0;
  cards.forEach(card => {
    const match = cardMatches(card, item.patterns || []);
    card.hidden = !match;
    if (match) visible += 1;
  });

  if (!visible) {
    cards.forEach(card => {
      const fallback = item.id === 'livelihood' && !cardMatches(card, ['读书', '军旅', '耕作', '农耕', '休养', '迁徙', '料理家门', '婚', '添丁']);
      card.hidden = !fallback;
      if (fallback) visible += 1;
    });
  }

  section.dataset.v190Empty = visible ? 'false' : 'true';
}

function showTab(item) {
  const section = actionSection();
  if (section) section.hidden = true;
  const area = ensureTabArea();
  if (area) area.hidden = false;

  const tabButton = document.querySelector('#detail-tabs-shell .tabs [data-tab="' + item.tab + '"]')
    || document.querySelector('[data-tab="' + item.tab + '"]');

  // 稳定修复：只有真正切换页签时才触发旧版 tab 点击。
  // 已经处于目标页签时重复 click 会重新 renderAssets/renderTree，
  // 再叠加 DOM 监听就会形成反复重排和页面抖动。
  if (tabButton && !tabButton.classList.contains('active')) {
    tabButton.click();
  }

  const panel = document.querySelector('#tab-' + item.tab);
  if (panel) panel.hidden = false;
}

function updateHeader(item) {
  const header = ensureDetailHeader();
  if (!header) return;
  const icon = header.querySelector('.v190-detail-icon');
  const title = header.querySelector('h2');
  const desc = header.querySelector('p');
  icon.textContent = item.icon;
  title.textContent = item.label;
  desc.textContent = item.kind === 'tab'
    ? ({ assets: '在此管理田地与各类产业，发展经济，积累家业。', relations: '查看家门内外的人际关系与亲疏变化。', family: '查看血缘、婚姻与后代传承，了解家族延续。', timeline: '回顾已经发生与即将到来的重大历史节点。' }[item.id] || '查看详细资料。')
    : ({ livelihood: '通过劳动与谋生获取收入，是前期维持家计的基础。', study: '持续读书求学，积累学识，为仕途与家族声望做准备。', farming: '把本月精力投入田庄农事，影响当季耕作与收成。', military: '投身军旅，在乱世中积累武艺、功劳与风险。', household: '处理婚育与家门事务，让家族在乱世中延续。', rest: '停止高强度劳动，恢复体力并降低健康风险。', migration: '筹备迁往新的地区，寻找更适合家族生存的发展空间。' }[item.id] || '安排当前月份的主要行动。');
}

function syncNav() {
  document.querySelectorAll('[data-v190-view]').forEach(button => {
    const active = button.dataset.v190View === currentView;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function setView(id, focus = false) {
  const item = itemById(id);
  currentView = item.id;
  updateHeader(item);
  if (item.kind === 'tab') showTab(item);
  else showActionGroup(item);
  syncNav();
  if (focus && window.matchMedia('(max-width: 900px)').matches) {
    document.querySelector('#v184-action-slot')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function syncNextMonthButton() {
  const button = document.querySelector('#advance-month');
  if (!button) return;
  const current = state();
  const text = button.textContent || '';
  if (/度过\d+月|度过本月/.test(text)) button.textContent = '⏳ 下个月';
  else if (/选择行动后继续本月/.test(text)) button.textContent = '先选择本月行动';
  const hint = document.querySelector('.v180-month-hint');
  if (hint) hint.textContent = '执行当前月计划并进入下个月；重大历史或关键事件会在月中自动暂停。';

  if (current && !current.currentActivity && !/事件|接续|结束|结算/.test(button.textContent || '')) {
    button.textContent = '先选择本月行动';
  }
}

function decorateCommandCenter() {
  const center = document.querySelector('#v184-command-center');
  if (!center) return;
  center.classList.add('v190-ancient-command-center');
  const eyebrow = center.querySelector('.v184-command-head .eyebrow');
  if (eyebrow) eyebrow.textContent = '寒门经营';
  const title = center.querySelector('.v184-command-head strong');
  if (title) title.textContent = '本月操作台';

  const actionSlot = document.querySelector('#v184-action-slot');
  if (actionSlot) actionSlot.classList.add('v190-main-detail');
  const goalSlot = document.querySelector('#v184-goal-slot');
  if (goalSlot) goalSlot.classList.add('v190-goal-column');
  const turnSlot = document.querySelector('#v184-turn-slot');
  if (turnSlot) turnSlot.classList.add('v190-turn-column');
}

function hideLegacyNavigation() {
  document.querySelector('.v183-nav-root')?.setAttribute('hidden', '');
  document.querySelector('#v185-mobile-side-nav')?.setAttribute('hidden', '');
  document.querySelector('#v185-mobile-menu')?.setAttribute('hidden', '');
}

function syncWorkspace() {
  applyVersionLabel();
  decorateCommandCenter();
  createNav();
  ensureDetailHeader();
  ensureTabArea();
  hideLegacyNavigation();
  syncNextMonthButton();
  setView(currentView, false);
}

function scheduleSync() {
  if (syncQueued) return;
  syncQueued = true;
  window.setTimeout(() => {
    syncQueued = false;
    syncWorkspace();
  }, 24);
}

function init() {
  // 稳定修复：不再监听整个 #game 子树的 DOM 变化。
  // 家族树、关系、产业、历史本身会重建 DOM；监听这些变化再同步工作台
  // 会反向触发页签渲染，造成循环重排。只响应明确的游戏渲染/状态事件即可。
  syncWorkspace();
}

if (typeof window !== 'undefined') {
  window.addEventListener('luanshi:rendered', scheduleSync);
  window.addEventListener('luanshi:statechange', scheduleSync);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}
