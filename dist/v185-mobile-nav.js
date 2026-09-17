const VERSION = '1.8.5';

const DIRECT_ITEMS = Object.freeze([
  Object.freeze({ id: 'assets', label: '产业', short: '产', tab: 'assets' }),
  Object.freeze({ id: 'relations', label: '关系', short: '关', tab: 'relations' }),
  Object.freeze({ id: 'timeline', label: '历史', short: '史', tab: 'timeline' })
]);

const MENU_ITEMS = Object.freeze([
  Object.freeze({ id: 'family', label: '家族树', icon: '🌳', tab: 'family' }),
  Object.freeze({ id: 'goal', label: '当前任务', icon: '🎯', target: '#next-goal-panel' }),
  Object.freeze({ id: 'utility', label: '更多操作', icon: '⋯', utility: '#v184-utility-menu' })
]);

function applyVersionLabel() {
  const titleText = '乱世家书 · V1.8.5 手机侧边导航';
  if (document.title !== titleText) document.title = titleText;
  document.querySelectorAll('.topbar .eyebrow, #setup .eyebrow').forEach(node => {
    const text = node.textContent || '';
    if (!/乱世家书|V1\.8\.[0-5]/.test(text)) return;
    const next = node.closest('#setup')
      ? `V${VERSION} 手机侧边导航 · 290年1月1日`
      : `乱世家书 · V${VERSION}`;
    if (node.textContent !== next) node.textContent = next;
  });
}

function scrollToTarget(selector, block = 'start') {
  const target = document.querySelector(selector);
  if (!target) return;
  window.requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: 'smooth', block });
  });
}

function clickTab(item) {
  const tabButton = document.querySelector(`[data-tab="${item.tab}"]`);
  if (!tabButton) return false;
  tabButton.click();
  scrollToTarget('#detail-tabs-shell');
  return true;
}

function syncActive(root) {
  const active = document.querySelector('#detail-tabs-shell .tabs [data-tab].active')?.dataset.tab || '';
  root.querySelectorAll('[data-v185-tab]').forEach(button => {
    const selected = button.dataset.v185Tab === active;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function setMenuOpen(root, menu, toggle, open) {
  const next = Boolean(open);
  root.dataset.menuOpen = String(next);
  menu.hidden = !next;
  toggle.classList.toggle('active', next);
  toggle.setAttribute('aria-expanded', String(next));
}

function closeMenu(root, menu, toggle) {
  setMenuOpen(root, menu, toggle, false);
}

function openUtilityMenu() {
  const utility = document.querySelector('#v184-utility-menu');
  if (!utility) return;
  utility.open = true;
  scrollToTarget('#compact-status', 'start');
}

function createDirectButton(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'v185-mobile-nav-button';
  button.dataset.v185Tab = item.tab;
  button.setAttribute('aria-label', `打开${item.label}`);
  button.setAttribute('aria-pressed', 'false');

  const short = document.createElement('strong');
  short.textContent = item.short;
  const label = document.createElement('small');
  label.textContent = item.label;
  button.append(short, label);
  return button;
}

function createMenuItem(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'v185-mobile-menu-item';
  button.dataset.v185MenuTarget = item.id;
  button.textContent = `${item.icon} ${item.label}`;
  return button;
}

function syncVisibility(root, menu, toggle) {
  const game = document.querySelector('#game');
  const visible = Boolean(game && !game.hidden);
  root.hidden = !visible;
  if (!visible) closeMenu(root, menu, toggle);
  if (visible) syncActive(root);
}

function ensureMobileSideNav() {
  if (document.querySelector('#v185-mobile-side-nav')) return;

  const root = document.createElement('nav');
  root.id = 'v185-mobile-side-nav';
  root.className = 'v185-mobile-side-nav';
  root.setAttribute('aria-label', '手机快捷导航');
  root.dataset.menuOpen = 'false';
  root.hidden = true;

  DIRECT_ITEMS.forEach(item => {
    const button = createDirectButton(item);
    button.addEventListener('click', () => {
      if (clickTab(item)) syncActive(root);
      closeMenu(root, menu, toggle);
    });
    root.append(button);
  });

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'v185-mobile-nav-button v185-mobile-menu-toggle';
  toggle.setAttribute('aria-label', '打开菜单');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'v185-mobile-menu');
  toggle.innerHTML = '<strong aria-hidden="true">☰</strong><small>菜单</small>';

  const menu = document.createElement('div');
  menu.id = 'v185-mobile-menu';
  menu.className = 'v185-mobile-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', '更多导航');
  menu.hidden = true;

  MENU_ITEMS.forEach(item => {
    const button = createMenuItem(item);
    button.addEventListener('click', () => {
      if (item.tab) clickTab(item);
      else if (item.target) scrollToTarget(item.target, 'center');
      else if (item.utility) openUtilityMenu();
      closeMenu(root, menu, toggle);
      syncActive(root);
    });
    menu.append(button);
  });

  toggle.addEventListener('click', event => {
    event.stopPropagation();
    setMenuOpen(root, menu, toggle, root.dataset.menuOpen !== 'true');
  });

  root.append(toggle);
  document.body.append(root, menu);

  document.addEventListener('click', event => {
    if (root.dataset.menuOpen !== 'true') return;
    if (root.contains(event.target) || menu.contains(event.target)) return;
    closeMenu(root, menu, toggle);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || root.dataset.menuOpen !== 'true') return;
    closeMenu(root, menu, toggle);
    toggle.focus({ preventScroll: true });
  });

  document.querySelector('#detail-tabs-shell .tabs')?.addEventListener('click', () => {
    window.setTimeout(() => syncActive(root), 0);
  });

  const sync = () => {
    applyVersionLabel();
    syncVisibility(root, menu, toggle);
  };
  window.addEventListener('luanshi:rendered', sync);
  window.addEventListener('luanshi:statechange', sync);
  sync();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureMobileSideNav, { once: true });
} else {
  ensureMobileSideNav();
}
