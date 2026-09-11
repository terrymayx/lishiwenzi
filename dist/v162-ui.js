import {
  buyGrain,
  getBuyQuote,
  getFarmSummary,
  getLandPurchaseQuote,
  serializeState
} from './engine-v162.js?v=1.6.2';

const $ = selector => document.querySelector(selector);
const storageKey = 'luanshi-jia-shu-v3';

function saveState(state) {
  try { localStorage.setItem(storageKey, serializeState(state)); }
  catch (_) { /* 主界面会负责提示存档异常 */ }
}

function notice(message, kind = 'info') {
  const node = $('#notice');
  if (!node) return;
  node.textContent = message;
  node.dataset.kind = kind;
  window.clearTimeout(notice.timer);
  notice.timer = window.setTimeout(() => {
    if (node.textContent === message) node.textContent = '';
  }, 4200);
}

function blocked(state) {
  return !state || state.running || state.phase !== 'playing' || Boolean(state.pendingEvent) || state.endpoint;
}

function shortcutPanel() {
  return $('#resource-shortcut-panel');
}

function closeShortcutPanel() {
  const panel = shortcutPanel();
  if (!panel) return;
  panel.hidden = true;
  panel.replaceChildren();
  panel.dataset.resourceShortcut = '';
}

function openAssets(selector = null) {
  const tab = document.querySelector('[data-tab="assets"]');
  tab?.click();
  window.setTimeout(() => {
    const target = selector ? document.querySelector(selector) : $('#tab-assets');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 40);
}

function quickButton(label, handler, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener('click', handler);
  return button;
}

function renderMoneyShortcut(panel, state) {
  const title = document.createElement('strong');
  title.textContent = '增加钱财';
  const hint = document.createElement('span');
  hint.textContent = '选择谋生行动，或直接查看能持续产钱的商业产业。';
  const actions = document.createElement('div');
  actions.className = 'resource-shortcut-actions';
  actions.append(
    quickButton('短工谋生', () => {
      closeShortcutPanel();
      document.querySelector('[data-action="trade"]')?.click();
    }, blocked(state)),
    quickButton('家庭副业', () => {
      closeShortcutPanel();
      document.querySelector('[data-action="manage"]')?.click();
    }, blocked(state)),
    quickButton('查看产业', () => {
      closeShortcutPanel();
      openAssets('#business-industry');
    }),
    quickButton('出售余粮', () => {
      closeShortcutPanel();
      openAssets('.grain-market-sell');
    })
  );
  panel.append(title, hint, actions);
}

function renderGrainShortcut(panel, state) {
  const title = document.createElement('strong');
  title.textContent = '补充粮食';
  const hint = document.createElement('span');
  hint.textContent = '暂停时间且没有待处理事件时，可以直接从这里买粮。';
  const actions = document.createElement('div');
  actions.className = 'resource-shortcut-actions';
  for (const amount of [10, 50, 100]) {
    const quote = getBuyQuote(state, amount);
    actions.append(quickButton(`买${amount}粮 · ${quote.total}钱`, () => {
      const result = buyGrain(state, amount);
      notice(result.message, result.ok ? 'info' : 'error');
      if (result.ok) {
        saveState(state);
        window.dispatchEvent(new Event('luanshi:statechange'));
      }
      renderResourceShortcut('grain');
    }, blocked(state) || Number(state?.resources?.money || 0) < quote.total));
  }
  actions.append(quickButton('打开粮市', () => {
    closeShortcutPanel();
    openAssets('.grain-market-buy');
  }));
  panel.append(title, hint, actions);
}

function renderResourceShortcut(kind) {
  const panel = shortcutPanel();
  const state = window.__luanshiState;
  if (!panel || !state) return;
  if (panel.dataset.resourceShortcut === kind && !panel.hidden) {
    closeShortcutPanel();
    return;
  }
  panel.replaceChildren();
  panel.hidden = false;
  panel.dataset.resourceShortcut = kind;
  if (kind === 'money') renderMoneyShortcut(panel, state);
  else if (kind === 'grain') renderGrainShortcut(panel, state);
}

function openReputationDonation() {
  closeShortcutPanel();
  const details = $('#reputation-donation');
  if (!details) return;
  details.open = true;
  details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function onResourceShortcut(event) {
  const button = event.target.closest('[data-resource-shortcut]');
  if (!button) return;
  const kind = button.dataset.resourceShortcut;
  if (kind === 'reputation') openReputationDonation();
  else renderResourceShortcut(kind);
}

function findFarmStat(dashboard, label) {
  return [...dashboard.querySelectorAll('.farm-stat')]
    .find(item => item.querySelector('span')?.textContent === label);
}

function renameFarmStat(dashboard, oldLabel, newLabel, value) {
  const cell = findFarmStat(dashboard, oldLabel) || findFarmStat(dashboard, newLabel);
  if (!cell) return;
  const label = cell.querySelector('span');
  const number = cell.querySelector('b');
  if (label) label.textContent = newLabel;
  if (number) number.textContent = value;
}

function automaticWorkerText(summary) {
  if (summary.requiredWorkers <= 0) return '暂无田产，不需要农工。购入田地后系统会按每3亩自动配置1名农工。';
  if (summary.unpaidWorkers <= 0) {
    return `✓ 自动农工 ${summary.requiredWorkers}人全部到岗 · 每3亩1人 · 每月工资${summary.requiredMonthlyWage}钱 · 自动打理${summary.autoManagedAcres}/${summary.land}亩`;
  }
  return `⚠ 自动农工需${summary.requiredWorkers}人，本月已付${summary.paidWorkers}人，还有${summary.unpaidWorkers}人暂未上工 · 每月工资应为${summary.requiredMonthlyWage}钱 · 下月自动重新结算`;
}

function syncLandPurchaseHint(state) {
  const purchase = document.querySelector('.land-purchase');
  if (!purchase) return;
  let hint = purchase.querySelector('.auto-worker-purchase-hint');
  if (!hint) {
    hint = document.createElement('p');
    hint.className = 'farm-note auto-worker-purchase-hint';
    purchase.append(hint);
  }
  const quotes = [1, 3, 5].map(amount => {
    const quote = getLandPurchaseQuote(state, amount);
    return quote.newWorkers > 0 ? `买${amount}亩会自动增配${quote.newWorkers}人（首月+${quote.workerWage}钱）` : `买${amount}亩无需新增农工`;
  });
  hint.textContent = `田产自动管家：每3亩配置1名农工，每人每月6钱。${quotes.join('；')}。`;
}

function syncFarmAutoWorkers() {
  const state = window.__luanshiState;
  const dashboard = document.querySelector('.farm-dashboard');
  if (!state) return;
  syncLandPurchaseHint(state);
  if (!dashboard) return;

  const summary = getFarmSummary(state);
  renameFarmStat(dashboard, '家庭劳力', '自动农工', `${summary.requiredWorkers}人`);
  renameFarmStat(dashboard, '雇工', '本月到岗', `${summary.paidWorkers}/${summary.requiredWorkers}人`);
  renameFarmStat(dashboard, '有效经营', '自动打理', `${summary.autoManagedAcres}/${summary.land}亩`);
  renameFarmStat(dashboard, '每月工钱', '每月工资', `${summary.requiredMonthlyWage}钱`);

  const oldWarning = dashboard.querySelector('.farm-warning');
  if (oldWarning) oldWarning.hidden = true;

  let line = dashboard.querySelector('.farm-labor-feedback');
  if (!line) {
    line = document.createElement('p');
    line.className = 'farm-labor-feedback auto-worker-feedback';
    const stats = dashboard.querySelector('.farm-stats');
    if (stats) stats.insertAdjacentElement('afterend', line);
    else dashboard.prepend(line);
  }
  line.classList.toggle('ok', summary.unpaidWorkers <= 0);
  line.classList.toggle('limit', summary.unpaidWorkers > 0);
  line.textContent = automaticWorkerText(summary);

  // 旧版田庄组件仍负责粮市和农时显示，但手动雇工区在本版彻底移除。
  const manualLabor = [...dashboard.querySelectorAll('.farm-actions')]
    .find(group => group.querySelector('strong')?.textContent.includes('雇工'));
  manualLabor?.remove();
}

function refreshCompactUi() {
  syncFarmAutoWorkers();
  const panel = shortcutPanel();
  if (panel && !panel.hidden && panel.dataset.resourceShortcut === 'grain') {
    const kind = panel.dataset.resourceShortcut;
    panel.dataset.resourceShortcut = '';
    renderResourceShortcut(kind);
  }
}

function init() {
  document.querySelector('.resource-strip')?.addEventListener('click', onResourceShortcut);
  document.addEventListener('click', event => {
    const panel = shortcutPanel();
    if (!panel || panel.hidden) return;
    if (panel.contains(event.target) || event.target.closest('[data-resource-shortcut]')) return;
    closeShortcutPanel();
  });
  window.addEventListener('luanshi:rendered', refreshCompactUi);
  window.addEventListener('luanshi:statechange', refreshCompactUi);
  refreshCompactUi();
  window.setInterval(syncFarmAutoWorkers, 240);
}

window.addEventListener('DOMContentLoaded', init);
