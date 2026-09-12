import './v180-ui.js?v=1.8.1';

import {
  V170_BUSINESSES,
  getV174GuideStatus,
  getLandPrice,
  getIndustrySummary,
  buyLand,
  buyBusiness,
  serializeState
} from './engine-v180.js?v=1.8.1';

const STORAGE_KEY = 'luanshi-jia-shu-v3';
const ACTION_LABELS = Object.freeze({
  mill: '建造磨坊',
  grainShop: '开设粮铺',
  clothShop: '开设布庄',
  oilPress: '建造油坊',
  caravan: '组建商队',
  winery: '建造酒坊',
  inn: '开设客栈',
  weavingWorkshop: '建造织坊',
  paperMill: '建造纸坊',
  waterFleet: '组建水运船队'
});

function money(value) {
  return Math.max(0, Number(value || 0));
}

function blockedReason(state) {
  if (state?.endpoint) return '本阶段纪事已经结束';
  if (state?.pendingEvent) return '先处理当前事件';
  if (state?.phase !== 'playing') return '当前状态暂时不能置办或建设';
  if (state?.running) return '暂停时间后再进行建设';
  return '';
}

export function getGuideActionModel(state) {
  if (!state) return { visible: false };
  const guide = getV174GuideStatus(state);
  const current = guide?.current;
  if (!current || !current.thresholdReady) return { visible: false, currentId: current?.id || null };

  const cash = money(state.resources?.money);
  const blocked = blockedReason(state);

  if (current.id === 'landPurchase') {
    const price = Number(getLandPrice(state, 1));
    const validPrice = Number.isFinite(price) && price >= 0;
    const short = validPrice ? Math.max(0, price - cash) : 0;
    const disabled = Boolean(blocked) || !validPrice || short > 0;
    let label = validPrice ? `置办1亩 · ${price}钱` : '暂时无法计算田价';
    let note = '点击后会真实购入1亩田地；购买成功才算完成任务、领取奖励并开启下一项。';
    if (blocked) {
      label = blocked.includes('暂停时间') ? '暂停时间后置办' : blocked;
      note = blocked;
    } else if (!validPrice) {
      note = '当前田价无效，暂时不能置办。';
    } else if (short > 0) {
      label = `现钱不足 · 还差${short.toFixed(1)}钱`;
      note = `置办1亩需要${price}钱，当前现金${cash.toFixed(1)}钱。必须备足现金后才能实际购买。`;
    }
    return {
      visible: true,
      currentId: current.id,
      type: 'land',
      price,
      disabled,
      label,
      note
    };
  }

  const businessId = current.businessId || current.id;
  const config = V170_BUSINESSES[businessId];
  const summary = getIndustrySummary(state);
  const owned = summary?.businesses?.[businessId];
  const price = Number(current.price || config?.price || owned?.price || 0);
  const short = Math.max(0, price - cash);
  const atLimit = Boolean(owned?.atLimit);
  const disabled = Boolean(blocked) || atLimit || short > 0;
  const verb = ACTION_LABELS[businessId] || `建造${config?.label || current.label}`;
  let label = `${verb} · ${price}钱`;
  let note = `点击后会真实${verb}；成功后才算完成当前任务、领取奖励并开启下一项。`;

  if (blocked) {
    label = blocked.includes('暂停时间') ? '暂停时间后建设' : blocked;
    note = blocked;
  } else if (atLimit) {
    label = '已达到产业持有上限';
    note = '当前产业已经达到持有上限。';
  } else if (short > 0) {
    label = `现钱不足 · 还差${short.toFixed(1)}钱`;
    note = `建设费用${price}钱，当前现金${cash.toFixed(1)}钱。还需要备足现金才能实际建设。`;
  }

  return {
    visible: true,
    currentId: current.id,
    businessId,
    type: 'business',
    price,
    disabled,
    label,
    note
  };
}

function showNotice(message, kind = 'info') {
  const node = document.querySelector('#notice');
  if (!node) return;
  node.textContent = message || '';
  node.dataset.kind = kind;
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => {
    if (node.textContent === message) node.textContent = '';
  }, 5200);
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeState(state));
    return true;
  } catch (error) {
    showNotice(`本机存档失败：${error.message}`, 'error');
    return false;
  }
}

function performGuideAction(state, model) {
  if (!state || !model?.visible || model.disabled) return;
  const result = model.type === 'land'
    ? buyLand(state, 1)
    : buyBusiness(state, model.businessId);

  showNotice(result?.message || (result?.ok ? '家业操作完成。' : '家业操作失败。'), result?.ok ? 'info' : 'error');
  if (result?.ok) persist(state);
  window.dispatchEvent(new Event('luanshi:statechange'));
}

export function renderGuideAction(state) {
  const panel = document.querySelector('#next-goal-panel');
  if (!panel) return;
  panel.querySelector('.v176-guide-action-box')?.remove();

  const model = getGuideActionModel(state);
  if (!model.visible) return;

  const card = panel.querySelector('.v174-guide-card, .next-goal-card');
  if (!card) return;

  const box = document.createElement('div');
  box.className = 'v176-guide-action-box';
  box.style.display = 'grid';
  box.style.gap = '6px';
  box.style.marginTop = '10px';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'primary v176-guide-action';
  button.setAttribute('data-guide-action', model.currentId);
  button.textContent = model.label;
  button.disabled = model.disabled;
  button.style.width = '100%';
  button.style.minHeight = '38px';
  button.style.fontWeight = '800';
  button.addEventListener('click', () => performGuideAction(state, model));

  const note = document.createElement('small');
  note.className = 'v176-guide-action-note';
  note.textContent = model.note;
  note.style.lineHeight = '1.45';

  box.append(button, note);
  const nextPreview = card.querySelector('.v174-next-preview');
  if (nextPreview) card.insertBefore(box, nextPreview);
  else card.append(box);
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    window.setTimeout(() => {
      scheduled = false;
      renderGuideAction(window.__luanshiState);
    }, 0);
  }, 0);
}

if (typeof window !== 'undefined') {
  window.addEventListener('luanshi:rendered', schedule);
  window.addEventListener('luanshi:statechange', schedule);
  window.addEventListener('DOMContentLoaded', schedule);
  schedule();
}
