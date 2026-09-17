import { getEarlyGuideHint } from './engine-v182.js?v=1.8.2';

function state() {
  return window.__luanshiState || null;
}

function ensureGuideCard() {
  let card = document.querySelector('#v182-early-guide');
  if (card) return card;

  card = document.createElement('section');
  card.id = 'v182-early-guide';
  card.setAttribute('aria-live', 'polite');
  card.style.cssText = [
    'display:grid',
    'gap:6px',
    'margin:10px 0 12px',
    'padding:12px 14px',
    'border:1px solid rgba(208,168,92,.45)',
    'border-radius:12px',
    'background:rgba(255,245,218,.08)'
  ].join(';');

  const controls = document.querySelector('#v180-month-controls');
  const flow = document.querySelector('#time-flow');
  if (controls) controls.insertAdjacentElement('afterend', card);
  else if (flow) flow.insertAdjacentElement('afterend', card);
  else document.querySelector('.current-stage')?.prepend(card);
  return card;
}

function renderGuideCard() {
  const current = state();
  const card = ensureGuideCard();
  if (!card) return;
  const hint = current ? getEarlyGuideHint(current) : null;
  card.replaceChildren();

  if (!hint) {
    card.hidden = true;
    return;
  }

  card.hidden = false;
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;gap:12px;align-items:center';
  const title = document.createElement('strong');
  title.textContent = hint.title;
  const badge = document.createElement('span');
  badge.textContent = `新手引导 ${hint.turn}/5`;
  badge.style.cssText = 'font-size:12px;opacity:.78;white-space:nowrap';
  head.append(title, badge);

  const text = document.createElement('p');
  text.textContent = hint.text;
  text.style.cssText = 'margin:0;line-height:1.55';
  const detail = document.createElement('small');
  detail.textContent = hint.detail;
  detail.style.cssText = 'line-height:1.5;opacity:.82';
  const note = document.createElement('small');
  note.textContent = '提示不会打断回合；你仍可自由选择其他行动。';
  note.style.cssText = 'line-height:1.45;opacity:.62';

  card.append(head, text, detail, note);
}

function applyVersionLabel() {
  document.title = '乱世家书 · V1.8.2 前期引导优化';
  document.querySelectorAll('.topbar .eyebrow, #setup .eyebrow').forEach(node => {
    if (/乱世家书|V1\.8\.[012]/.test(node.textContent || '')) {
      node.textContent = node.closest('#setup')
        ? 'V1.8.2 前期引导优化 · 290年1月1日'
        : '乱世家书 · V1.8.2';
    }
  });
}

let scheduled = false;
function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    window.setTimeout(() => {
      scheduled = false;
      applyVersionLabel();
      renderGuideCard();
    }, 0);
  }, 0);
}

if (typeof window !== 'undefined') {
  window.addEventListener('luanshi:rendered', scheduleRender);
  window.addEventListener('luanshi:statechange', scheduleRender);
  window.addEventListener('DOMContentLoaded', scheduleRender);
  scheduleRender();
}
