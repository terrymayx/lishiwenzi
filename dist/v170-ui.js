import {
  V170_BUSINESSES,
  V170_STAGE_ORDER,
  getHouseholdUnlockStatus,
  serializeState
} from './engine-v170.js?v=1.7.0';

const STORAGE_KEY = 'luanshi-jia-shu-v3';
const BUSINESS_IDS = Object.keys(V170_BUSINESSES);
const LABEL_TO_ID = new Map(Object.values(V170_BUSINESSES).map(item => [item.label, item.id]));

function state() {
  return window.__luanshiState || null;
}

function saveCurrent(current) {
  if (!current) return;
  try { localStorage.setItem(STORAGE_KEY, serializeState(current)); } catch {}
}

function conditionLine(condition) {
  const row = document.createElement('li');
  row.className = condition.met ? 'unlock-ok' : 'unlock-missing';
  const mark = document.createElement('span');
  mark.className = 'unlock-mark';
  mark.textContent = condition.met ? '✓' : '✕';
  const text = document.createElement('span');
  if (condition.met) {
    text.textContent = `${condition.label}：${condition.current}${condition.unit || ''} / ${condition.required}${condition.unit || ''}`;
  } else if (condition.label.startsWith('已有')) {
    text.textContent = `${condition.label}：尚未满足`;
  } else {
    text.textContent = `${condition.label}：${condition.current}${condition.unit || ''} / ${condition.required}${condition.unit || ''} · 还差${condition.remaining}${condition.unit || ''}`;
  }
  row.append(mark, text);
  return row;
}

function removeOldUnlockDecorations(card) {
  card.querySelectorAll(':scope > .unlock-alert, :scope > .unlock-requirements, :scope > .unlock-reward-line, :scope > .v170-unlock-reward').forEach(node => node.remove());
}

function decorateBusinessCard(card, id, stage) {
  card.dataset.businessId = id;
  removeOldUnlockDecorations(card);
  card.classList.toggle('locked-project', !stage?.unlocked);
  card.classList.toggle('v170-unlocked', Boolean(stage?.unlocked));
  const buy = card.querySelector('.business-buy');
  if (!stage) return;

  if (!stage.unlocked) {
    const alert = document.createElement('div');
    alert.className = 'unlock-alert';
    alert.textContent = '● 未解锁';
    const requirements = document.createElement('ul');
    requirements.className = 'unlock-requirements';
    for (const condition of stage.conditions || []) requirements.append(conditionLine(condition));
    const reward = document.createElement('div');
    reward.className = 'unlock-reward-line v170-unlock-reward';
    reward.textContent = `解锁奖励：+${stage.rewardMoney || 0}钱`;
    card.prepend(reward);
    card.prepend(requirements);
    card.prepend(alert);
    if (buy) buy.disabled = true;
    return;
  }

  const reward = document.createElement('div');
  reward.className = 'unlock-reward-line v170-unlock-reward claimed';
  reward.textContent = stage.rewardMoney ? `解锁奖励 +${stage.rewardMoney}钱 · ${stage.rewardClaimed ? '已到账' : '待结算'}` : '已解锁';
  card.prepend(reward);
}

function identifyCards(section) {
  const cards = [...section.querySelectorAll('.business-card')];
  for (const card of cards) {
    let id = card.dataset.businessId;
    if (!id) {
      const label = card.querySelector('strong')?.textContent?.trim();
      id = LABEL_TO_ID.get(label);
    }
    if (id) card.dataset.businessId = id;
  }
  return cards;
}

function groupFarBusinesses(section, status, cards) {
  section.querySelector(':scope > .far-businesses')?.remove();
  const lockedIds = V170_STAGE_ORDER.filter(id => BUSINESS_IDS.includes(id) && !status[id]?.unlocked);
  const nearLocked = new Set(lockedIds.slice(0, 3));
  const farLocked = new Set(lockedIds.slice(3));
  const grid = section.querySelector(':scope > .business-grid');
  if (!grid) return;

  for (const card of cards) {
    const id = card.dataset.businessId;
    card.hidden = false;
    if (farLocked.has(id)) card.remove();
  }
  if (!farLocked.size) return;

  const details = document.createElement('details');
  details.className = 'far-businesses v170-fold';
  const summary = document.createElement('summary');
  summary.textContent = `远期产业 · ${farLocked.size}项`;
  const farGrid = document.createElement('div');
  farGrid.className = 'business-grid v170-far-grid';
  const byId = new Map(cards.map(card => [card.dataset.businessId, card]));
  for (const id of V170_STAGE_ORDER) {
    if (!farLocked.has(id)) continue;
    const card = byId.get(id);
    if (card) farGrid.append(card);
  }
  details.append(summary, farGrid);
  section.append(details);

  // Explicitly touch the near set so future layout changes keep the intended three-goal rule readable.
  section.dataset.nearLocked = [...nearLocked].join(',');
}

function achievementCard(item) {
  const card = document.createElement('article');
  card.className = `achievement-card ${item.claimed ? 'achievement-complete' : item.met ? 'achievement-ready' : ''}`;
  card.dataset.milestoneId = item.id;
  const title = document.createElement('strong');
  title.textContent = item.label;
  const progress = document.createElement('span');
  progress.className = 'achievement-progress';
  progress.textContent = item.claimed
    ? `已完成 · ${item.current}${item.unit || ''}`
    : `${item.current}${item.unit || ''} / ${item.required}${item.unit || ''}${item.met ? ' · 已达成' : ` · 还差${item.remaining}${item.unit || ''}`}`;
  const reward = document.createElement('small');
  reward.className = 'achievement-reward';
  reward.textContent = `里程碑奖励：+${item.rewardMoney}钱${item.claimed ? ' · 已到账' : ''}`;
  card.append(title, progress, reward);
  return card;
}

function renderAchievements(section, status) {
  section.parentElement?.querySelector(':scope > .household-achievements')?.remove();
  const milestones = Array.isArray(status.milestones) ? status.milestones : [];
  if (!milestones.length) return;

  const wrap = document.createElement('section');
  wrap.className = 'household-achievements';
  const heading = document.createElement('div');
  heading.className = 'business-heading';
  const title = document.createElement('strong');
  title.textContent = '家业目标';
  const subtitle = document.createElement('span');
  subtitle.textContent = `${milestones.filter(item => item.claimed).length}/${milestones.length} 已完成`;
  heading.append(title, subtitle);
  wrap.append(heading);

  const incomplete = milestones.filter(item => !item.claimed);
  const completed = milestones.filter(item => item.claimed);
  const near = incomplete.slice(0, 3);
  const farther = incomplete.slice(3);
  const grid = document.createElement('div');
  grid.className = 'achievement-grid';
  for (const item of near) grid.append(achievementCard(item));
  if (!near.length) {
    const done = document.createElement('p');
    done.className = 'business-hint';
    done.textContent = '当前版本的经营里程碑已经全部完成。';
    grid.append(done);
  }
  wrap.append(grid);

  if (farther.length) {
    const details = document.createElement('details');
    details.className = 'v170-fold achievement-far';
    const summary = document.createElement('summary');
    summary.textContent = `后续目标 · ${farther.length}项`;
    const farGrid = document.createElement('div');
    farGrid.className = 'achievement-grid';
    farther.forEach(item => farGrid.append(achievementCard(item)));
    details.append(summary, farGrid);
    wrap.append(details);
  }

  if (completed.length) {
    const details = document.createElement('details');
    details.className = 'v170-fold achievement-completed-list';
    const summary = document.createElement('summary');
    summary.textContent = `已完成成就 · ${completed.length}项`;
    const doneGrid = document.createElement('div');
    doneGrid.className = 'achievement-grid';
    completed.forEach(item => doneGrid.append(achievementCard(item)));
    details.append(summary, doneGrid);
    wrap.append(details);
  }

  section.after(wrap);
}

function syncV170Ui() {
  const current = state();
  const section = document.querySelector('#business-industry');
  if (!current || !section) return;
  const beforeMoney = Number(current.resources?.money || 0);
  const status = getHouseholdUnlockStatus(current);
  const cards = identifyCards(section);
  for (const card of cards) {
    const id = card.dataset.businessId;
    decorateBusinessCard(card, id, status[id]);
  }
  groupFarBusinesses(section, status, cards);
  renderAchievements(section, status);

  const moneyNode = document.querySelector('#money');
  if (moneyNode && Number(current.resources?.money || 0) !== beforeMoney) moneyNode.textContent = Number(current.resources.money || 0).toFixed(1);
  saveCurrent(current);
}

window.addEventListener('luanshi:rendered', syncV170Ui);
window.addEventListener('DOMContentLoaded', () => window.requestAnimationFrame(syncV170Ui));
