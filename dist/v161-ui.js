import {
  buyGrain,
  getBuyQuote,
  getFarmSummary,
  serializeState
} from './engine-v161.js?v=1.6.1';

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
    const button = quickButton(`买${amount}粮 · ${quote.total}钱`, () => {
      const result = buyGrain(state, amount);
      notice(result.message, result.ok ? 'info' : 'error');
      if (result.ok) {
        saveState(state);
        window.dispatchEvent(new Event('luanshi:statechange'));
      }
      renderResourceShortcut('grain');
    }, blocked(state) || Number(state?.resources?.money || 0) < quote.total);
    actions.append(button);
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

function laborFeedbackText(summary) {
  if (summary.idleAcres <= 0) {
    return `✓ 劳力充足 · 当前雇工 ${summary.hiredWorkers}/${summary.maxHiredWorkers}人 · 还能雇${summary.remainingWorkerSlots}人`;
  }
  if (summary.workerLimitReached) {
    return `⚠ 已达到雇工上限 ${summary.hiredWorkers}/${summary.maxHiredWorkers}人，仍有${summary.idleAcres}亩无法完整经营`;
  }
  const coverable = Math.min(summary.workersNeeded, summary.remainingWorkerSlots);
  const tail = coverable < summary.workersNeeded
    ? `；即使雇满仍有${summary.uncoveredAcresAtLimit}亩缺劳力`
    : '';
  return `⚠ 缺工${summary.idleAcres}亩 · 还需${summary.workersNeeded}名农工 · 当前雇工 ${summary.hiredWorkers}/${summary.maxHiredWorkers}人 · 还能雇${summary.remainingWorkerSlots}人${tail}`;
}

function updateFarmStat(dashboard, label, value) {
  const cell = [...dashboard.querySelectorAll('.farm-stat')]
    .find(item => item.querySelector('span')?.textContent === label);
  const number = cell?.querySelector('b');
  if (number) number.textContent = value;
}

function syncHireButtons(dashboard, state, summary) {
  const laborActions = [...dashboard.querySelectorAll('.farm-actions')]
    .find(group => group.querySelector('strong')?.textContent.includes('雇工'));
  if (!laborActions) return;
  const buttons = [...laborActions.querySelectorAll('button')];
  const plusOne = buttons.find(button => button.textContent.includes('雇工 +1'));
  const plusThree = buttons.find(button => button.textContent.includes('雇工 +3'));
  const isBlocked = blocked(state);
  if (plusOne) plusOne.disabled = isBlocked || summary.remainingWorkerSlots < 1 || Number(state.resources?.money || 0) < 6;
  if (plusThree) plusThree.disabled = isBlocked || summary.remainingWorkerSlots < 3 || Number(state.resources?.money || 0) < 18;
}

function syncFarmLaborFeedback() {
  const state = window.__luanshiState;
  const dashboard = document.querySelector('.farm-dashboard');
  if (!state || !dashboard) return;
  const summary = getFarmSummary(state);

  updateFarmStat(dashboard, '家庭劳力', `可管${summary.familyCapacity}亩`);
  updateFarmStat(dashboard, '雇工', `${summary.hiredWorkers}人 · 可管${summary.hiredCapacity}亩`);
  updateFarmStat(dashboard, '有效经营', `${summary.productiveAcres}/${summary.land}亩`);

  let line = dashboard.querySelector('.farm-labor-feedback');
  if (!line) {
    line = document.createElement('p');
    line.className = 'farm-labor-feedback';
    const stats = dashboard.querySelector('.farm-stats');
    if (stats) stats.insertAdjacentElement('afterend', line);
    else dashboard.prepend(line);
  }
  line.classList.toggle('ok', summary.idleAcres <= 0);
  line.classList.toggle('limit', summary.workerLimitReached);
  line.textContent = laborFeedbackText(summary);

  const laborTitle = [...dashboard.querySelectorAll('.farm-actions > strong')]
    .find(node => node.textContent.includes('雇工'));
  if (laborTitle) {
    laborTitle.textContent = `雇工 ${summary.hiredWorkers}/${summary.maxHiredWorkers}人 · 每人可负责3亩，每月6钱`;
  }
  syncHireButtons(dashboard, state, summary);
}

function refreshCompactUi() {
  syncFarmLaborFeedback();
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
  window.setInterval(syncFarmLaborFeedback, 260);
}

window.addEventListener('DOMContentLoaded', init);
