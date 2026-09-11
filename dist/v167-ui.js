import { getFarmSummary, getLandPurchaseQuote } from './engine-v167.js?v=1.6.7';

function findFarmStat(dashboard, labels) {
  const wanted = Array.isArray(labels) ? labels : [labels];
  return [...dashboard.querySelectorAll('.farm-stat')]
    .find(item => wanted.includes(item.querySelector('span')?.textContent));
}

function setFarmStat(dashboard, labels, newLabel, value) {
  const cell = findFarmStat(dashboard, labels);
  if (!cell) return;
  const label = cell.querySelector('span');
  const number = cell.querySelector('b');
  if (label) label.textContent = newLabel;
  if (number) number.textContent = value;
}

function syncPurchaseHint(state, summary) {
  const purchase = document.querySelector('.land-purchase');
  if (!purchase) return;
  let hint = purchase.querySelector('.mother-farm-purchase-hint');
  if (!hint) {
    hint = document.createElement('p');
    hint.className = 'farm-note mother-farm-purchase-hint';
    purchase.append(hint);
  }

  const quotes = [1, 3, 5].map(amount => {
    const quote = getLandPurchaseQuote(state, amount);
    if (quote.newWorkers > 0) return `买${amount}亩：新增${quote.newWorkers}名农工，首月+${quote.workerWage}钱`;
    if (quote.motherCoversNewLand) return `买${amount}亩：仍由母亲照看，无新增工钱`;
    return `买${amount}亩：现有劳力可覆盖`;
  });

  hint.textContent = summary.motherAvailable
    ? `母亲健在时免费照看前3亩；超过母亲可照看的田地，每3亩自动配置1名农工，每人每月6钱。${quotes.join('；')}。`
    : `母亲已不能务农，全部田地按每3亩自动配置1名农工，每人每月6钱。${quotes.join('；')}。`;
}

function syncMotherFarm() {
  const state = window.__luanshiState;
  const dashboard = document.querySelector('.farm-dashboard');
  if (!state || !dashboard) return;

  const summary = getFarmSummary(state);
  const motherDisplay = summary.motherAvailable
    ? `${summary.motherManagedAcres}/${Math.min(3, summary.land)}亩`
    : '不可用';

  setFarmStat(dashboard, ['自动农工', '母亲照看'], '母亲照看', motherDisplay);
  setFarmStat(dashboard, ['本月到岗', '雇佣农工'], '雇佣农工', `${summary.paidWorkers}/${summary.requiredWorkers}人`);
  setFarmStat(dashboard, ['自动打理', '田地经营'], '田地经营', `${summary.productiveAcres}/${summary.land}亩`);
  setFarmStat(dashboard, ['每月工资', '每月工钱'], '每月工资', `${summary.requiredMonthlyWage}钱`);

  let feedback = dashboard.querySelector('.mother-farm-feedback');
  if (!feedback) {
    feedback = document.createElement('p');
    feedback.className = 'farm-labor-feedback mother-farm-feedback';
    const stats = dashboard.querySelector('.farm-stats');
    if (stats) stats.insertAdjacentElement('afterend', feedback);
    else dashboard.prepend(feedback);
  }

  if (summary.motherAvailable) {
    feedback.textContent = summary.requiredWorkers > 0
      ? `✓ 母亲照看${summary.motherManagedAcres}亩，不领工钱；超过母亲可照看的田地需要${summary.requiredWorkers}名农工，本月到岗${summary.paidWorkers}名。`
      : `✓ 母亲自动照看当前${summary.motherManagedAcres}亩田，不需要雇农工，也不产生工钱。`;
  } else {
    feedback.textContent = `⚠ 母亲已不能务农；当前田产需要${summary.requiredWorkers}名农工，本月到岗${summary.paidWorkers}名。`;
  }
  feedback.classList.toggle('ok', summary.unpaidWorkers <= 0);
  feedback.classList.toggle('limit', summary.unpaidWorkers > 0);

  const oldFeedback = dashboard.querySelector('.auto-worker-feedback');
  if (oldFeedback && oldFeedback !== feedback) oldFeedback.hidden = true;

  syncPurchaseHint(state, summary);
}

function init() {
  window.addEventListener('luanshi:rendered', syncMotherFarm);
  window.addEventListener('luanshi:statechange', syncMotherFarm);
  syncMotherFarm();
  window.setInterval(syncMotherFarm, 180);
}

window.addEventListener('DOMContentLoaded', init);
