import { getIndustrySummary, getHouseholdUnlockStatus, getV170MilestoneStatus } from './engine-v170.js?v=1.7.0';

const $ = selector => document.querySelector(selector);
const BUSINESS_ORDER = ['mill', 'grainShop', 'clothShop', 'oilPress', 'caravan', 'winery', 'inn', 'weavingWorkshop', 'paperMill', 'waterFleet'];
const LABEL_TO_ID = Object.freeze({ 磨坊: 'mill', 粮铺: 'grainShop', 布庄: 'clothShop', 油坊: 'oilPress', 商队: 'caravan', 酒坊: 'winery', 客栈: 'inn', 织坊: 'weavingWorkshop', 纸坊: 'paperMill', 水运船队: 'waterFleet' });
let seenRewardLogCount = 0;

function businessIdFromCard(card) {
  const texts = [...card.querySelectorAll('strong')].map(node => node.textContent?.trim()).filter(Boolean);
  return texts.map(text => LABEL_TO_ID[text]).find(Boolean) || null;
}

function group(title, className = '') {
  const section = document.createElement('section');
  section.className = `v170-business-group ${className}`.trim();
  const heading = document.createElement('div');
  heading.className = 'v170-group-heading';
  const strong = document.createElement('strong'); strong.textContent = title;
  heading.append(strong); section.append(heading);
  const grid = document.createElement('div');
  grid.className = 'business-grid v170-group-grid';
  section.append(grid);
  return { section, grid, heading };
}

function reorganizeBusinesses(state, status) {
  const industrySection = $('#business-industry');
  const originalGrid = industrySection?.querySelector(':scope > .business-grid');
  if (!industrySection || !originalGrid) return;
  const summary = getIndustrySummary(state);
  const cards = [...originalGrid.querySelectorAll(':scope > .business-card')];
  if (!cards.length) return;

  const byId = new Map();
  for (const card of cards) {
    const id = businessIdFromCard(card);
    if (id) byId.set(id, card);
  }
  originalGrid.remove();
  industrySection.querySelectorAll(':scope > .v170-business-group, :scope > .v170-remote-businesses').forEach(node => node.remove());

  const owned = group('已有产业', 'owned');
  const near = group('下一批可发展产业', 'near');
  const remote = document.createElement('details');
  remote.className = 'v170-remote-businesses';
  const remoteSummary = document.createElement('summary');
  remoteSummary.textContent = '远期产业 · 展开查看完整条件与奖励';
  const remoteGrid = document.createElement('div');
  remoteGrid.className = 'business-grid v170-group-grid';
  remote.append(remoteSummary, remoteGrid);

  const lockedIds = BUSINESS_ORDER.filter(id => byId.has(id) && !status[id]?.unlocked && Number(summary.businesses[id]?.count || 0) <= 0);
  const nearLocked = new Set(lockedIds.slice(0, 3));

  for (const id of BUSINESS_ORDER) {
    const card = byId.get(id);
    if (!card) continue;
    const count = Number(summary.businesses[id]?.count || 0);
    if (count > 0) owned.grid.append(card);
    else if (status[id]?.unlocked || nearLocked.has(id)) near.grid.append(card);
    else remoteGrid.append(card);
  }

  if (owned.grid.children.length) industrySection.append(owned.section);
  industrySection.append(near.section);
  if (remoteGrid.children.length) industrySection.append(remote);
}

function formatProgress(item) {
  if (item.type === 'industryIncome') return `${item.current.toFixed(1)} / ${item.threshold}${item.unit}`;
  if (item.type === 'assets') return `${item.current.toFixed(1)} / ${item.threshold}${item.unit}`;
  if (item.type === 'harvest') return `${item.current.toFixed(1)} / ${item.threshold}${item.unit}`;
  return `${item.current} / ${item.threshold}${item.unit}`;
}

function milestoneRow(item) {
  const row = document.createElement('article');
  row.className = `v170-milestone-row ${item.completed ? 'completed' : 'pending'}`;
  const top = document.createElement('div');
  top.className = 'v170-milestone-top';
  const title = document.createElement('strong'); title.textContent = `${item.completed ? '✓' : '○'} ${item.label}`;
  const reward = document.createElement('span'); reward.textContent = item.completed ? `奖励 +${item.reward}钱 · 已领取` : `奖励 +${item.reward}钱`;
  top.append(title, reward);
  const progress = document.createElement('small');
  progress.textContent = item.completed ? `已达成 · ${formatProgress(item)}` : `${formatProgress(item)} · 还差 ${item.remaining}${item.unit}`;
  row.append(top, progress);
  return row;
}

function renderMilestones(state) {
  const assets = $('#assets');
  if (!assets) return;
  assets.querySelector('#v170-milestones')?.remove();
  const data = getV170MilestoneStatus(state);
  const section = document.createElement('section');
  section.id = 'v170-milestones';
  section.className = 'v170-milestones';
  const heading = document.createElement('div');
  heading.className = 'v170-milestone-heading';
  const title = document.createElement('strong'); title.textContent = '家业目标与经营成就';
  const summary = document.createElement('span'); summary.textContent = `已完成 ${data.completed.length}/${data.list.length} · 累计奖励 ${data.totalRewardMoney}钱`;
  heading.append(title, summary); section.append(heading);

  const nearTitle = document.createElement('p');
  nearTitle.className = 'v170-milestone-hint';
  nearTitle.textContent = '最近目标：正常经营即可自动完成，达标后奖金直接到账。';
  section.append(nearTitle);
  const near = document.createElement('div'); near.className = 'v170-milestone-list';
  data.incomplete.slice(0, 3).forEach(item => near.append(milestoneRow(item)));
  if (!near.children.length) {
    const done = document.createElement('p'); done.className = 'v170-all-complete'; done.textContent = '当前15个经营成就已经全部完成。'; near.append(done);
  }
  section.append(near);

  const farther = data.incomplete.slice(3);
  if (farther.length) {
    const details = document.createElement('details'); details.className = 'v170-milestone-details';
    const s = document.createElement('summary'); s.textContent = `更多目标 · ${farther.length}项`;
    const list = document.createElement('div'); list.className = 'v170-milestone-list';
    farther.forEach(item => list.append(milestoneRow(item)));
    details.append(s, list); section.append(details);
  }

  if (data.completed.length) {
    const details = document.createElement('details'); details.className = 'v170-milestone-details completed';
    const s = document.createElement('summary'); s.textContent = `已完成成就 · ${data.completed.length}项`;
    const list = document.createElement('div'); list.className = 'v170-milestone-list';
    data.completed.forEach(item => list.append(milestoneRow(item)));
    details.append(s, list); section.append(details);
  }
  $('#business-industry')?.insertAdjacentElement('afterend', section);
}

function showCombinedRewardNotice(state) {
  const rewards = (state.eventLog || []).filter(entry => entry?.kind === 'reward');
  if (seenRewardLogCount === 0) {
    seenRewardLogCount = rewards.length;
    return;
  }
  if (rewards.length <= seenRewardLogCount) return;
  const fresh = rewards.slice(seenRewardLogCount);
  seenRewardLogCount = rewards.length;
  const amounts = fresh.map(entry => Number(entry.text?.match(/\+([0-9.]+)钱/)?.[1] || 0));
  const total = Math.round(amounts.reduce((sum, value) => sum + value, 0) * 100) / 100;
  if (total <= 0) return;
  const names = fresh.map(entry => entry.title?.replace(/^经营成就\s*·\s*/, '') || '家业突破').slice(-3).join('、');
  const node = $('#notice');
  if (!node) return;
  node.textContent = `🎉 家业有成：${names}｜合计奖励 +${total}钱`;
  node.dataset.kind = 'info';
}

function syncV170Ui() {
  const state = window.__luanshiState;
  const assets = $('#assets');
  if (!state || !assets || !assets.children.length) return;
  const status = getHouseholdUnlockStatus(state);
  reorganizeBusinesses(state, status);
  renderMilestones(state);
  showCombinedRewardNotice(state);
}

function init() {
  window.addEventListener('luanshi:rendered', syncV170Ui);
  window.addEventListener('luanshi:statechange', syncV170Ui);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-tab="assets"]')) window.setTimeout(syncV170Ui, 0);
  });
  syncV170Ui();
}

window.addEventListener('DOMContentLoaded', init);
