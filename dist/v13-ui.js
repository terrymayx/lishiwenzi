import {
  V13_RULES,
  getFarmSummary,
  hireFarmWorkers,
  dismissFarmWorkers,
  getGrainBuyPrice,
  getBuyQuote,
  buyGrain,
  sellGrain,
  serializeState
} from './engine-v13.js?v=1.3.1';

const $ = selector => document.querySelector(selector);
const storageKey = 'luanshi-jia-shu-v3';
const round1 = value => Math.round(Number(value || 0) * 10) / 10;

function saveState(state) {
  try { localStorage.setItem(storageKey, serializeState(state)); }
  catch (_) { /* 主界面已有存档失败提示，这里不重复打断 */ }
}

function formatResource(value) {
  const number = round1(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function refreshResourceStrip(state) {
  if (!state) return;
  const values = {
    money: state.resources?.money,
    grain: state.resources?.grain,
    land: state.household?.land ?? state.resources?.land
  };
  for (const [id, value] of Object.entries(values)) {
    const node = $(`#${id}`);
    if (node && value != null) node.textContent = formatResource(value);
  }
}

function notice(message, kind = 'info') {
  const node = $('#notice');
  if (!node) return;
  node.textContent = message;
  node.dataset.kind = kind;
  window.clearTimeout(notice.timer);
  notice.timer = window.setTimeout(() => { if (node.textContent === message) node.textContent = ''; }, 4200);
}

function starvationEnding(state) {
  if (state?.ending?.type !== 'starvation') return;
  const ending = state.ending;
  const currentName = $('#current-name');
  const currentPlace = $('#current-place');
  const statusLine = $('#status-line');
  const flowStatus = $('#flow-status');
  const startButton = $('#start-time');
  const pauseButton = $('#pause-time');
  const eventPanel = $('#event');
  if (currentName) currentName.textContent = `${ending.personName || '当前执笔人'} · 已故`;
  if (currentPlace) currentPlace.textContent = `死因：饥饿 · ${ending.date || ''}`;
  if (statusLine) statusLine.textContent = '游戏结束 · 饥饿达到100%，当前执笔人饿死';
  if (flowStatus) flowStatus.textContent = '饥饿100% · 游戏结束';
  if (startButton) { startButton.disabled = true; startButton.textContent = '游戏已结束'; }
  if (pauseButton) { pauseButton.disabled = true; pauseButton.textContent = '已结束'; }
  if (eventPanel) {
    eventPanel.hidden = false;
    if (eventPanel.dataset.v13Ending !== 'starvation') {
      eventPanel.dataset.v13Ending = 'starvation';
      eventPanel.replaceChildren();
      const title = document.createElement('h2'); title.textContent = '【饥荒终局】当前执笔人饿死';
      const text = document.createElement('p'); text.textContent = `${ending.personName || '当前执笔人'}的饥饿达到100%，家书在${ending.date || '这一日'}中断。`;
      const summary = document.createElement('p'); summary.textContent = `最终田产 ${ending.land ?? 0}亩 · 家中存粮 ${ending.grain ?? 0} · 尚存人口 ${ending.population ?? 0}人`;
      eventPanel.append(title, text, summary);
    }
  }
}

function progressRow(label, value, target) {
  const row = document.createElement('div'); row.className = 'farm-progress-row';
  const name = document.createElement('span'); name.textContent = label;
  const track = document.createElement('span'); track.className = 'farm-progress-track';
  const fill = document.createElement('i'); fill.style.width = `${Math.min(100, target > 0 ? value / target * 100 : 0)}%`; track.append(fill);
  const number = document.createElement('span'); number.textContent = `${value}/${target}日`;
  row.append(name, track, number); return row;
}

function stat(label, value) {
  const cell = document.createElement('div'); cell.className = 'farm-stat';
  const name = document.createElement('span'); name.textContent = label;
  const number = document.createElement('b'); number.textContent = value;
  cell.append(name, number); return cell;
}

function actionButton(label, handler, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = label; button.disabled = disabled;
  button.addEventListener('click', handler);
  return button;
}

function runEconomyAction(state, operation) {
  const result = operation();
  if (result.ok) {
    refreshResourceStrip(state);
    saveState(state);
  }
  renderFarmDashboard(state, true);
  const balance = result.ok ? ` · 当前钱 ${formatResource(state.resources?.money)} / 粮 ${formatResource(state.resources?.grain)}` : '';
  notice(`${result.message}${balance}`, result.ok ? 'info' : 'error');
}

function currentWeather(state, summary) {
  return state.agriculture?.weather?.[`${state.year}-${summary.season}`] || null;
}

function renderFarmDashboard(state, force = false) {
  const assets = $('#assets');
  if (!assets || !state || $('#tab-assets')?.hidden) return;
  const summary = getFarmSummary(state);
  const grainBuyPrice = getGrainBuyPrice(state);
  const signature = [
    state.year, state.month, state.day, state.running, Boolean(state.pendingEvent), state.phase,
    state.resources?.money, state.resources?.grain, state.household?.land,
    summary.familyCapacity, summary.hiredWorkers, summary.springWorkDays,
    summary.summerWorkDays, summary.harvestWorkDays, summary.expectedHarvest,
    summary.grainSellPrice, grainBuyPrice, state.market?.lastTrade?.total
  ].join('|');
  let dashboard = assets.querySelector('.farm-dashboard');
  if (!force && dashboard?.dataset.signature === signature) return;
  if (dashboard) dashboard.remove();

  dashboard = document.createElement('section');
  dashboard.className = 'farm-dashboard';
  dashboard.dataset.signature = signature;
  dashboard.dataset.season = summary.season;

  const title = document.createElement('h4'); title.textContent = '田庄经营 · 农时与粮市';
  const badge = document.createElement('span'); badge.className = 'farm-season-badge'; badge.textContent = `当前农时：${summary.seasonLabel}`;
  dashboard.append(title, badge);

  const stats = document.createElement('div'); stats.className = 'farm-stats';
  stats.append(
    stat('田产', `${summary.land}亩`),
    stat('家庭劳力', `可管${summary.familyCapacity}亩`),
    stat('雇工', `${summary.hiredWorkers}人 · 可管${summary.hiredCapacity}亩`),
    stat('有效经营', `${summary.productiveAcres}/${summary.land}亩`),
    stat('每月工钱', `${summary.monthlyWages}钱`),
    stat('买粮价', `${grainBuyPrice}钱/粮`),
    stat('卖粮价', `${summary.grainSellPrice}钱/粮`)
  );
  dashboard.append(stats);

  if (summary.idleAcres > 0) {
    const warning = document.createElement('p'); warning.className = 'farm-warning';
    warning.textContent = `⚠ 还有${summary.idleAcres}亩缺少劳力。家庭成员与雇工能负责的田地有限，超出的田地不会获得完整收成。`;
    dashboard.append(warning);
  }

  const progress = document.createElement('div'); progress.className = 'farm-progress';
  progress.append(
    progressRow('春耕', summary.springWorkDays, V13_RULES.SPRING_WORK_DAYS),
    progressRow('夏管', summary.summerWorkDays, V13_RULES.SUMMER_WORK_DAYS),
    progressRow('秋收', summary.harvestWorkDays, V13_RULES.HARVEST_WORK_DAYS)
  );
  dashboard.append(progress);

  const weather = currentWeather(state, summary);
  const weatherLine = document.createElement('div'); weatherLine.className = 'farm-weather';
  const weatherName = document.createElement('span'); weatherName.textContent = '本季风候';
  const weatherValue = document.createElement('em'); weatherValue.textContent = weather ? `${weather.label}${weather.severity === 'major' ? ' · 重灾' : weather.severity === 'minor' ? ' · 小灾' : ''}` : '尚未结算';
  weatherLine.append(weatherName, weatherValue); dashboard.append(weatherLine);

  const expectation = document.createElement('p'); expectation.className = 'farm-note';
  expectation.textContent = summary.season === 'winter'
    ? '冬藏：田里不会每天冒出粮食。可以直接在这里买粮、卖余粮、赚钱、买田或安排来年雇工。'
    : `预计秋收参考：约${summary.expectedHarvest}粮。实际收成取决于可经营亩数、春耕、夏管以及天灾。`;
  dashboard.append(expectation);

  const blocked = state.running || state.phase !== 'playing' || Boolean(state.pendingEvent) || state.endpoint;
  const laborActions = document.createElement('div'); laborActions.className = 'farm-actions';
  const laborTitle = document.createElement('strong'); laborTitle.textContent = '雇工 · 每人可负责3亩，每月6钱'; laborActions.append(laborTitle);
  laborActions.append(
    actionButton('雇工 +1 · 6钱', () => runEconomyAction(state, () => hireFarmWorkers(state, 1)), blocked || state.resources.money < 6),
    actionButton('雇工 +3 · 18钱', () => runEconomyAction(state, () => hireFarmWorkers(state, 3)), blocked || state.resources.money < 18),
    actionButton('解雇 1人', () => runEconomyAction(state, () => dismissFarmWorkers(state, 1)), blocked || summary.hiredWorkers < 1)
  );
  dashboard.append(laborActions);

  const buyActions = document.createElement('div'); buyActions.className = 'farm-actions grain-market-buy';
  const buyTitle = document.createElement('strong'); buyTitle.textContent = `购买粮食 · 当前每粮${grainBuyPrice}钱`; buyActions.append(buyTitle);
  for (const amount of [10, 50, 100]) {
    const quote = getBuyQuote(state, amount);
    buyActions.append(actionButton(
      `买${amount}粮 · ${quote.total}钱`,
      () => runEconomyAction(state, () => buyGrain(state, amount)),
      blocked || state.resources.money < quote.total
    ));
  }
  dashboard.append(buyActions);

  const sellActions = document.createElement('div'); sellActions.className = 'farm-actions grain-market-sell';
  const sellTitle = document.createElement('strong'); sellTitle.textContent = `出售余粮 · 当前每粮${summary.grainSellPrice}钱`; sellActions.append(sellTitle);
  for (const amount of [10, 50, 100]) {
    const revenue = round1(amount * summary.grainSellPrice);
    sellActions.append(actionButton(
      `卖${amount}粮 · +${revenue}钱`,
      () => runEconomyAction(state, () => sellGrain(state, amount)),
      blocked || state.resources.grain < amount
    ));
  }
  dashboard.append(sellActions);

  if (state.market?.lastTrade) {
    const trade = state.market.lastTrade;
    const receipt = document.createElement('p'); receipt.className = 'farm-note market-receipt';
    receipt.textContent = trade.type === 'buy'
      ? `最近交易：买入${trade.amount}粮，支出${trade.total}钱。钱粮余额已立即更新。`
      : `最近交易：卖出${trade.amount}粮，收入${trade.total}钱。钱粮余额已立即更新。`;
    dashboard.append(receipt);
  }

  const purchase = assets.querySelector('.land-purchase');
  if (purchase) assets.insertBefore(dashboard, purchase);
  else assets.prepend(dashboard);
}

function updateHungerWarning(state) {
  const node = $('#hunger');
  if (!node || !state) return;
  const current = state.people?.[state.playerId];
  const hunger = Number(current?.hunger || 0);
  node.title = `当前执笔人饥饿 ${Math.round(hunger)}%`;
  if (hunger >= 80) node.textContent = `${state.resources?.hunger?.toFixed?.(1) ?? state.resources?.hunger ?? 0} ⚠`;
}

function refresh() {
  const state = window.__luanshiState;
  if (state) {
    refreshResourceStrip(state);
    starvationEnding(state);
    renderFarmDashboard(state);
    updateHungerWarning(state);
  }
  window.setTimeout(refresh, 180);
}

refresh();
