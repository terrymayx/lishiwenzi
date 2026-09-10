import { donateForReputation, getMarriageMarketStatus, serializeState } from './engine-v151.js?v=1.5.3';

const $ = selector => document.querySelector(selector);
const storageKey = 'luanshi-jia-shu-v3';

function careLabel(care) {
  return care === 'rest' ? '静养' : care === 'doctor' ? '请医照看' : care === 'normal' ? '照常生活' : '等待决定';
}

function saveState(state) {
  try { localStorage.setItem(storageKey, serializeState(state)); }
  catch (_) { /* 主界面已有存档失败提示 */ }
}

function showDonationNotice(message, kind = 'info') {
  const node = $('#notice');
  if (!node) return;
  node.textContent = message;
  node.dataset.kind = kind;
  window.clearTimeout(showDonationNotice.timer);
  showDonationNotice.timer = window.setTimeout(() => {
    if (node.textContent === message) node.textContent = '';
  }, 4200);
}

function updateDonationControls(state) {
  const panel = $('#reputation-donation');
  if (!panel) return;
  const blocked = !state || state.running || state.phase !== 'playing' || Boolean(state.pendingEvent) || state.endpoint;
  panel.querySelectorAll('[data-donate]').forEach(button => {
    const amount = Number(button.dataset.donate);
    const insufficient = (Number(state?.resources?.money) || 0) < amount;
    button.disabled = blocked || insufficient;
    button.title = blocked
      ? '请先暂停时间并处理完当前事件。'
      : insufficient ? `现钱不足，需要${amount}钱。` : `捐${amount}钱，获得${amount / 1000}声望。`;
  });
}

function onDonationClick(event) {
  const button = event.target.closest('[data-donate]');
  const state = window.__luanshiState;
  if (!button || button.disabled || !state) return;
  const amount = Number(button.dataset.donate);
  const result = donateForReputation(state, amount);
  showDonationNotice(result.message, result.ok ? 'info' : 'error');
  if (!result.ok) {
    updateDonationControls(state);
    return;
  }
  saveState(state);
  window.dispatchEvent(new Event('luanshi:statechange'));
}

function updateEventButtons(state) {
  if (!state?.pendingEvent) return;
  const buttons = [...document.querySelectorAll('#event .event-option')];
  state.pendingEvent.options?.forEach((option, index) => {
    const button = buttons[index];
    if (!button) return;
    button.disabled = Boolean(option.disabled);
    if (option.disabled) button.title = '当前钱粮或人物条件不足，不能选择这一项。';
  });
}

function appendStatusLine(panel, id, text, className = 'family-life-status') {
  if (!text) return;
  const line = document.createElement('p');
  line.id = id;
  line.className = className;
  line.textContent = text;
  panel.append(line);
}

function updatePersonStatus(state) {
  const panel = $('#person-detail');
  if (!panel) return;
  panel.querySelector('#family-life-status')?.remove();
  panel.querySelector('#marriage-market-status')?.remove();
  const selected = state.people?.[state.selectedPersonId] || state.people?.[state.playerId];
  if (!selected) return;
  const life = state.familyLife;
  if (!life) return;

  let text = '';
  if (life.wedding?.targetId === selected.id) {
    text = `婚事筹备中：与${life.wedding.candidate?.name || '婚配对象'}的婚事还需约 ${life.wedding.remainingDays} 日。`;
  } else if (life.pregnancy?.motherId === selected.id) {
    text = `孕期：约 ${life.pregnancy.remainingDays} 日后临盆 · 照护：${careLabel(life.pregnancy.care)}。`;
  } else if (life.pregnancy) {
    const spouse = selected.spouseId ? state.people?.[selected.spouseId] : null;
    if (spouse?.id === life.pregnancy.motherId) {
      text = `配偶${spouse.name}有孕：约 ${life.pregnancy.remainingDays} 日后临盆 · 照护：${careLabel(life.pregnancy.care)}。`;
    }
  }
  appendStatusLine(panel, 'family-life-status', text);

  if (selected.id === state.playerId && selected.alive && !selected.married && selected.age >= 18) {
    const market = getMarriageMarketStatus(state);
    const reputationMet = market.reputation >= market.reputationRequired;
    const assetMet = market.assetValue >= market.assetRequired;
    const base = market.eligible
      ? `说媒资格：已开启 · ${market.label}`
      : '说媒资格：未开启 · 声望与家产必须同时达标';
    const progress = `声望 ${market.reputation}/${market.reputationRequired} ${reputationMet ? '✓' : '✗'} · 家产 ${market.assetValue}/${market.assetRequired} ${assetMet ? '✓' : '✗'}`;
    const missing = [];
    if (!reputationMet) missing.push(`声望还差${Math.max(0, market.reputationRequired - market.reputation).toFixed(1).replace(/\.0$/, '')}`);
    if (!assetMet) missing.push(`家产还差${Math.max(0, market.assetRequired - market.assetValue).toFixed(1).replace(/\.0$/, '')}钱`);
    const gap = missing.length ? ` · ${missing.join('，')}` : '';
    const next = market.nextReputation && market.nextAsset
      ? ` · 下一档需同时达到：声望${market.nextReputation}且家产${market.nextAsset}`
      : '';
    appendStatusLine(panel, 'marriage-market-status', `${base} · ${progress}${gap}${next}。家产=现钱+名下产业估值，不含粮食。`, 'family-life-status marriage-market-status');
  }
}

function updateFamilyLifeUi() {
  const state = window.__luanshiState;
  if (!state || $('#game')?.hidden) return;
  updateDonationControls(state);
  updateEventButtons(state);
  updatePersonStatus(state);
}

$('#reputation-donation')?.addEventListener('click', onDonationClick);
window.addEventListener('luanshi:rendered', updateFamilyLifeUi);
window.addEventListener('DOMContentLoaded', updateFamilyLifeUi);
