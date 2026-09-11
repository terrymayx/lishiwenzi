import { getHouseholdUnlockStatus, serializeState } from './engine-v169.js?v=1.6.9';

const $ = selector => document.querySelector(selector);
const storageKey = 'luanshi-jia-shu-v3';
const businessStageByLabel = Object.freeze({ 粮铺: 'grainShop', 布庄: 'clothShop', 商队: 'caravan' });

function saveState(state) {
  try { localStorage.setItem(storageKey, serializeState(state)); }
  catch (_) { /* 主界面负责统一提示存档错误 */ }
}

function notice(message, kind = 'info') {
  const node = $('#notice');
  if (!node) return;
  node.textContent = message;
  node.dataset.kind = kind;
  window.clearTimeout(notice.timer);
  notice.timer = window.setTimeout(() => {
    if (node.textContent === message) node.textContent = '';
  }, 5200);
}

function conditionText(condition) {
  if (condition.label.startsWith('已有')) {
    return condition.met ? `${condition.label} · 已满足` : `${condition.label} · 尚未满足`;
  }
  return `${condition.label}：${condition.current}/${condition.required}${condition.unit}`;
}

function renderConditions(stage) {
  const box = document.createElement('div');
  box.className = 'unlock-conditions';
  for (const condition of stage.conditions) {
    const row = document.createElement('div');
    row.className = `unlock-condition ${condition.met ? 'met' : 'missing'}`;

    const label = document.createElement('span');
    label.textContent = `${condition.met ? '✓' : '✕'} ${conditionText(condition)}`;
    row.append(label);

    if (!condition.met) {
      const remaining = document.createElement('small');
      remaining.className = 'unlock-remaining';
      remaining.textContent = condition.label.startsWith('已有')
        ? '还差：先完成上一阶段产业'
        : `还差 ${condition.remaining}${condition.unit}`;
      row.append(remaining);
    }
    box.append(row);
  }
  return box;
}

function rewardText(stage) {
  return `解锁奖励：+${Number(stage.rewardMoney || 0)}钱 · 自动到账 · 每阶段仅一次`;
}

function createLockedHeader(label) {
  const header = document.createElement('div');
  header.className = 'unlock-project-heading';
  const title = document.createElement('strong');
  title.textContent = label;
  const badge = document.createElement('span');
  badge.className = 'unlock-badge locked';
  badge.textContent = '● 未解锁';
  header.append(title, badge);
  return header;
}

function syncProgressionSummary(assets, status) {
  assets.querySelector('#household-progression-summary')?.remove();
  const summary = document.createElement('section');
  summary.id = 'household-progression-summary';
  summary.className = 'household-progression-summary';

  const title = document.createElement('strong');
  title.textContent = `家业成长 · 当前家产 ${status.assetValue.toFixed(1)}钱`;
  const locked = ['landPurchase', 'grainShop', 'clothShop', 'caravan']
    .map(id => status[id])
    .find(stage => !stage.unlocked);
  const hint = document.createElement('span');
  hint.textContent = locked
    ? `下一目标：${locked.label}。达成条件自动解锁，并获得 +${locked.rewardMoney}钱里程碑奖励。`
    : `当前家业经营项目已全部解锁 · 累计里程碑奖励 ${status.totalRewardMoney || 0}钱。`;
  summary.append(title, hint);

  const heading = assets.querySelector('h3');
  if (heading) heading.insertAdjacentElement('afterend', summary);
  else assets.prepend(summary);
}

function syncLandUnlock(status) {
  const stage = status.landPurchase;
  const purchase = document.querySelector('.land-purchase');
  if (!purchase || stage.unlocked) return;

  purchase.classList.remove('land-purchase');
  purchase.classList.add('locked-land-purchase', 'unlock-project-card', 'locked');
  purchase.replaceChildren();
  purchase.append(createLockedHeader('置办田产'));

  const desc = document.createElement('p');
  desc.className = 'unlock-project-desc';
  desc.textContent = `先让家里积下一笔真正的家底，达到门槛后才会有人愿意向你出售更多田产。解锁后永久开放。${rewardText(stage)}`;
  purchase.append(desc, renderConditions(stage));

  const lockedButton = document.createElement('button');
  lockedButton.type = 'button';
  lockedButton.className = 'locked-action';
  lockedButton.disabled = true;
  lockedButton.textContent = `🔒 家产达到80钱后解锁 · 奖励+${stage.rewardMoney}钱`;
  purchase.append(lockedButton);
}

function syncBusinessUnlocks(status) {
  const section = $('#business-industry');
  if (!section) return;
  for (const card of section.querySelectorAll('.business-card')) {
    const name = card.querySelector('strong')?.textContent?.trim();
    const stageId = businessStageByLabel[name];
    if (!stageId) continue;
    const stage = status[stageId];
    if (stage.unlocked) continue;

    card.classList.add('locked', 'unlock-project-card');
    const existingBadge = card.querySelector('.unlock-badge');
    if (!existingBadge) card.prepend(createLockedHeader(name));
    const originalName = [...card.children].find(child => child.tagName === 'STRONG');
    if (originalName) originalName.hidden = true;

    if (!card.querySelector('.unlock-conditions')) {
      const desc = document.createElement('p');
      desc.className = 'unlock-project-desc';
      desc.textContent = `${stage.storyTitle}：达成全部条件后会永久解锁${stage.label}。${rewardText(stage)}`;
      const button = card.querySelector('.business-buy');
      if (button) card.insertBefore(desc, button);
      else card.append(desc);
      const conditions = renderConditions(stage);
      if (button) card.insertBefore(conditions, button);
      else card.append(conditions);
    }

    const button = card.querySelector('.business-buy');
    if (button) {
      button.disabled = true;
      button.textContent = `🔒 达成条件后解锁 · 奖励+${stage.rewardMoney}钱`;
    }
  }
}

function showNewUnlocks(status) {
  if (!status.newlyUnlocked?.length && !status.newRewardMoney) return;
  const lastId = status.newlyUnlocked?.[status.newlyUnlocked.length - 1] || status.lastReward?.id;
  const stage = status[lastId];
  if (stage) notice(`🎉 家业突破：${stage.label}已解锁 · 奖励 +${stage.rewardMoney}钱`, 'info');

  const assets = $('#assets');
  if (!assets || !stage) return;
  const banner = document.createElement('div');
  banner.className = 'unlock-story-banner';
  const title = document.createElement('strong');
  title.textContent = `🎉 家业突破 · ${stage.storyTitle}`;
  const text = document.createElement('span');
  text.textContent = `${stage.story} 里程碑奖励：+${stage.rewardMoney}钱，已自动到账。`;
  banner.append(title, text);
  const summary = assets.querySelector('#household-progression-summary');
  summary?.insertAdjacentElement('afterend', banner);
}

function syncAssetsUnlockUi() {
  const state = window.__luanshiState;
  const assets = $('#assets');
  if (!state || !assets || !assets.children.length) return;

  const status = getHouseholdUnlockStatus(state);
  syncProgressionSummary(assets, status);
  syncLandUnlock(status);
  syncBusinessUnlocks(status);

  if (status.newlyUnlocked?.length || status.newRewardMoney) {
    saveState(state);
    showNewUnlocks(status);
  }
}

function init() {
  window.addEventListener('luanshi:rendered', syncAssetsUnlockUi);
  window.addEventListener('luanshi:statechange', syncAssetsUnlockUi);
  document.addEventListener('click', event => {
    const tab = event.target.closest('[data-tab="assets"]');
    if (tab) window.setTimeout(syncAssetsUnlockUi, 0);
  });
  syncAssetsUnlockUi();
}

window.addEventListener('DOMContentLoaded', init);
