const NAV_ITEMS = Object.freeze([
  Object.freeze({ id: 'family', label: '家族树', icon: '🌳', tab: 'family' }),
  Object.freeze({ id: 'relations', label: '关系', icon: '🤝', tab: 'relations' }),
  Object.freeze({ id: 'assets', label: '产业', icon: '🏪', tab: 'assets' }),
  Object.freeze({ id: 'timeline', label: '历史', icon: '📜', tab: 'timeline' }),
  Object.freeze({ id: 'goal', label: '当前任务', icon: '🎯', target: '#next-goal-panel' })
]);

function setOpen(root, toggle, menu, open) {
  const next = Boolean(open);
  root.dataset.navOpen = String(next);
  toggle.setAttribute('aria-expanded', String(next));
  menu.hidden = !next;
  toggle.classList.toggle('open', next);
  if (next) menu.querySelector('button')?.focus({ preventScroll: true });
}

function closeMenu(root, toggle, menu) {
  setOpen(root, toggle, menu, false);
}

function scrollToTarget(selector) {
  const target = document.querySelector(selector);
  if (!target) return;
  window.requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function navigate(item) {
  if (item.tab) {
    const tabButton = document.querySelector(`[data-tab="${item.tab}"]`);
    if (!tabButton) return;
    tabButton.click();
    scrollToTarget('#detail-tabs-shell');
    return;
  }
  if (item.target) scrollToTarget(item.target);
}

function createMenuButton(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'v183-nav-item';
  button.dataset.navTarget = item.id;
  button.setAttribute('role', 'menuitem');

  const icon = document.createElement('span');
  icon.className = 'v183-nav-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = item.icon;

  const label = document.createElement('span');
  label.textContent = item.label;
  button.append(icon, label);
  return button;
}

function syncVisibility(root, toggle, menu) {
  const game = document.querySelector('#game');
  const visible = Boolean(game && !game.hidden);
  root.hidden = !visible;
  if (!visible) closeMenu(root, toggle, menu);
}

function ensureFloatingNav() {
  if (document.querySelector('#v183-floating-nav')) return;

  const root = document.createElement('div');
  root.id = 'v183-floating-nav';
  root.className = 'v183-nav-root';
  root.dataset.navOpen = 'false';
  root.hidden = true;

  const menu = document.createElement('div');
  menu.id = 'v183-nav-menu';
  menu.className = 'v183-nav-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', '快捷导航');
  menu.hidden = true;

  NAV_ITEMS.forEach(item => {
    const button = createMenuButton(item);
    button.addEventListener('click', () => {
      navigate(item);
      closeMenu(root, toggle, menu);
    });
    menu.append(button);
  });

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'v183-nav-ball';
  toggle.setAttribute('aria-label', '打开快捷导航');
  toggle.setAttribute('aria-controls', menu.id);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span aria-hidden="true">☰</span><small>导航</small>';
  toggle.addEventListener('click', event => {
    event.stopPropagation();
    setOpen(root, toggle, menu, root.dataset.navOpen !== 'true');
  });

  root.append(menu, toggle);
  document.body.append(root);

  document.addEventListener('click', event => {
    if (root.dataset.navOpen !== 'true') return;
    if (!root.contains(event.target)) closeMenu(root, toggle, menu);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || root.dataset.navOpen !== 'true') return;
    closeMenu(root, toggle, menu);
    toggle.focus({ preventScroll: true });
  });

  const sync = () => syncVisibility(root, toggle, menu);
  window.addEventListener('luanshi:rendered', sync);
  window.addEventListener('luanshi:statechange', sync);
  sync();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureFloatingNav, { once: true });
} else {
  ensureFloatingNav();
}
