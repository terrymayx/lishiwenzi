import {
  advanceMonth,
  getMonthTurnStatus,
  serializeState
} from './engine-v180.js?v=1.8.0';

const STORAGE_KEY = 'luanshi-jia-shu-v3';
let settling = false;

function state() {
  return window.__luanshiState || null;
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

function persist(current) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeState(current));
  } catch (error) {
    showNotice(`本机存档失败：${error.message}`, 'error');
  }
}

function signed(value, suffix = '') {
  const number = Number(value || 0);
  const text = Math.abs(number) < 0.005 ? '0' : `${number > 0 ? '+' : ''}${number.toFixed(1)}`;
  return `${text}${suffix}`;
}

function resourceLine(label, item, suffix) {
  const row = document.createElement('div');
  row.className = 'v180-report-row';
  const name = document.createElement('span'); name.textContent = label;
  const change = document.createElement('b'); change.textContent = `${Number(item?.before || 0).toFixed(1)} → ${Number(item?.after || 0).toFixed(1)} (${signed(item?.delta, suffix)})`;
  row.append(name, change);
  return row;
}

function ensureMonthlyUI() {
  const flow = document.querySelector('#time-flow');
  if (!flow) return;

  const legacy = flow.nextElementSibling?.classList?.contains('time-controls')
    ? flow.nextElementSibling
    : document.querySelector('.time-controls');
  if (legacy) {
    legacy.hidden = true;
    legacy.setAttribute('aria-hidden', 'true');
    legacy.classList.add('v180-legacy-time-controls');
  }

  let controls = document.querySelector('#v180-month-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.id = 'v180-month-controls';
    controls.className = 'v180-month-controls';
    const button = document.createElement('button');
    button.id = 'advance-month';
    button.type = 'button';
    button.className = 'primary v180-advance-month';
    button.textContent = '⏳ 度过本月';
    button.addEventListener('click', advanceCurrentMonth);
    const hint = document.createElement('span');
    hint.className = 'v180-month-hint';
    hint.textContent = '一次点击结算一个月；内部仍按天计算吃饭、工作、产业与农业。';
    controls.append(button, hint);
    flow.insertAdjacentElement('afterend', controls);
  }

  let report = document.querySelector('#month-report');
  if (!report) {
    report = document.createElement('section');
    report.id = 'month-report';
    report.className = 'v180-month-report';
    report.hidden = true;
    const chronicle = document.querySelector('.chronicle');
    if (chronicle) chronicle.insertAdjacentElement('beforebegin', report);
    else document.querySelector('.current-stage')?.append(report);
  }
}

function renderReport(report) {
  const panel = document.querySelector('#month-report');
  if (!panel) return;
  panel.replaceChildren();
  if (!report) { panel.hidden = true; return; }
  panel.hidden = false;

  const heading = document.createElement('div'); heading.className = 'v180-report-heading';
  const titleWrap = document.createElement('div');
  const eyebrow = document.createElement('span'); eyebrow.className = 'eyebrow'; eyebrow.textContent = '月度家书';
  const title = document.createElement('h2'); title.textContent = `${report.start.year}年${report.start.month}月 · 月报`;
  titleWrap.append(eyebrow, title);
  const days = document.createElement('span'); days.className = 'stamp'; days.textContent = `推进 ${report.daysAdvanced} 日`;
  heading.append(titleWrap, days); panel.append(heading);

  const grid = document.createElement('div'); grid.className = 'v180-report-grid';
  grid.append(
    resourceLine('钱', report.resources?.money, '钱'),
    resourceLine('粮', report.resources?.grain, '粮'),
    resourceLine('田产', report.resources?.land, '亩'),
    resourceLine('声望', report.resources?.reputation, '')
  );
  panel.append(grid);

  const player = document.createElement('div'); player.className = 'v180-player-report';
  const playerTitle = document.createElement('strong'); playerTitle.textContent = `${report.player?.name || '当前执笔人'} · 本月状态`;
  const playerText = document.createElement('p');
  playerText.textContent = `体力 ${Number(report.player?.stamina?.before || 0).toFixed(0)}→${Number(report.player?.stamina?.after || 0).toFixed(0)} · 健康 ${Number(report.player?.health?.before || 0).toFixed(0)}→${Number(report.player?.health?.after || 0).toFixed(0)} · 饥饿 ${Number(report.player?.hunger?.before || 0).toFixed(0)}→${Number(report.player?.hunger?.after || 0).toFixed(0)} · 学识 ${Number(report.player?.knowledge?.before || 0).toFixed(1)}→${Number(report.player?.knowledge?.after || 0).toFixed(1)}`;
  player.append(playerTitle, playerText); panel.append(player);

  const events = Array.isArray(report.events) ? report.events : [];
  const eventBox = document.createElement('div'); eventBox.className = 'v180-report-events';
  const eventTitle = document.createElement('strong'); eventTitle.textContent = events.length ? `本月纪事 · ${events.length}条` : '本月纪事 · 无大事';
  eventBox.append(eventTitle);
  events.slice(-8).forEach(event => {
    const line = document.createElement('p');
    line.textContent = `${event.month || report.start.month}月${event.day || 1}日 · ${event.title}`;
    eventBox.append(line);
  });
  panel.append(eventBox);
}

function renderMonthlyState() {
  ensureMonthlyUI();
  const current = state();
  if (!current) return;
  const status = getMonthTurnStatus(current);
  const button = document.querySelector('#advance-month');
  const flow = document.querySelector('#time-flow');
  const flowStatus = document.querySelector('#flow-status');
  const statusLine = document.querySelector('#status-line');
  if (!button) return;

  document.title = '乱世家书 · V1.8.0 月度回合制';
  document.querySelectorAll('.topbar .eyebrow, #setup .eyebrow').forEach(node => {
    if (/乱世家书|V1\.7\.6/.test(node.textContent || '')) node.textContent = node.closest('#setup') ? 'V1.8.0 月度回合制 · 290年1月1日' : '乱世家书 · V1.8.0';
  });

  const blockedByDecision = Boolean(current.pendingEvent) || current.phase === 'succession' || current.phase === 'guardian';
  button.disabled = settling || current.endpoint || blockedByDecision || current.phase !== 'playing' || !current.currentActivity;

  if (settling) button.textContent = '⏳ 本月结算中…';
  else if (current.endpoint) button.textContent = '本阶段纪事已结束';
  else if (current.pendingEvent) button.textContent = '先处理当前事件';
  else if (current.phase === 'succession' || current.phase === 'guardian') button.textContent = '先完成家族接续';
  else if (!current.currentActivity) button.textContent = status.active ? '选择行动后继续本月' : '先选择本月行动';
  else if (status.active) button.textContent = '▶ 继续本月';
  else button.textContent = `⏳ 度过${current.month}月`;

  if (flow) {
    flow.classList.toggle('running', settling);
    flow.classList.toggle('paused', !settling && !blockedByDecision);
    flow.classList.toggle('event', blockedByDecision);
  }

  let message = '选择本月行动后，点击“度过本月”';
  if (settling) message = '沙漏翻转 · 正在逐日结算本月';
  else if (current.pendingEvent) message = status.active ? '本月推进中断 · 处理事件后继续本月' : '先处理当前事件，再开始本月';
  else if (current.phase === 'succession' || current.phase === 'guardian') message = '家族接续中 · 本月暂停';
  else if (status.active && !current.currentActivity) message = '本月尚未结束 · 当前计划完成，请重新选择行动';
  else if (status.active) message = `本月尚未结束 · 已推进${status.daysAdvanced}日，可继续本月`;
  else if (status.lastReport) message = `${status.lastReport.start.month}月已结算 · 请安排${current.month}月行动`;

  if (flowStatus) flowStatus.textContent = message;
  if (statusLine) statusLine.textContent = message;
  renderReport(status.lastReport);
}

function advanceCurrentMonth() {
  const current = state();
  if (!current || settling) return;
  const status = getMonthTurnStatus(current);
  if (current.pendingEvent || current.phase !== 'playing' || current.endpoint || !current.currentActivity) {
    renderMonthlyState();
    return;
  }

  settling = true;
  renderMonthlyState();
  window.setTimeout(() => {
    const result = advanceMonth(current);
    settling = false;
    persist(current);
    if (result.completedMonth) {
      showNotice(`${result.report.start.month}月已经结算，共推进${result.report.daysAdvanced}日。`);
    } else if (result.interrupted) {
      const reason = result.reason || '本月推进被事件中断';
      showNotice(`${reason}。处理后可继续本月。`, current.pendingEvent ? 'info' : 'error');
    }
    window.dispatchEvent(new Event('luanshi:statechange'));
    window.setTimeout(() => {
      renderMonthlyState();
      if (current.pendingEvent) document.querySelector('#event')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }, 420);
}

let scheduled = false;
function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    renderMonthlyState();
  }, 0);
}

if (typeof window !== 'undefined') {
  window.addEventListener('luanshi:rendered', scheduleRender);
  window.addEventListener('luanshi:statechange', scheduleRender);
  window.addEventListener('DOMContentLoaded', scheduleRender);
  scheduleRender();
}
