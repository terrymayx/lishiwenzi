const VERSION = '1.11.0';

const VIEW_META = Object.freeze({
  livelihood: { title: '谋生之道', subtitle: '一分耕耘，一分收获。选择合适的谋生方式，为家族积累财富。', seal: '谋生', icon: '🔨' },
  study: { title: '求学问道', subtitle: '读书明理，积累学识，为仕途与家门声望打下根基。', seal: '求学', icon: '📖' },
  farming: { title: '农耕田庄', subtitle: '经营田产，安排农事，把一家人的生计牢牢握在手里。', seal: '农耕', icon: '🌱' },
  military: { title: '军旅建功', subtitle: '乱世从军，习武立功；机遇与风险始终相伴。', seal: '军旅', icon: '⚔️' },
  household: { title: '家门内务', subtitle: '婚育、家事与传承，是一个家族在乱世延续的根本。', seal: '家事', icon: '🏮' },
  rest: { title: '休养生息', subtitle: '暂缓奔波，恢复体力与健康，为下一段路积蓄力量。', seal: '休养', icon: '🍵' },
  migration: { title: '迁徙远行', subtitle: '审时度势，迁居他地，为家门寻找新的生路。', seal: '迁徙', icon: '🐎' },
  assets: { title: '产业经营', subtitle: '经营田地与各类产业，积累家底，让家业由薄转厚。', seal: '产业', icon: '🏪' },
  relations: { title: '人际往来', subtitle: '查看亲疏、往来与态度变化，经营乱世中的人情网络。', seal: '关系', icon: '🤝' },
  family: { title: '家族传承', subtitle: '查看血缘、婚姻、后代与接续，让家书代代相传。', seal: '家族', icon: '🌳' },
  timeline: { title: '乱世纪年', subtitle: '回顾已经发生与即将到来的时代大事。', seal: '历史', icon: '📜' }
});

const ROLE_LABELS = Object.freeze({
  player: '自己',
  spouse: '配偶',
  child: '子女',
  mother: '母亲',
  father: '父亲',
  sibling: '手足',
  guardian: '监护'
});

let syncQueued = false;

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function state() {
  return window.__luanshiState || null;
}

function textOf(node) {
  return String(node?.textContent || '').trim();
}

function addClass(node, className) {
  if (node && !node.classList.contains(className)) node.classList.add(className);
}

function currentView() {
  return $('.v190-nav-button.active')?.dataset.v190View
    || $('[data-v190-view][aria-pressed="true"]')?.dataset.v190View
    || 'livelihood';
}

function applyVersion() {
  document.title = '乱世家书 · V1.11.0 图2同款界面重构版';
  $$('.topbar .eyebrow, #setup .eyebrow').forEach(node => {
    const text = textOf(node);
    if (!/乱世家书|V1\.(?:8|9|10|11)\./.test(text)) return;
    node.textContent = node.closest('#setup')
      ? 'V1.11.0 图2同款界面重构版 · 290年1月1日'
      : '乱世家书 · V1.11.0';
  });
}

function ensureTopBar() {
  const status = $('#compact-status');
  const topbar = status?.querySelector('.topbar');
  const resources = status?.querySelector('.resource-strip');
  if (!status || !topbar || !resources) return;

  document.body.classList.add('v210-target-ui');
  addClass(status, 'v210-top-frame');
  addClass(topbar, 'v210-topbar');

  const dateBlock = topbar.firstElementChild;
  if (dateBlock) addClass(dateBlock, 'v210-date-block');

  if (resources.parentElement !== topbar) {
    const utility = $('#v184-utility-menu');
    if (utility && utility.parentElement === topbar) topbar.insertBefore(resources, utility);
    else topbar.append(resources);
  }
  addClass(resources, 'v210-resource-row');

  let icons = $('#v210-top-icons');
  if (!icons) {
    icons = document.createElement('div');
    icons.id = 'v210-top-icons';
    icons.className = 'v210-top-icons';

    const entries = [
      ['日志', '📖', () => {
        const chronicle = $('.chronicle');
        if (chronicle) {
          chronicle.open = true;
          chronicle.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }],
      ['成就', '🏆', () => {
        document.querySelector('[data-v190-view="timeline"]')?.click();
      }],
      ['设置', '⚙️', () => {
        const menu = $('#v184-utility-menu');
        if (menu) menu.open = !menu.open;
      }]
    ];

    entries.forEach(([label, icon, handler]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'v210-top-icon-button';
      button.innerHTML = '<span aria-hidden="true">' + icon + '</span><small>' + label + '</small>';
      button.addEventListener('click', handler);
      icons.append(button);
    });
    topbar.append(icons);
  }

  const utility = $('#v184-utility-menu');
  if (utility) {
    addClass(utility, 'v210-utility-menu');
    utility.hidden = false;
  }

  const summary = $('#compact-person-summary');
  if (summary) addClass(summary, 'v210-person-summary');
}

function createPaperCard(id, title, icon) {
  const article = document.createElement('article');
  article.id = id;
  article.className = 'v210-paper-card';

  const head = document.createElement('header');
  head.className = 'v210-paper-card-head';
  const badge = document.createElement('span');
  badge.className = 'v210-paper-card-icon';
  badge.textContent = icon;
  const h = document.createElement('strong');
  h.textContent = title;
  head.append(badge, h);

  const body = document.createElement('div');
  body.className = 'v210-paper-card-body';

  article.append(head, body);
  return article;
}

function ensureTargetLayout() {
  const center = $('#v184-command-center');
  const oldGrid = center?.querySelector('.v184-command-grid');
  const nav = $('#v190-command-nav');
  const actionSlot = $('#v184-action-slot');
  const goalSlot = $('#v184-goal-slot');
  const turnSlot = $('#v184-turn-slot');
  if (!center || !oldGrid || !nav || !actionSlot || !goalSlot || !turnSlot) return null;

  addClass(center, 'v210-game-frame');

  let layout = $('#v210-layout');
  if (!layout) {
    layout = document.createElement('section');
    layout.id = 'v210-layout';
    layout.className = 'v210-layout';

    const left = document.createElement('aside');
    left.id = 'v210-left-column';
    left.className = 'v210-left-column';

    const middle = document.createElement('main');
    middle.id = 'v210-middle-column';
    middle.className = 'v210-middle-column';

    const right = document.createElement('aside');
    right.id = 'v210-right-column';
    right.className = 'v210-right-column';

    const bottom = document.createElement('section');
    bottom.id = 'v210-bottom-dashboard';
    bottom.className = 'v210-bottom-dashboard';

    const help = createPaperCard('v210-help-card', '操作说明', '!');
    const preview = createPaperCard('v210-preview-card', '本次行动预览', '⌕');
    right.append(help, preview);

    const family = document.createElement('section');
    family.id = 'v210-family-summary';
    family.className = 'v210-dashboard-card v210-family-summary';

    const relations = document.createElement('section');
    relations.id = 'v210-relations-summary';
    relations.className = 'v210-dashboard-card v210-relations-summary';

    const assets = document.createElement('section');
    assets.id = 'v210-assets-summary';
    assets.className = 'v210-dashboard-card v210-assets-summary';

    left.append(nav);
    middle.append(actionSlot);
    bottom.append(goalSlot, family, relations, assets, turnSlot);
    layout.append(left, middle, right, bottom);

    oldGrid.replaceWith(layout);
  }

  decorateTargetColumns();
  moveLegacySupport();
  return layout;
}

function decorateTargetColumns() {
  addClass($('#v190-command-nav'), 'v210-side-nav');
  addClass($('#v184-action-slot'), 'v210-main-stage');
  addClass($('#v184-goal-slot'), 'v210-task-card');
  addClass($('#v184-turn-slot'), 'v210-turn-card');

  const navTitle = $('#v190-command-nav .v190-nav-title strong');
  const navSubtitle = $('#v190-command-nav .v190-nav-title small');
  if (navTitle) navTitle.textContent = '家族事务';
  if (navSubtitle) navSubtitle.textContent = '修身齐家 · 立业传世';

  $$('#v190-command-nav .v190-nav-button').forEach(button => addClass(button, 'v210-nav-button'));

  const header = $('#v190-detail-header');
  if (header) addClass(header, 'v210-stage-banner');

  const stage = $('#v184-action-slot');
  if (stage) {
    let art = stage.querySelector('.v210-banner-art');
    if (!art) {
      art = document.createElement('div');
      art.className = 'v210-banner-art';
      header?.append(art);
    }
    let motto = stage.querySelector('.v210-stage-motto');
    if (!motto) {
      motto = document.createElement('span');
      motto.className = 'v210-stage-motto';
      motto.textContent = '世间生计千万种，但行好事，莫问前程';
      header?.append(motto);
    }
  }

  $$('.action-card').forEach(card => {
    addClass(card, 'v210-action-row');
    ensureActionThumb(card);
  });

  const advance = $('#advance-month');
  if (advance) addClass(advance, 'v210-next-month');
}

function ensureActionThumb(card) {
  if (card.querySelector('.v210-action-thumb')) return;
  const title = textOf(card.querySelector('strong'));
  const thumb = document.createElement('span');
  thumb.className = 'v210-action-thumb';
  let icon = '🧰';
  if (/短工|劳力|杂役/.test(title)) icon = '🔨';
  else if (/行商|贸易|经商/.test(title)) icon = '🪙';
  else if (/读书|求学/.test(title)) icon = '📚';
  else if (/耕作|农耕/.test(title)) icon = '🌾';
  else if (/军旅|从军/.test(title)) icon = '⚔️';
  else if (/休养/.test(title)) icon = '🍵';
  else if (/迁徙/.test(title)) icon = '🐎';
  else if (/家门|婚|添丁/.test(title)) icon = '🏮';
  thumb.textContent = icon;
  card.prepend(thumb);
}

function moveLegacySupport() {
  const stage = $('#v184-action-slot');
  if (!stage) return;

  let support = $('#v210-support');
  if (!support) {
    support = document.createElement('div');
    support.id = 'v210-support';
    support.className = 'v210-support';
    stage.append(support);
  }

  const nodes = [
    document.querySelector('.destination-label'),
    $('#event'),
    $('#succession'),
    $('#month-report'),
    document.querySelector('.chronicle')
  ].filter(Boolean);

  nodes.forEach(node => {
    if (node.parentElement !== support) support.append(node);
  });

  const rightPreviewBody = $('#v210-preview-card .v210-paper-card-body');
  const timeFlow = $('#time-flow');
  const statusLine = $('#status-line');
  if (rightPreviewBody) {
    if (timeFlow && timeFlow.parentElement !== rightPreviewBody) rightPreviewBody.append(timeFlow);
    if (statusLine && statusLine.parentElement !== rightPreviewBody) rightPreviewBody.append(statusLine);
  }

  const legacy = $('#primary-workspace');
  if (legacy) {
    addClass(legacy, 'v210-legacy-hidden');
    legacy.setAttribute('aria-hidden', 'true');
  }
}

function updateStageHeader() {
  const view = currentView();
  const meta = VIEW_META[view] || VIEW_META.livelihood;
  const header = $('#v190-detail-header');
  if (!header) return;

  const icon = header.querySelector('.v190-detail-icon');
  const h2 = header.querySelector('h2');
  const p = header.querySelector('p');

  if (icon) icon.textContent = meta.icon;
  if (h2) h2.textContent = meta.title;
  if (p) p.textContent = meta.subtitle;

  let seal = header.querySelector('.v210-red-seal');
  if (!seal) {
    seal = document.createElement('span');
    seal.className = 'v210-red-seal';
    header.append(seal);
  }
  seal.textContent = meta.seal;

  const motto = header.querySelector('.v210-stage-motto');
  if (motto) {
    motto.hidden = ['assets', 'relations', 'family', 'timeline'].includes(view);
  }
}

function getSelectedActionCard() {
  return $('.action-card.selected') || $('.action-card:not([hidden])');
}

function parseMetric(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1] || match[0];
  }
  return null;
}

function updateHelpAndPreview() {
  const helpBody = $('#v210-help-card .v210-paper-card-body');
  const previewBody = $('#v210-preview-card .v210-paper-card-body');
  if (!helpBody || !previewBody) return;

  const view = currentView();
  const meta = VIEW_META[view] || VIEW_META.livelihood;

  helpBody.innerHTML =
    '<p>选择左侧行动项目，再点击具体选项即可安排本月行动。</p>' +
    '<p>行动期间仍按天结算收入、口粮、体力、健康、产业与农业。</p>' +
    '<div class="v210-help-art" aria-hidden="true">☁︎　⌁　🏯　⌁　☁︎</div>';

  const keepNodes = [$('#time-flow'), $('#status-line')].filter(Boolean);
  const previousDynamic = previewBody.querySelector('.v210-preview-dynamic');
  previousDynamic?.remove();

  const dynamic = document.createElement('div');
  dynamic.className = 'v210-preview-dynamic';

  const card = getSelectedActionCard();
  const fullText = textOf(card);
  const actionTitle = textOf(card?.querySelector('strong')) || meta.title;
  const income = parseMetric(fullText, [
    /(?:收入|收益)[^\d+-]*([+-]?\d+(?:\.\d+)?(?:钱|两)?\/日)/,
    /([+-]?\d+(?:\.\d+)?(?:钱|两)\/日)/
  ]) || '按日结算';
  const stamina = parseMetric(fullText, [
    /体力[^\d-]*(-?\d+(?:\.\d+)?)/,
    /消耗[^\d-]*(-?\d+(?:\.\d+)?)/
  ]) || '按行动规则';

  const rows = [
    ['🔨', '行动类型', actionTitle],
    ['◉', '预计月收入', income],
    ['♥', '体力消耗', stamina],
    ['☯', '可能事件', '重大或关键事件会自动暂停']
  ];

  rows.forEach(([icon, label, value]) => {
    const row = document.createElement('div');
    row.className = 'v210-preview-row';
    row.innerHTML =
      '<span class="v210-preview-icon">' + icon + '</span>' +
      '<span class="v210-preview-label">' + label + '</span>' +
      '<strong>' + value + '</strong>';
    dynamic.append(row);
  });

  const landscape = document.createElement('div');
  landscape.className = 'v210-preview-landscape';
  landscape.innerHTML = '<span>世间生计千万种</span><strong>但行好事 · 莫问前程</strong>';
  dynamic.append(landscape);

  previewBody.prepend(dynamic);
  keepNodes.forEach(node => {
    if (node.parentElement !== previewBody) previewBody.append(node);
  });
}

function dashboardHeader(card, title, actionLabel, action) {
  card.replaceChildren();
  const head = document.createElement('header');
  head.className = 'v210-dashboard-head';
  const strong = document.createElement('strong');
  strong.textContent = title;
  head.append(strong);
  if (actionLabel) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'v210-dashboard-link';
    button.textContent = actionLabel;
    button.addEventListener('click', action);
    head.append(button);
  }
  const body = document.createElement('div');
  body.className = 'v210-dashboard-body';
  card.append(head, body);
  return body;
}

function livingPeople(current) {
  return Object.values(current?.people || {}).filter(person => person && person.alive);
}

function updateFamilySummary() {
  const card = $('#v210-family-summary');
  if (!card) return;
  const body = dashboardHeader(
    card,
    '家族树（缩略）',
    '查看完整家族树',
    () => $('[data-v190-view="family"]')?.click()
  );

  const current = state();
  if (!current) {
    body.textContent = '等待开局';
    return;
  }
  const player = current.people?.[current.playerId];
  if (!player) {
    body.textContent = '暂无家族资料';
    return;
  }

  const main = document.createElement('div');
  main.className = 'v210-family-main-node';
  main.innerHTML = '<span>👤</span><strong>' + player.name + '</strong><small>' + Math.floor(player.age || 0) + '岁 · 家主</small>';
  body.append(main);

  const row = document.createElement('div');
  row.className = 'v210-family-mini-row';

  const people = livingPeople(current).filter(person => person.id !== player.id).slice(0, 4);
  if (!people.length) {
    const empty = document.createElement('div');
    empty.className = 'v210-family-empty';
    empty.textContent = '尚无其他在世家人';
    row.append(empty);
  } else {
    people.forEach(person => {
      const node = document.createElement('div');
      node.className = 'v210-family-mini-node';
      node.innerHTML =
        '<span>●</span><strong>' + person.name + '</strong><small>' +
        (ROLE_LABELS[person.role] || person.role || '家人') + ' · ' + Math.floor(person.age || 0) + '岁</small>';
      row.append(node);
    });
  }
  body.append(row);
}

function relationshipLabel(person) {
  if (!person) return '往来';
  if (person.role && ROLE_LABELS[person.role]) return ROLE_LABELS[person.role];
  return person.profession || '往来';
}

function updateRelationsSummary() {
  const card = $('#v210-relations-summary');
  if (!card) return;
  const body = dashboardHeader(
    card,
    '人际关系',
    '查看关系图',
    () => $('[data-v190-view="relations"]')?.click()
  );

  const current = state();
  const playerId = current?.playerId;
  const people = livingPeople(current).filter(person => person.id !== playerId).slice(0, 4);

  if (!people.length) {
    body.textContent = '尚无可展示的人际关系。';
    return;
  }

  people.forEach((person, index) => {
    const row = document.createElement('div');
    row.className = 'v210-relation-mini-row';
    const moods = ['🙂', '🟢', '😐', '🟡'];
    row.innerHTML =
      '<span class="v210-mini-avatar">👤</span>' +
      '<span class="v210-mini-copy"><strong>' + person.name + '</strong><small>' +
      relationshipLabel(person) + ' · ' + (person.location || '同地') + '</small></span>' +
      '<span class="v210-mini-mood">' + moods[index % moods.length] + '</span>';
    body.append(row);
  });
}

function assetLines(current) {
  const lines = [];
  const land = Number(current?.household?.land ?? current?.resources?.land ?? 0);
  lines.push(['🌿', '田地', land + '亩']);

  const assets = Array.isArray(current?.assets) ? current.assets : [];
  const counts = new Map();
  assets.forEach(asset => {
    const name = asset?.name || asset?.type || '产业';
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  [...counts.entries()].slice(0, 4).forEach(([name, count]) => lines.push(['🏠', name, String(count)]));

  if (lines.length < 4) {
    lines.push(['◉', '现金', Number(current?.resources?.money || 0).toFixed(1)]);
  }
  if (lines.length < 5) {
    lines.push(['🌾', '粮食', Number(current?.resources?.grain || 0).toFixed(1)]);
  }
  return lines.slice(0, 5);
}

function updateAssetsSummary() {
  const card = $('#v210-assets-summary');
  if (!card) return;
  const body = dashboardHeader(
    card,
    '产业一览',
    '进入产业管理',
    () => $('[data-v190-view="assets"]')?.click()
  );

  const current = state();
  if (!current) {
    body.textContent = '等待开局';
    return;
  }

  assetLines(current).forEach(([icon, name, value]) => {
    const row = document.createElement('div');
    row.className = 'v210-asset-mini-row';
    row.innerHTML =
      '<span>' + icon + '</span><strong>' + name + '</strong><b>' + value + '</b>';
    body.append(row);
  });
}

function decorateTaskCard() {
  const slot = $('#v184-goal-slot');
  if (!slot) return;
  const goal = slot.querySelector('.next-goal-panel');
  if (goal) addClass(goal, 'v210-task-inner');
  const heading = slot.querySelector('.next-goal-heading strong');
  if (heading) heading.textContent = '当前任务';
}

function decorateNextMonth() {
  const slot = $('#v184-turn-slot');
  const button = $('#advance-month');
  if (slot) addClass(slot, 'v210-turn-slot');
  if (button) {
    addClass(button, 'v210-next-month');
    if (/度过\d+月|度过本月/.test(textOf(button))) button.textContent = '⏳ 下个月 ›';
  }
}

function showMigrationControls() {
  const destination = $('.destination-label');
  if (!destination) return;
  destination.hidden = currentView() !== 'migration';
}

function decorateAll() {
  applyVersion();
  ensureTopBar();
  const layout = ensureTargetLayout();
  if (!layout) return;
  updateStageHeader();
  updateHelpAndPreview();
  updateFamilySummary();
  updateRelationsSummary();
  updateAssetsSummary();
  decorateTaskCard();
  decorateNextMonth();
  showMigrationControls();

  $$('.business-card').forEach(node => addClass(node, 'v210-business-card'));
  $$('.business-buy, .land-buy, .locked-action').forEach(node => addClass(node, 'v210-deep-button'));
}

function scheduleSync() {
  if (syncQueued) return;
  syncQueued = true;
  window.requestAnimationFrame(() => {
    syncQueued = false;
    decorateAll();
  });
}

function bindEvents() {
  window.addEventListener('luanshi:rendered', scheduleSync);
  window.addEventListener('luanshi:statechange', scheduleSync);

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (
      target.closest('.v190-nav-button') ||
      target.closest('.action-card') ||
      target.closest('.business-buy') ||
      target.closest('.land-buy') ||
      target.closest('#advance-month') ||
      target.closest('.event-option')
    ) {
      window.setTimeout(scheduleSync, 0);
    }
  });
}

function init() {
  decorateAll();
  bindEvents();
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}
