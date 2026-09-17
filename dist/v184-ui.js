const VERSION = '1.8.4';

function numberFrom(node) {
  const match = String(node?.textContent || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function applyVersionLabel() {
  if (document.querySelector('meta[name="compatibility-v185"]')) return;
  const titleText = '乱世家书 · V1.8.4 高频操作台';
  if (document.title !== titleText) document.title = titleText;
  document.querySelectorAll('.topbar .eyebrow, #setup .eyebrow').forEach(node => {
    if (!/乱世家书|V1\.8\.[0-4]/.test(node.textContent || '')) return;
    const nextText = node.closest('#setup')
      ? `V${VERSION} 高频操作台 · 290年1月1日`
      : `乱世家书 · V${VERSION}`;
    if (node.textContent !== nextText) node.textContent = nextText;
  });
}

function makeQuickButton(label, className, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `v184-quick-button ${className}`;
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function ensureUtilityMenu() {
  const topbar = document.querySelector('.compact-status .topbar');
  const actions = document.querySelector('.compact-status .top-actions');
  if (!topbar || !actions) return;

  let menu = document.querySelector('#v184-utility-menu');
  if (!menu) {
    menu = document.createElement('details');
    menu.id = 'v184-utility-menu';
    menu.className = 'v184-utility-menu';
    const summary = document.createElement('summary');
    summary.textContent = '⋯ 更多';
    menu.append(summary);
    topbar.append(menu);
  }
  if (actions.parentElement !== menu) menu.append(actions);
}

function openGrainShortcut() {
  const original = document.querySelector('[data-resource-shortcut="grain"]');
  if (!original) return;
  original.click();
  window.requestAnimationFrame(() => {
    document.querySelector('#resource-shortcut-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function openAssets() {
  const original = document.querySelector('[data-tab="assets"]');
  if (!original) return;
  original.click();
  window.requestAnimationFrame(() => {
    document.querySelector('#detail-tabs-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function ensureCommandCenter() {
  const game = document.querySelector('#game');
  const status = document.querySelector('#compact-status');
  if (!game || !status) return null;

  let center = document.querySelector('#v184-command-center');
  if (!center) {
    center = document.createElement('section');
    center.id = 'v184-command-center';
    center.className = 'v184-command-center';
    center.setAttribute('aria-label', '高频操作台');

    const head = document.createElement('header');
    head.className = 'v184-command-head';
    const titleWrap = document.createElement('div');
    const eyebrow = document.createElement('span');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = '高频操作';
    const title = document.createElement('strong');
    title.textContent = '本月操作台';
    titleWrap.append(eyebrow, title);

    const quick = document.createElement('div');
    quick.className = 'v184-quick-actions';
    quick.append(
      makeQuickButton('🌾 补粮', 'v184-grain-shortcut', openGrainShortcut),
      makeQuickButton('🏪 田地 / 产业', 'v184-assets-shortcut', openAssets)
    );
    head.append(titleWrap, quick);

    const grid = document.createElement('div');
    grid.className = 'v184-command-grid';
    const actionSlot = document.createElement('div');
    actionSlot.id = 'v184-action-slot';
    actionSlot.className = 'v184-command-block v184-action-slot';
    const turnSlot = document.createElement('div');
    turnSlot.id = 'v184-turn-slot';
    turnSlot.className = 'v184-command-block v184-turn-slot';
    const goalSlot = document.createElement('div');
    goalSlot.id = 'v184-goal-slot';
    goalSlot.className = 'v184-command-block v184-goal-slot';
    grid.append(actionSlot, turnSlot, goalSlot);
    center.append(head, grid);
    status.insertAdjacentElement('afterend', center);
  }
  return center;
}

function moveFrequentControls() {
  const center = ensureCommandCenter();
  if (!center) return;

  const actions = document.querySelector('#actions');
  const actionSection = actions?.closest('section');
  const actionSlot = center.querySelector('#v184-action-slot');
  if (actionSection && actionSlot && actionSection.parentElement !== actionSlot) actionSlot.append(actionSection);

  const monthControls = document.querySelector('#v180-month-controls');
  const guide = document.querySelector('#v182-early-guide');
  const turnSlot = center.querySelector('#v184-turn-slot');
  if (monthControls && turnSlot && monthControls.parentElement !== turnSlot) turnSlot.append(monthControls);
  if (guide && turnSlot && guide.parentElement !== turnSlot) turnSlot.append(guide);

  const goalPanel = document.querySelector('#next-goal-panel');
  const goalSlot = center.querySelector('#v184-goal-slot');
  if (goalPanel && goalSlot && goalPanel.parentElement !== goalSlot) goalSlot.append(goalPanel);
}

function setAlert(node, active, kind = 'warning') {
  const card = node?.closest('.resource-card');
  if (!card) return;
  if (active) card.dataset.v184Alert = kind;
  else delete card.dataset.v184Alert;
}

function syncRiskEmphasis() {
  const grain = document.querySelector('#grain');
  const foodRate = document.querySelector('#food-rate');
  const stamina = document.querySelector('#stamina');
  const health = document.querySelector('#health');

  const dailyFood = numberFrom(foodRate);
  const grainDays = dailyFood > 0 ? numberFrom(grain) / dailyFood : Infinity;
  setAlert(grain, grainDays < 30, grainDays < 10 ? 'danger' : 'warning');

  const staminaValue = numberFrom(stamina);
  setAlert(stamina, staminaValue <= 35, staminaValue <= 20 ? 'danger' : 'warning');

  const healthValue = numberFrom(health);
  setAlert(health, healthValue <= 50, healthValue <= 25 ? 'danger' : 'warning');
}

function syncHighFrequencyUI() {
  applyVersionLabel();
  ensureUtilityMenu();
  moveFrequentControls();
  syncRiskEmphasis();
}

let scheduled = false;
function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    window.setTimeout(() => {
      scheduled = false;
      syncHighFrequencyUI();
    }, 0);
  }, 0);
}

function observeLateLayers() {
  const game = document.querySelector('#game');
  if (!game || game.dataset.v184Observed === 'true') return;
  game.dataset.v184Observed = 'true';
  const observer = new MutationObserver(scheduleSync);
  observer.observe(game, { childList: true, subtree: true, characterData: true });
}

if (typeof window !== 'undefined') {
  window.addEventListener('luanshi:rendered', scheduleSync);
  window.addEventListener('luanshi:statechange', scheduleSync);
  window.addEventListener('DOMContentLoaded', () => {
    observeLateLayers();
    scheduleSync();
  });
  if (document.readyState !== 'loading') observeLateLayers();
  scheduleSync();
}
