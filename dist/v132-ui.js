const SVG_NS = 'http://www.w3.org/2000/svg';
const nodeSpacing = 94;
const generationSpacing = 56;
let lastTreeSignature = '';

function compactFamilyTree() {
  const state = window.__luanshiState;
  const tree = document.querySelector('#tree');
  if (!state || !tree) return;
  const groups = [...tree.querySelectorAll('.tree-node[data-person]')];
  if (!groups.length) return;

  const ids = groups.map(group => group.dataset.person).filter(Boolean);
  const signature = ids.map(id => `${id}:${state.people?.[id]?.generation ?? 0}`).join('|');
  if (signature === lastTreeSignature && tree.dataset.compactV132 === '1') return;
  lastTreeSignature = signature;

  const levels = new Map();
  for (const id of ids) {
    const person = state.people?.[id];
    if (!person) continue;
    const generation = Number(person.generation || 0);
    const list = levels.get(generation) || [];
    list.push(id);
    levels.set(generation, list);
  }

  const maxGeneration = Math.max(0, ...levels.keys());
  const maxLevelCount = Math.max(1, ...[...levels.values()].map(list => list.length));
  const width = Math.max(360, maxLevelCount * nodeSpacing + 48);
  const height = Math.max(190, 72 + maxGeneration * generationSpacing + 54);
  const positions = new Map();

  for (const [generation, list] of levels) {
    list.forEach((id, index) => {
      positions.set(id, {
        x: ((index + 1) * width) / (list.length + 1),
        y: 36 + generation * generationSpacing
      });
    });
  }

  for (const group of groups) {
    const pos = positions.get(group.dataset.person);
    if (!pos) continue;
    group.setAttribute('transform', `translate(${pos.x} ${pos.y})`);
    const circle = group.querySelector('circle');
    if (circle) circle.setAttribute('r', '16');
    const text = group.querySelector('text');
    if (text) text.setAttribute('y', '28');
    const tspans = text ? [...text.querySelectorAll('tspan')] : [];
    if (tspans[1]) tspans[1].setAttribute('dy', '11');
  }

  const oldLines = tree.querySelector('.tree-lines');
  if (oldLines) oldLines.remove();
  const lines = document.createElementNS(SVG_NS, 'g');
  lines.setAttribute('class', 'tree-lines');
  for (const id of ids) {
    const person = state.people?.[id];
    const from = positions.get(id);
    if (!person || !from) continue;
    for (const parentId of person.parentIds || []) {
      const to = positions.get(parentId);
      if (!to) continue;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y - 14);
      line.setAttribute('x2', to.x);
      line.setAttribute('y2', to.y + 14);
      lines.append(line);
    }
  }
  tree.prepend(lines);
  tree.setAttribute('viewBox', `0 0 ${width} ${height}`);
  tree.setAttribute('width', width);
  tree.setAttribute('height', height);
  tree.dataset.compactV132 = '1';
}

function renderAutoFarmBadge() {
  const state = window.__luanshiState;
  const dashboard = document.querySelector('.farm-dashboard');
  if (!state || !dashboard) return;
  let note = dashboard.querySelector('.auto-farm-note');
  if (!note) {
    note = document.createElement('p');
    note.className = 'auto-farm-note';
    dashboard.append(note);
  }
  const workers = Number(state.agriculture?.hiredWorkers || 0);
  const acres = Math.min(Number(state.household?.land || 0), workers * 3);
  if (!workers) {
    note.textContent = '雇工自动耕作：当前没有雇工。想解放主角的行动槽，可以先在这里雇人。';
    return;
  }
  const season = Number(state.month) >= 3 && Number(state.month) <= 5 ? '春耕'
    : Number(state.month) >= 6 && Number(state.month) <= 8 ? '夏管'
      : Number(state.month) >= 9 && Number(state.month) <= 11 ? '秋收' : '冬藏维护';
  note.textContent = `雇工自动耕作：${workers}人正在独立负责最多${acres}亩 · 当前${season}。主角选择行商、读书、从军等行动时，他们也会继续工作。`;
}

function refreshV132() {
  compactFamilyTree();
  renderAutoFarmBadge();
  window.setTimeout(refreshV132, 180);
}

refreshV132();
