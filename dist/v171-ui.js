import { getHouseholdUnlockStatus, getIndustrySummary, getV170MilestoneStatus } from './engine-v170.js?v=1.7.0';

const $ = selector => document.querySelector(selector);
const STAGE_ORDER = ['landPurchase','mill','grainShop','clothShop','oilPress','caravan','winery','inn','weavingWorkshop','paperMill','waterFleet'];

function stageDistance(stage) {
  const missing = (stage?.conditions || []).filter(item => !item.met);
  if (!missing.length) return 0;
  return missing.reduce((sum, item) => {
    const need = Math.max(1, Number(item.required || 1));
    return sum + Math.min(1, Math.max(0, Number(item.remaining || 0)) / need);
  }, 0) / missing.length;
}

function milestoneDistance(item) {
  return Math.min(1, Math.max(0, Number(item.remaining || 0)) / Math.max(1, Number(item.threshold || 1)));
}

function nearestLockedStage(status) {
  return STAGE_ORDER
    .map((id, order) => ({ id, order, stage: status?.[id] }))
    .filter(entry => entry.stage && !entry.stage.unlocked)
    .map(entry => ({ ...entry, distance: stageDistance(entry.stage) }))
    .sort((a, b) => a.distance - b.distance || a.order - b.order)[0]?.stage || null;
}

function nearestMilestone(state) {
  const data = getV170MilestoneStatus(state);
  return data.incomplete
    .map((item, order) => ({ item, order, distance: milestoneDistance(item) }))
    .sort((a, b) => a.distance - b.distance || a.order - b.order)[0]?.item || null;
}

function conditionLabel(condition) {
  if (condition.label.startsWith('已有')) {
    return condition.met ? '已满足' : `还差${Math.max(1, Number(condition.remaining || 1))}${condition.unit || ''}`;
  }
  return condition.met
    ? `${condition.current}/${condition.required}${condition.unit || ''}`
    : `还差${condition.remaining}${condition.unit || ''}`;
}

function conditionRow(condition) {
  const row = document.createElement('div');
  row.className = `next-goal-condition ${condition.met ? 'met' : 'missing'}`;
  const label = document.createElement('span');
  label.textContent = `${condition.met ? '✓' : '✕'} ${condition.label}`;
  const value = document.createElement('b');
  value.textContent = conditionLabel(condition);
  row.append(label, value);
  return row;
}

function formatMilestone(item) {
  if (!item) return '当前经营里程碑已全部完成';
  return `${item.label} · ${item.current}/${item.threshold}${item.unit || ''} · 还差${item.remaining}${item.unit || ''} · 奖励+${item.reward}钱`;
}

function renderCurrentPersonSummary(state) {
  const host = $('#compact-person-summary');
  if (!host) return;
  const person = state?.playerId ? state.people?.[state.playerId] : null;
  if (!person) {
    host.textContent = '等待家族接续';
    return;
  }
  host.replaceChildren();
  const name = document.createElement('strong');
  name.textContent = `${person.name} · ${Math.floor(Number(person.age || 0))}岁`;
  const place = document.createElement('span');
  place.textContent = person.location || state.region || '—';
  const activity = document.createElement('span');
  activity.textContent = state.currentActivity?.id ? `当前已有行动计划` : '尚未选择行动';
  host.append(name, place, activity);
}

export function renderNextGoalPanel(state) {
  const panel = $('#next-goal-panel');
  if (!panel || !state) return;
  const status = getHouseholdUnlockStatus(state);
  const industry = getIndustrySummary(state);
  const stage = nearestLockedStage(status);
  const milestone = nearestMilestone(state);
  panel.replaceChildren();

  const heading = document.createElement('div');
  heading.className = 'next-goal-heading';
  const headingTitle = document.createElement('strong');
  headingTitle.textContent = '下一步目标';
  const headingMeta = document.createElement('span');
  headingMeta.textContent = `家产 ${Number(status.assetValue || 0).toFixed(1)}钱`;
  heading.append(headingTitle, headingMeta);
  panel.append(heading);

  const card = document.createElement('section');
  card.className = 'next-goal-card';
  const title = document.createElement('h3');
  title.textContent = stage ? stage.label : '家业项目已全部解锁';
  const desc = document.createElement('p');
  desc.textContent = stage
    ? (stage.storyTitle ? `${stage.storyTitle} · 达成全部条件后自动解锁。` : '达成全部条件后自动解锁。')
    : '目前没有新的产业解锁门槛，继续扩大经营规模并完成家业成就。';
  card.append(title, desc);

  if (stage) {
    const conditions = document.createElement('div');
    conditions.className = 'next-goal-condition-list';
    (stage.conditions || []).forEach(item => conditions.append(conditionRow(item)));
    card.append(conditions);
    const reward = document.createElement('div');
    reward.className = 'next-goal-reward';
    reward.textContent = `解锁奖励 +${Number(stage.rewardMoney || 0)}钱 · 自动到账`;
    card.append(reward);
  }
  panel.append(card);

  const industryBox = document.createElement('div');
  industryBox.className = 'next-goal-industry';
  const incomeLabel = document.createElement('strong'); incomeLabel.textContent = '产业净收入';
  const income = document.createElement('span'); income.textContent = `+${Number(industry.dailyIncome || 0).toFixed(1)}钱/日`;
  const ownedLabel = document.createElement('strong'); ownedLabel.textContent = '已有产业';
  const owned = Object.values(industry.businesses || {}).filter(item => Number(item.count || 0) > 0);
  const ownedText = document.createElement('span');
  ownedText.textContent = owned.length ? owned.map(item => `${item.label}×${item.count}`).join(' · ') : '尚无商业产业';
  industryBox.append(incomeLabel, income, ownedLabel, ownedText);
  panel.append(industryBox);

  const mini = document.createElement('div');
  mini.className = 'next-goal-mini';
  const miniTitle = document.createElement('strong'); miniTitle.textContent = '最近经营成就';
  const miniText = document.createElement('span'); miniText.textContent = formatMilestone(milestone);
  mini.append(miniTitle, miniText);
  panel.append(mini);
}

function syncCompactOverview() {
  const state = window.__luanshiState;
  if (!state) return;
  renderCurrentPersonSummary(state);
  renderNextGoalPanel(state);
}

function init() {
  window.addEventListener('luanshi:rendered', syncCompactOverview);
  window.addEventListener('luanshi:statechange', syncCompactOverview);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-tab]') || event.target.closest('[data-action]')) {
      window.setTimeout(syncCompactOverview, 0);
    }
  });
  syncCompactOverview();
}

window.addEventListener('DOMContentLoaded', init);
