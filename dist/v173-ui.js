import {
  V170_BUSINESSES, V173_BUSINESS_LIMITS,
  getHouseholdUnlockStatus, getIndustrySummary, getV170MilestoneStatus
} from './engine-v173.js?v=1.7.3';

const $ = selector => document.querySelector(selector);
const BUSINESS_ORDER = Object.freeze(['mill', 'grainShop', 'clothShop', 'oilPress', 'caravan', 'winery', 'inn', 'weavingWorkshop', 'paperMill', 'waterFleet']);
const STAGE_ORDER = Object.freeze(['landPurchase', ...BUSINESS_ORDER]);
const LABEL_TO_ID = Object.freeze(Object.fromEntries(Object.entries(V170_BUSINESSES).map(([id, item]) => [item.label, id])));

function businessIdFromCard(card) {
  for (const node of card.querySelectorAll('strong')) {
    const text = node.textContent?.trim();
    if (LABEL_TO_ID[text]) return LABEL_TO_ID[text];
  }
  return card.dataset.businessId || null;
}

function stageDistance(stage) {
  const missing = (stage?.conditions || []).filter(item => !item.met);
  if (!missing.length) return 0;
  return missing.reduce((sum, item) => {
    const required = Math.max(1, Number(item.required || 1));
    return sum + Math.min(1, Math.max(0, Number(item.remaining || 0)) / required);
  }, 0) / missing.length;
}

function nearestLocked(status) {
  return STAGE_ORDER
    .map((id, order) => ({ id, order, stage: status?.[id] }))
    .filter(item => item.stage && !item.stage.unlocked)
    .map(item => ({ ...item, distance: stageDistance(item.stage) }))
    .sort((a, b) => a.distance - b.distance || a.order - b.order)[0] || null;
}

function nearestBuildable(status) {
  return BUSINESS_ORDER
    .map((id, order) => ({ id, order, stage: status?.[id] }))
    .find(item => item.stage?.unlocked && item.stage.rewardAvailableOnBuild) || null;
}

function conditionValue(condition) {
  if (condition.label?.startsWith('已有')) return condition.met ? '已满足' : `还差${Math.max(1, Number(condition.remaining || 1))}${condition.unit || ''}`;
  return condition.met ? `${condition.current}/${condition.required}${condition.unit || ''}` : `还差${condition.remaining}${condition.unit || ''}`;
}

function appendConditions(card, stage) {
  const list = document.createElement('div');
  list.className = 'next-goal-condition-list';
  for (const condition of stage?.conditions || []) {
    const row = document.createElement('div');
    row.className = `next-goal-condition ${condition.met ? 'met' : 'missing'}`;
    const label = document.createElement('span');
    label.textContent = `${condition.met ? '✓' : '✕'} ${condition.label}`;
    const value = document.createElement('b');
    value.textContent = conditionValue(condition);
    row.append(label, value);
    list.append(row);
  }
  card.append(list);
}

function patchProgressionCopy(status) {
  const summary = $('#household-progression-summary span');
  if (summary && /达成条件自动解锁/.test(summary.textContent || '')) {
    const next = BUSINESS_ORDER.map(id => status[id]).find(stage => stage && !stage.unlocked);
    if (next) summary.textContent = `下一目标：${next.label}。达成条件后只开放建设资格；首次建成奖励 +${next.rewardMoney || 0}钱。`;
  }

  document.querySelectorAll('.unlock-project-desc').forEach(node => {
    node.textContent = (node.textContent || '')
      .replaceAll('解锁奖励：', '首次建成奖励：')
      .replaceAll('自动到账', '建成后到账')
      .replace('达成全部条件后会永久解锁', '达成全部条件后会开放建设资格：');
  });
  document.querySelectorAll('.locked-action').forEach(button => {
    button.textContent = (button.textContent || '').replace('奖励+', '首次建成奖励+');
  });

  const banner = document.querySelector('.unlock-story-banner');
  if (banner) {
    const text = banner.querySelector('span');
    if (text && /解锁奖励/.test(text.textContent || '')) {
      text.textContent = (text.textContent || '')
        .replace(/解锁奖励：\+(\d+(?:\.\d+)?)钱，已自动到账。?/, '已开放建设资格；首次建成后奖励 +$1钱。');
    }
  }
}

function patchIndustryCards(state, status, summary) {
  const section = $('#business-industry');
  if (!section) return;

  let hint = section.querySelector('.v173-limit-hint');
  if (!hint) {
    hint = document.createElement('p');
    hint.className = 'business-hint v173-limit-hint';
    const heading = section.querySelector('.business-heading');
    heading?.insertAdjacentElement('afterend', hint);
  }
  hint.textContent = '产业上限：除商队最多2支外，其余产业最多1份。旧存档超额产业保留，但超出上限的部分闲置且不再产出。';

  for (const card of section.querySelectorAll('.business-card')) {
    const id = businessIdFromCard(card);
    if (!id || !summary.businesses[id] || !status[id]) continue;
    card.dataset.businessId = id;
    const business = summary.businesses[id];
    const stage = status[id];
    card.classList.toggle('v173-at-limit', Boolean(stage.unlocked && business.atLimit));
    card.classList.toggle('v173-idle-overflow', business.inactiveCount > 0);

    const directOwned = [...card.children].find(node => node.tagName === 'SPAN' && /^拥有\s/.test(node.textContent || ''));
    if (directOwned) {
      directOwned.textContent = `拥有 ${business.count}/${business.limit}${business.inactiveCount > 0 ? ` · 生效${business.effectiveCount} · 闲置${business.inactiveCount}` : ''}`;
    }
    const rate = [...card.children].find(node => node.tagName === 'SMALL' && !node.classList.contains('unlock-earned'));
    if (rate) rate.textContent = `单体 +${business.dailyIncome.toFixed(1)}钱/日 · 当前生效 +${business.totalDailyIncome.toFixed(1)}钱/日`;

    let earned = card.querySelector('.unlock-earned');
    if (stage.unlocked) {
      if (!earned) {
        earned = document.createElement('small');
        earned.className = 'unlock-earned';
        const button = card.querySelector('.business-buy');
        if (button) card.insertBefore(earned, button); else card.append(earned);
      }
      earned.textContent = business.count > 0
        ? `已建成 · 首次建成奖励 +${stage.rewardMoney}钱${stage.rewardClaimed ? '（已领取）' : ''}`
        : `已解锁 · 尚未建设 · 首次建成奖励 +${stage.rewardMoney}钱`;
    }

    const button = card.querySelector('.business-buy');
    if (!button || !stage.unlocked) continue;
    if (business.atLimit) {
      button.disabled = true;
      button.textContent = `已达上限 ${business.count}/${business.limit}`;
      continue;
    }
    const canBuy = !state.running && state.phase === 'playing' && !state.pendingEvent && !state.endpoint && Number(state.resources.money || 0) >= business.price;
    button.disabled = !canBuy;
    button.textContent = business.count === 0
      ? `建设${business.label} · ${business.price}钱`
      : `增建${business.label} · ${business.price}钱（${business.count}/${business.limit}）`;
  }
}

function renderNextGoal(state, status, industry) {
  const panel = $('#next-goal-panel');
  if (!panel) return;
  const buildable = nearestBuildable(status);
  const locked = buildable ? null : nearestLocked(status);
  const milestoneStatus = getV170MilestoneStatus(state);
  const milestone = milestoneStatus?.incomplete?.[0] || null;
  panel.replaceChildren();

  const heading = document.createElement('div');
  heading.className = 'next-goal-heading';
  const title = document.createElement('strong');
  title.textContent = '下一步目标';
  const meta = document.createElement('span');
  meta.textContent = `产业 +${Number(industry.dailyIncome || 0).toFixed(1)}钱/日`;
  heading.append(title, meta);
  panel.append(heading);

  const card = document.createElement('section');
  card.className = 'next-goal-card';
  const cardTitle = document.createElement('h3');
  const desc = document.createElement('p');
  if (buildable) {
    const stage = buildable.stage;
    cardTitle.textContent = `${stage.label} · 可以建设`;
    desc.textContent = '解锁条件已经满足。现在真正建设该产业，才会获得首次建成奖励。';
    card.append(cardTitle, desc);
    appendConditions(card, stage);
    const reward = document.createElement('div');
    reward.className = 'next-goal-reward';
    reward.textContent = `首次建成奖励 +${stage.rewardMoney}钱 · 建成后到账`;
    card.append(reward);
  } else if (locked) {
    const stage = locked.stage;
    cardTitle.textContent = stage.label;
    const isIndustry = BUSINESS_ORDER.includes(locked.id);
    desc.textContent = isIndustry ? '先满足全部条件开放建设资格；达到门槛本身不发产业奖励。' : '满足条件后开放该家业项目。';
    card.append(cardTitle, desc);
    appendConditions(card, stage);
    const reward = document.createElement('div');
    reward.className = 'next-goal-reward';
    reward.textContent = isIndustry
      ? `首次建成奖励 +${stage.rewardMoney}钱`
      : `里程碑奖励 +${stage.rewardMoney || 0}钱 · 达标自动到账`;
    card.append(reward);
  } else {
    cardTitle.textContent = '产业建设目标已完成';
    desc.textContent = '继续扩大田产、学识、声望，并完成尚未达成的经营成就。';
    card.append(cardTitle, desc);
  }
  panel.append(card);

  const industryBox = document.createElement('div');
  industryBox.className = 'next-goal-industry';
  const label = document.createElement('strong');
  label.textContent = '已有产业';
  const owned = Object.values(industry.businesses || {}).filter(item => item.count > 0);
  const text = document.createElement('span');
  text.textContent = owned.length
    ? owned.map(item => `${item.label} ${item.count}/${item.limit}${item.inactiveCount ? `（闲置${item.inactiveCount}）` : ''}`).join(' · ')
    : '尚无商业产业';
  industryBox.append(label, text);
  panel.append(industryBox);

  const milestoneBox = document.createElement('div');
  milestoneBox.className = 'next-goal-mini';
  const milestoneTitle = document.createElement('strong');
  milestoneTitle.textContent = '最近经营成就';
  const milestoneText = document.createElement('span');
  milestoneText.textContent = milestone
    ? `${milestone.label} · 还差${milestone.remaining}${milestone.unit || ''} · 奖励+${milestone.reward}钱`
    : '当前经营里程碑已全部完成';
  milestoneBox.append(milestoneTitle, milestoneText);
  panel.append(milestoneBox);
}

function syncV173() {
  const state = window.__luanshiState;
  if (!state) return;
  const status = getHouseholdUnlockStatus(state);
  const summary = getIndustrySummary(state);
  patchProgressionCopy(status);
  patchIndustryCards(state, status, summary);
  renderNextGoal(state, status, summary);
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    syncV173();
  }, 0);
}

window.addEventListener('luanshi:rendered', schedule);
window.addEventListener('luanshi:statechange', schedule);
document.addEventListener('click', event => {
  if (event.target.closest('[data-tab="assets"]') || event.target.closest('.business-buy')) schedule();
});
window.addEventListener('DOMContentLoaded', schedule);
schedule();
