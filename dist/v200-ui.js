const VERSION = '1.10.0';

const ACTION_META = Object.freeze({
  livelihood: { title: '谋生之道', subtitle: '一分耕耘，一分收获。选择合适的谋生方式，为家族积累财富。', seal: '谋生' },
  study: { title: '求学问道', subtitle: '读书明理，积累学识，为仕途与家门声望打下根基。', seal: '求学' },
  farming: { title: '农耕田庄', subtitle: '经营田产，安排农事，把一家人的生计牢牢握在手里。', seal: '农耕' },
  military: { title: '军旅建功', subtitle: '乱世从军，习武立功；机遇与风险始终相伴。', seal: '军旅' },
  household: { title: '家门内务', subtitle: '婚育、家事与传承，是一个家族在乱世延续的根本。', seal: '家事' },
  rest: { title: '休养生息', subtitle: '暂缓奔波，恢复体力与健康，为下一段路积蓄力量。', seal: '休养' },
  migration: { title: '迁徙远行', subtitle: '审时度势，迁居他地，为家门寻找新的生路。', seal: '迁徙' },
  assets: { title: '产业经营', subtitle: '经营田地与各类产业，积累家底，让家业由薄转厚。', seal: '产业' },
  relations: { title: '人际往来', subtitle: '查看亲疏、往来与态度变化，经营乱世中的人情网络。', seal: '关系' },
  family: { title: '家族传承', subtitle: '查看血缘、婚姻、后代与接续，让家书代代相传。', seal: '家族' },
  timeline: { title: '乱世纪年', subtitle: '回顾已经发生与即将到来的时代大事。', seal: '历史' }
});

let syncQueued = false;

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function textOf(node) {
  return String(node?.textContent || '').trim();
}

function setClass(node, className) {
  if (node && !node.classList.contains(className)) node.classList.add(className);
}

function applyVersion() {
  document.title = '乱世家书 · V1.10.0 全局古风重构版';
  $$('.topbar .eyebrow, #setup .eyebrow').forEach(node => {
    const text = textOf(node);
    if (!/乱世家书|V1\.(?:8|9|10)\./.test(text)) return;
    node.textContent = node.closest('#setup')
      ? 'V1.10.0 全局古风重构版 · 290年1月1日'
      : '乱世家书 · V1.10.0';
  });
}

function decorateRoot() {
  document.body.classList.add('v200-global-ancient-ui');
  setClass($('.compact-status'), 'v200-top-status');
  setClass($('#v184-command-center'), 'v200-main-shell');
  setClass($('.v184-command-grid'), 'v200-main-grid');
  setClass($('#v190-command-nav'), 'v200-left-nav');
  setClass($('#v184-action-slot'), 'v200-center-stage');
  setClass($('#v184-goal-slot'), 'v200-right-rail');
  setClass($('#v184-turn-slot'), 'v200-next-month-panel');
}

function decorateTopResources() {
  const iconMap = {
    '钱': '◉',
    '粮': '🌾',
    '每日口粮': '🍚',
    '田产': '▧',
    '声望': '♜',
    '体力': '💪',
    '健康': '♥'
  };
  $$('.resource-card').forEach(card => {
    setClass(card, 'v200-resource-card');
    const label = card.querySelector('.resource-label span');
    if (!label) return;
    const name = textOf(label);
    card.dataset.v200Resource = name;
    if (!label.dataset.v200Icon) label.dataset.v200Icon = iconMap[name] || '•';
  });
}

function decorateNav() {
  const nav = $('#v190-command-nav');
  if (!nav) return;
  const title = nav.querySelector('.v190-nav-title strong');
  const subtitle = nav.querySelector('.v190-nav-title small');
  if (title) title.textContent = '本月操作台';
  if (subtitle) subtitle.textContent = '选择一项，向右展开';

  $$('.v190-nav-button', nav).forEach(button => {
    setClass(button, 'v200-nav-btn');
  });
}

function currentViewId() {
  return $('.v190-nav-button.active')?.dataset.v190View
    || $('[data-v190-view][aria-pressed="true"]')?.dataset.v190View
    || 'livelihood';
}

function decorateStageHeader() {
  const header = $('#v190-detail-header');
  if (!header) return;
  setClass(header, 'v200-stage-header');

  let seal = header.querySelector('.v200-stage-seal');
  if (!seal) {
    seal = document.createElement('span');
    seal.className = 'v200-stage-seal';
    seal.setAttribute('aria-hidden', 'true');
    header.append(seal);
  }

  const view = currentViewId();
  const meta = ACTION_META[view] || ACTION_META.livelihood;
  const h2 = header.querySelector('h2');
  const p = header.querySelector('p');
  if (h2) h2.textContent = meta.title;
  if (p) p.textContent = meta.subtitle;
  seal.textContent = meta.seal;

  const slot = $('#v184-action-slot');
  if (slot) slot.dataset.v200View = view;
}

function decorateActions() {
  const actions = $('#actions');
  if (actions) setClass(actions, 'v200-actions-panel');
  $$('.action-card').forEach(card => setClass(card, 'v200-action-card'));
}

function decorateGoal() {
  const goal = $('#v184-goal-slot');
  if (!goal) return;
  setClass(goal, 'v200-task-board');

  const heading = goal.querySelector('.next-goal-heading');
  if (heading) setClass(heading, 'v200-section-plaque');

  const goalCard = goal.querySelector('.v174-guide-card, .next-goal-card, article, .guide-card');
  if (goalCard) setClass(goalCard, 'v200-goal-card');
}

function decorateNextMonth() {
  const button = $('#advance-month');
  if (!button) return;
  setClass(button, 'v200-next-month-button');

  const normalText = textOf(button);
  if (/度过\d+月|度过本月/.test(normalText)) button.textContent = '⏳ 下个月';

  const hint = $('.v180-month-hint');
  if (hint && /一次点击|执行当前月|重大历史/.test(textOf(hint))) {
    hint.textContent = '执行本月计划并进入下个月；重大事件会在月中自动暂停。';
  }
}

function decorateEmbeddedPanels() {
  const tabArea = $('#v190-tab-area');
  if (tabArea) setClass(tabArea, 'v200-tab-area');

  const family = $('#tab-family');
  const relations = $('#tab-relations');
  const assets = $('#tab-assets');
  const timeline = $('#tab-timeline');

  setClass(family, 'v200-family-board');
  setClass(relations, 'v200-relations-board');
  setClass(assets, 'v200-assets-board');
  setClass(timeline, 'v200-timeline-board');

  $$('.business-card').forEach(node => setClass(node, 'v200-business-card'));
  $$('.business-buy, .land-buy, .locked-action').forEach(node => setClass(node, 'v200-gold-button'));
  $$('.timeline-row').forEach(node => setClass(node, 'v200-timeline-row'));
}

function decorateUtility() {
  const utility = $('#v184-utility-menu');
  if (utility) setClass(utility, 'v200-utility-menu');
  const notice = $('#notice');
  if (notice) setClass(notice, 'v200-notice');
}

function syncAll() {
  applyVersion();
  decorateRoot();
  decorateTopResources();
  decorateNav();
  decorateStageHeader();
  decorateActions();
  decorateGoal();
  decorateNextMonth();
  decorateEmbeddedPanels();
  decorateUtility();
}

function scheduleSync() {
  if (syncQueued) return;
  syncQueued = true;
  window.requestAnimationFrame(() => {
    syncQueued = false;
    syncAll();
  });
}

function bindStableEvents() {
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
      target.closest('[data-tab]') ||
      target.closest('#advance-month')
    ) {
      window.setTimeout(scheduleSync, 0);
    }
  });
}

function init() {
  syncAll();
  bindStableEvents();
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}
