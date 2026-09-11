/* View-only density helper. No engine imports, money mutations or save migration. */
const TREE_DISPLAY_SCALE = 0.8;
const expanded = new Map();
const bound = new WeakSet();
let scheduled = false;

function keepFold(details, key, defaultOpen = false) {
  if (!details || bound.has(details)) return;
  bound.add(details);
  details.dataset.compactFold = key;
  details.open = expanded.has(key) ? expanded.get(key) : defaultOpen;
  // Native 'toggle' is queued. Capture click intent before a synchronous
  // game render can replace this details node and discard that queued event.
  details.querySelector(':scope > summary')?.addEventListener('click', event => {
    if (!event.defaultPrevented) expanded.set(key, !details.open);
  });
  details.addEventListener('toggle', () => {
    if (details.isConnected) expanded.set(key, details.open);
  });
}

function sync() {
  scheduled = false;
  for (const card of document.querySelectorAll('#actions .action-card')) {
    const description = card.querySelector('span')?.textContent || '';
    if (card.title !== description) card.title = description;
    const meta = card.querySelector('small');
    if (meta?.textContent.trim() === '持续行动') meta.dataset.compactRepeat = 'true';
  }
  const tree = document.querySelector('#tree');
  if (tree && !tree.parentElement.classList.contains('compact-family-map')) {
    const viewport = document.createElement('div');
    viewport.className = 'compact-family-map';
    viewport.tabIndex = 0;
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-label', '家族关系图，成员较多时可横向滚动');
    tree.before(viewport);
    viewport.append(tree);
  }
  if (tree) {
    // Resize only the SVG viewport; preserve viewBox, relationship paths and
    // native SVG hit testing. Always derive from attributes, never scaled CSS.
    const width = Number(tree.getAttribute('width'));
    const height = Number(tree.getAttribute('height'));
    if (width > 0 && height > 0) {
      tree.style.width = `${width * TREE_DISPLAY_SCALE}px`;
      tree.style.height = `${height * TREE_DISPLAY_SCALE}px`;
    }
  }
  const budget = document.querySelector('#economy-panel');
  if (budget) {
    const notes = [...budget.querySelectorAll(':scope > p.fine-print')];
    if (notes.length) {
      let fold = budget.querySelector('#compact-budget-notes');
      if (!fold) {
        fold = document.createElement('details');
        fold.id = 'compact-budget-notes';
        fold.className = 'compact-fold';
        const summary = document.createElement('summary');
        summary.textContent = '收支说明';
        fold.append(summary);
        budget.append(fold);
      }
      for (const note of notes) {
        // This is the original work-help text, not a change to the work rules.
        note.textContent = note.textContent.replace('健康≤35', '体力≤35');
        fold.append(note);
      }
      keepFold(fold, 'budget-notes');
    }
    for (const fold of budget.querySelectorAll(':scope > details')) {
      const label = fold.querySelector(':scope > summary')?.textContent?.trim();
      if (label === '粮食市场') keepFold(fold, 'grain-market');
      if (label === '年度实账与预测') keepFold(fold, 'annual-budget');
    }
  }
  document.querySelectorAll('.v170-remote-businesses').forEach(d => keepFold(d, 'remote-businesses'));
  document.querySelectorAll('.v170-milestone-details').forEach(d => keepFold(d, d.classList.contains('completed') ? 'completed-goals' : 'more-goals'));
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(sync);
}

const observer = new MutationObserver(records => {
  // Only react when the existing renderers replace panels, not to every text tick.
  if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1))) schedule();
});
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('luanshi:rendered', schedule);
window.addEventListener('luanshi:statechange', schedule);
window.addEventListener('DOMContentLoaded', schedule);
schedule();
