import { getHealthRiskLabel } from './engine.js?v=1.2.0';

const clamp = value => Math.max(0, Math.min(100, Number(value) || 0));
const fmt = value => Number(clamp(value)).toFixed(1).replace(/\.0$/, '');
let scheduled = false;

function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function state() {
  return window.__luanshiState || null;
}

function currentPerson(s) {
  return s?.playerId ? s.people?.[s.playerId] : null;
}

function updateHeader(s) {
  const person = currentPerson(s);
  setText(document.querySelector('#stamina'), person ? `${Math.round(clamp(person.stamina))}` : '—');
  setText(document.querySelector('#health'), person ? `${Math.round(clamp(person.health))}` : '—');
}

function updateSelectedPerson(s) {
  const panel = document.querySelector('#person-detail');
  if (!panel || !s) return;
  const person = s.people?.[s.selectedPersonId] || currentPerson(s);
  if (!person) return;
  let line = panel.querySelector('#v168-vitals-detail');
  if (!line) {
    line = document.createElement('p');
    line.id = 'v168-vitals-detail';
    line.className = 'person-vitals-detail';
    panel.append(line);
  }
  const health = clamp(person.health);
  setText(line, `体力 ${fmt(person.stamina)} / 100 · 健康 ${fmt(health)} / 100 · ${getHealthRiskLabel(health)}`);
}

function updateTree(s) {
  if (!s) return;
  for (const node of document.querySelectorAll('#tree [data-person]')) {
    const person = s.people?.[node.dataset.person];
    if (!person) continue;
    const stamina = clamp(person.stamina);
    const health = clamp(person.health);
    const value = node.querySelector('.tree-health-value');
    setText(value, `体力 ${fmt(stamina)} · 健康 ${fmt(health)}`);
    const bar = node.querySelector('.tree-health-fill');
    if (bar) {
      const width = 88 * stamina / 100;
      if (bar.getAttribute('width') !== String(width)) bar.setAttribute('width', String(width));
      bar.dataset.health = stamina <= 35 ? 'low' : stamina < 60 ? 'tired' : 'good';
    }
    const oldAria = node.getAttribute('aria-label') || '';
    const suffix = person.id === s.playerId ? '。右键指派工作' : '';
    const nextAria = `${person.name}，${Math.floor(person.age)}岁，体力${fmt(stamina)}，健康${fmt(health)}，${getHealthRiskLabel(health)}${suffix}`;
    if (oldAria !== nextAria) node.setAttribute('aria-label', nextAria);
    const title = node.querySelector('title');
    if (title) {
      const lines = String(title.textContent || '').split('\n').filter(line => !/^健康：|^体力：|^劳动健康变化：|^劳动体力变化：|^死亡风险：/.test(line));
      lines.push(`体力：${fmt(stamina)}`);
      lines.push(`健康：${fmt(health)}`);
      lines.push(`死亡风险：${getHealthRiskLabel(health)}`);
      const next = lines.join('\n');
      if (title.textContent !== next) title.textContent = next;
    }
  }
}

function updateWorkMenu(s) {
  const menu = document.querySelector('#work-context-menu');
  if (!menu || !s?.playerId) return;
  const person = s.people?.[s.playerId];
  if (!person) return;
  const title = menu.querySelector('.work-menu-title');
  setText(title, `${person.name} · 体力 ${fmt(person.stamina)} · 健康 ${fmt(person.health)}`);
}

function refresh() {
  scheduled = false;
  const s = state();
  if (!s) return;
  updateHeader(s);
  updateSelectedPerson(s);
  updateTree(s);
  updateWorkMenu(s);
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(refresh);
}

const observer = new MutationObserver(schedule);
observer.observe(document.body, { childList: true, subtree: true, characterData: true });
window.addEventListener('load', schedule);
document.addEventListener('click', schedule, true);
document.addEventListener('contextmenu', schedule, true);
schedule();
