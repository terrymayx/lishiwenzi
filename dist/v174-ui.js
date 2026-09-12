import {
  V174_GUIDE_CHAIN, V170_BUSINESSES,
  getV174GuideStatus, getHouseholdUnlockStatus, getIndustrySummary
} from './engine-v174.js?v=1.7.4';

const $ = selector => document.querySelector(selector);
const BUSINESS_LABEL_TO_ID = Object.freeze(Object.fromEntries(Object.entries(V170_BUSINESSES).map(([id, item]) => [item.label, id])));

function businessIdFromCard(card) {
  if (card.dataset.businessId) return card.dataset.businessId;
  for (const node of card.querySelectorAll('strong')) {
    const label = node.textContent?.trim();
    if (BUSINESS_LABEL_TO_ID[label]) return BUSINESS_LABEL_TO_ID[label];
  }
  return null;
}

function conditionValue(condition) {
  if (condition.guideGate) return '未完成';
  if (condition.met) return condition.label?.startsWith('已有') ? '已满足' : `${condition.current}/${condition.required}${condition.unit || ''}`;
  if (condition.label?.startsWith('已有')) return `还差${Math.max(1, Number(condition.remaining || 1))}${condition.unit || ''}`;
  return `还差${condition.remaining}${condition.unit || ''}`;
}

function appendConditions(parent, conditions) {
  const list = document.createElement('div');
  list.className = 'v174-condition-list';
  for (const condition of conditions || []) {
    const row = document.createElement('div');
    row.className = `v174-condition ${condition.met ? 'met' : 'missing'}${condition.guideGate ? ' guide-gate' : ''}`;
    const label = document.createElement('span');
    label.textContent = `${condition.met ? '✓' : '✕'} ${condition.label}`;
    const value = document.createElement('b');
    value.textContent = conditionValue(condition);
    row.append(label, value);
    list.append(row);
  }
  parent.append(list);
}

function renderGuidePanel(state) {
  const panel = $('#next-goal-panel');
  if (!panel) return;
  const guide = getV174GuideStatus(state);
  const current = guide.current;
  panel.replaceChildren();
  panel.classList.add('v174-guide-panel');

  const heading = document.createElement('div');
  heading.className = 'next-goal-heading v174-guide-heading';
  const title = document.createElement('strong');
  title.textContent = '家业引导链';
  const meta = document.createElement('span');
  meta.textContent = guide.allCompleted ? '全部完成' : `当前唯一主目标 · ${guide.currentIndex + 1}/${guide.total}`;
  heading.append(title, meta);
  panel.append(heading);

  if (!current) {
    const done = document.createElement('section');
    done.className = 'next-goal-card v174-guide-card completed';
    done.innerHTML = '<h3>家业引导已经完成</h3><p>所有家业主线目标均已完成，后续可以继续经营田产、第二支商队与其他长期生活目标。</p>';
    panel.append(done);
    return;
  }

  const card = document.createElement('section');
  card.className = `next-goal-card v174-guide-card${current.thresholdReady ? ' ready' : ''}`;
  const h3 = document.createElement('h3');
  h3.textContent = current.label;
  const desc = document.createElement('p');
  if (current.id === 'landPurchase') {
    desc.textContent = current.thresholdReady
      ? '置办田产的资格已经满足。真正购买至少1亩新田，才算完成任务。'
      : '先积累足够家产，取得置办田产资格；达到门槛本身不算完成。';
  } else {
    desc.textContent = current.thresholdReady
      ? `${V170_BUSINESSES[current.id]?.label || current.label}已经可以建设。真正建成后才算完成并领取奖励。`
      : '先满足下面全部条件。满足条件只代表可以建设，不会自动完成任务。';
  }
  card.append(h3, desc);
  appendConditions(card, current.conditions);

  if (current.type === 'business') {
    const cost = document.createElement('div');
    cost.className = 'v174-guide-cost';
    cost.textContent = `建设费用 ${current.price}钱 · 建成后 +${current.dailyIncome.toFixed(1)}钱/日`;
    card.append(cost);
  }

  const reward = document.createElement('div');
  reward.className = 'next-goal-reward v174-guide-reward';
  reward.textContent = `完成奖励 +${current.reward}钱 · 只有真正${current.id === 'landPurchase' ? '购买田地' : '建成产业'}后到账`;
  card.append(reward);

  const next = document.createElement('div');
  next.className = 'v174-next-preview';
  next.textContent = guide.next ? `完成后开启下一项：${guide.next.label}` : '完成后：家业引导链毕业';
  card.append(next);
  panel.append(card);

  const progress = document.createElement('div');
  progress.className = 'v174-chain-progress';
  for (const item of guide.list) {
    const chip = document.createElement('span');
    chip.className = item.completed ? 'done' : item.current ? 'current' : 'locked';
    chip.textContent = item.completed ? `✓ ${item.label}` : item.current ? `→ ${item.label}` : `🔒 ${item.label}`;
    progress.append(chip);
  }
  panel.append(progress);
}

function patchIndustryCards(state) {
  const guide = getV174GuideStatus(state);
  const status = getHouseholdUnlockStatus(state);
  const summary = getIndustrySummary(state);
  const currentId = guide.current?.id || null;

  document.querySelectorAll('.business-card').forEach(card => {
    const id = businessIdFromCard(card);
    if (!id || !guide.byId[id]) return;
    card.dataset.businessId = id;
    const stage = guide.byId[id];
    const business = summary.businesses?.[id];
    const button = card.querySelector('.business-buy');
    card.classList.toggle('v174-current-goal', stage.current);
    card.classList.toggle('v174-chain-locked', stage.chainLocked);
    card.classList.toggle('v174-guide-completed', stage.completed);

    let guideLine = card.querySelector('.v174-card-guide-line');
    if (!guideLine) {
      guideLine = document.createElement('small');
      guideLine.className = 'v174-card-guide-line';
      card.insertBefore(guideLine, button || null);
    }

    if (stage.completed) {
      guideLine.textContent = `✓ 家业引导已完成${business?.count ? ` · 持有${business.count}/${business.limit}` : ''}`;
    } else if (stage.current) {
      guideLine.textContent = stage.thresholdReady
        ? `→ 当前主目标 · 现在可以建设 · 完成奖励 +${stage.reward}钱`
        : `→ 当前主目标 · 先满足条件 · 完成奖励 +${stage.reward}钱`;
    } else {
      guideLine.textContent = `🔒 完成「${guide.current?.label || '当前目标'}」后，才会继续开放`;
    }

    if (button && stage.chainLocked) {
      button.disabled = true;
      button.textContent = `完成当前目标后解锁`;
    }
    if (button && stage.current && status[id]?.unlocked && !business?.atLimit) {
      button.textContent = `建设${V170_BUSINESSES[id]?.label || stage.label} · ${stage.price}钱`;
    }
  });

  const section = $('#business-industry');
  if (section) {
    let hint = section.querySelector('.v174-chain-hint');
    if (!hint) {
      hint = document.createElement('p');
      hint.className = 'business-hint v174-chain-hint';
      section.querySelector('.business-heading')?.insertAdjacentElement('afterend', hint);
    }
    hint.textContent = guide.allCompleted
      ? '家业引导链已完成。产业数量上限仍然生效。'
      : `当前只推进一个主目标：${guide.current.label}。后续产业即使数值提前达标，也要等当前目标真正完成后才开放。`;
  }

  document.querySelectorAll('.unlock-project-card, .unlock-project').forEach(card => {
    const text = card.textContent || '';
    const item = V174_GUIDE_CHAIN.find(entry => entry.id !== 'landPurchase' && text.includes(V170_BUSINESSES[entry.id]?.label || ''));
    if (!item) return;
    const stage = guide.byId[item.id];
    card.classList.toggle('v174-chain-locked', stage.chainLocked);
    card.classList.toggle('v174-current-goal', stage.current);
  });

  const summaryText = $('#household-progression-summary span');
  if (summaryText && currentId) summaryText.textContent = `当前唯一主目标：${guide.current.label}。只有真正完成后才发奖励，并开启下一项。`;
}

function syncV174() {
  const state = window.__luanshiState;
  if (!state) return;
  renderGuidePanel(state);
  patchIndustryCards(state);
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    syncV174();
  }, 0);
}

window.addEventListener('luanshi:rendered', schedule);
window.addEventListener('luanshi:statechange', schedule);
document.addEventListener('click', event => {
  if (event.target.closest('[data-tab="assets"]') || event.target.closest('.business-buy') || event.target.closest('[data-buy-land]')) schedule();
});
window.addEventListener('DOMContentLoaded', schedule);
schedule();
