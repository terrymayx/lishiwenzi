import { getHouseholdUnlockStatus, getIndustrySummary, getV170MilestoneStatus } from './engine-v170.js?v=1.7.0';

const $ = selector => document.querySelector(selector);
const STAGE_ORDER = Object.freeze([
  'landPurchase', 'mill', 'grainShop', 'clothShop', 'oilPress', 'caravan',
  'winery', 'inn', 'weavingWorkshop', 'paperMill', 'waterFleet'
]);

function stageDistance(stage) {
  const missing = (stage?.conditions || []).filter(item => !item.met);
  if (!missing.length) return 0;
  return missing.reduce((sum, item) => {
    const required = Math.max(1, Number(item.required || 1));
    const remaining = Math.max(0, Number(item.remaining || 0));
    return sum + Math.min(1, remaining / required);
  }, 0) / missing.length;
}

function milestoneDistance(item) {
  const threshold = Math.max(1, Number(item?.threshold || 1));
  return Math.min(1, Math.max(0, Number(item?.remaining || 0)) / threshold);
}

function nearestLockedStage(status) {
  const guideCurrentId = status?.guideCurrentId;
  if (guideCurrentId && status?.[guideCurrentId]) return status[guideCurrentId];
  return STAGE_ORDER
    .map((id, order) => ({ order, stage: status?.[id] }))
    .filter(entry => entry.stage && !entry.stage.unlocked)
    .map(entry => ({ ...entry, distance: stageDistance(entry.stage) }))
    .sort((a, b) => a.distance - b.distance || a.order - b.order)[0]?.stage || null;
}

function nearestMilestone(state) {
  const status = getV170MilestoneStatus(state);
  return (status?.incomplete || [])
    .map((item, order) => ({ item, order, distance: milestoneDistance(item) }))
    .sort((a, b) => a.distance - b.distance || a.order - b.order)[0]?.item || null;
}

function conditionValue(condition) {
  if (condition.label?.startsWith('已有')) {
    return condition.met ? '已满足' : `还差${Math.max(1, Number(condition.remaining || 1))}${condition.unit || ''}`;
  }
  return condition.met
    ? `${condition.current}/${condition.required}${condition.unit || ''}`
    : `还差${condition.remaining}${condition.unit || ''}`;
}

function makeConditionRow(condition) {
  const row = document.createElement('div');
  row.className = `next-goal-condition ${condition.met ? 'met' : 'missing'}`;
  const label = document.createElement('span');
  label.textContent = `${condition.met ? '✓' : '✕'} ${condition.label}`;
  const value = document.createElement('b');
  value.textContent = conditionValue(condition);
  row.append(label, value);
  return row;
}

function formatMilestone(item) {
  if (!item) return '当前经营里程碑已全部完成';
  return `${item.label} · ${item.current}/${item.threshold}${item.unit || ''} · 还差${item.remaining}${item.unit || ''} · 奖励+${item.reward}钱`;
}

function renderPersonSummary(state) {
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
  activity.textContent = state.currentActivity?.id ? '已有行动计划' : '尚未选择行动';
  host.append(name, place, activity);
}

export function renderNextGoalPanel(state) {
  const panel = $('#next-goal-panel');
  if (!panel || !state) return;

  const household = getHouseholdUnlockStatus(state);
  const industry = getIndustrySummary(state);
  const stage = nearestLockedStage(household);
  const milestone = nearestMilestone(state);
  const strictGuide = Boolean(household?.guideCurrentId);
  panel.replaceChildren();

  const heading = document.createElement('div');
  heading.className = 'next-goal-heading';
  const headingTitle = document.createElement('strong');
  headingTitle.textContent = strictGuide ? '当前任务' : '下一步目标';
  const headingMeta = document.createElement('span');
  headingMeta.textContent = `家产 ${Number(household?.assetValue || 0).toFixed(1)}钱`;
  heading.append(headingTitle, headingMeta);
  panel.append(heading);

  const card = document.createElement('section');
  card.className = 'next-goal-card';
  const title = document.createElement('h3');
  title.textContent = stage?.label || (strictGuide ? '家业主线已全部完成' : '家业项目已全部解锁');
  const description = document.createElement('p');
  if (!stage) {
    description.textContent = '继续扩大经营规模，并完成尚未达成的家业成就。';
  } else if (strictGuide && stage.id === 'landPurchase') {
    description.textContent = stage.unlocked
      ? '置办条件已经满足。请点击“置办”并成功买下至少1亩新田；只有购买成功才算完成，随后才解锁下一项。'
      : '先达到置办新田的家产条件；达到条件后仍需点击“置办”并成功购买，才算完成任务。';
  } else if (strictGuide) {
    description.textContent = stage.unlocked
      ? `${stage.label}的条件已经满足。请实际点击建设并成功建成；只有建成后才算完成，随后才解锁下一项。`
      : `先满足${stage.label}的全部条件；条件达标只代表可以建设，不会自动完成任务。`;
  } else {
    description.textContent = `${stage.storyTitle || stage.label} · 达成全部条件后自动解锁。`;
  }
  card.append(title, description);

  if (stage) {
    const conditions = document.createElement('div');
    conditions.className = 'next-goal-condition-list';
    for (const condition of stage.conditions || []) conditions.append(makeConditionRow(condition));
    card.append(conditions);

    const reward = document.createElement('div');
    reward.className = 'next-goal-reward';
    reward.textContent = strictGuide
      ? `完成奖励 +${Number(stage.rewardMoney || 0)}钱 · ${stage.id === 'landPurchase' ? '置办成功' : '实际建成'}后到账`
      : `解锁奖励 +${Number(stage.rewardMoney || 0)}钱 · 自动到账`;
    card.append(reward);
  }
  panel.append(card);

  const industryBox = document.createElement('div');
  industryBox.className = 'next-goal-industry';
  const incomeLabel = document.createElement('strong');
  incomeLabel.textContent = '产业净收入';
  const income = document.createElement('span');
  income.textContent = `+${Number(industry?.dailyIncome || 0).toFixed(1)}钱/日`;
  const ownedLabel = document.createElement('strong');
  ownedLabel.textContent = '已有产业';
  const ownedBusinesses = Object.values(industry?.businesses || {}).filter(item => Number(item.count || 0) > 0);
  const ownedText = document.createElement('span');
  ownedText.textContent = ownedBusinesses.length
    ? ownedBusinesses.map(item => `${item.label}×${item.count}`).join(' · ')
    : '尚无商业产业';
  industryBox.append(incomeLabel, income, ownedLabel, ownedText);
  panel.append(industryBox);

  const milestoneBox = document.createElement('div');
  milestoneBox.className = 'next-goal-mini';
  const milestoneTitle = document.createElement('strong');
  milestoneTitle.textContent = '最近经营成就';
  const milestoneText = document.createElement('span');
  milestoneText.textContent = formatMilestone(milestone);
  milestoneBox.append(milestoneTitle, milestoneText);
  panel.append(milestoneBox);
}

function syncOverview() {
  const state = window.__luanshiState;
  if (!state) return;
  renderPersonSummary(state);
  renderNextGoalPanel(state);
}

function scheduleSync() {
  window.setTimeout(syncOverview, 0);
}

function init() {
  window.addEventListener('luanshi:rendered', scheduleSync);
  window.addEventListener('luanshi:statechange', scheduleSync);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-tab]') || event.target.closest('[data-action]')) scheduleSync();
  });
  syncOverview();
}

window.addEventListener('DOMContentLoaded', init);
